-- ============================================
-- QR ATTENDANCE APP - PHASE 3 DATABASE
-- ============================================

-- ============================================
-- 1. PROFILES TABLE
-- ============================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student'
    check (role in ('student', 'teacher')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;


-- ============================================
-- 2. EVENTS TABLE
-- ============================================

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  title text not null,
  start timestamptz not null,
  "end" timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;


-- ============================================
-- 3. ATTENDANCE TABLE
-- ============================================

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  event_id uuid not null
    references public.events(id)
    on delete cascade,

  scanned_at timestamptz not null default now(),

  unique(student_id, event_id)
);

alter table public.attendance enable row level security;


-- ============================================
-- 4. PROFILES POLICIES
-- ============================================

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);


-- ============================================
-- 5. EVENTS POLICIES
-- ============================================

create policy "Authenticated users can view events"
on public.events
for select
to authenticated
using (true);

create policy "Authenticated users can create events"
on public.events
for insert
to authenticated
with check (auth.uid() = created_by);

create policy "Creators can update own events"
on public.events
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);


-- ============================================
-- 6. ATTENDANCE POLICIES
-- ============================================

create policy "Students can view own attendance"
on public.attendance
for select
to authenticated
using (auth.uid() = student_id);

create policy "Students can insert own attendance"
on public.attendance
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Teachers can view attendance for own events"
on public.attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = attendance.event_id
      and e.created_by = auth.uid()
  )
);


-- ============================================
-- 7. TEACHERS CAN VIEW ATTENDEE PROFILES
-- ============================================

create policy "Teachers can view attendee profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.attendance a
    join public.events e on e.id = a.event_id
    where a.student_id = profiles.id
      and e.created_by = auth.uid()
  )
);


-- ============================================
-- 8. AUTO-CREATE PROFILE AFTER REGISTRATION
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();
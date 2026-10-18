-- QR_ATT Administrator migration
-- Review this file and run it in Supabase SQL Editor before using Admin screens.
-- This migration preserves existing rows and adds only the fields/policies needed by Admin.

-- 1) Allow the required role values.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'teacher', 'admin'));

-- 2) Add event metadata used by the event form and status badges.
alter table public.events add column if not exists venue text;
alter table public.events add column if not exists description text;
alter table public.events add column if not exists status text not null default 'open';
alter table public.events drop constraint if exists events_status_check;
alter table public.events
  add constraint events_status_check check (status in ('open', 'closed'));

-- 3) Secure helper for role checks in RLS. SECURITY DEFINER avoids profiles RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 4) Protect profile role changes. Ordinary users cannot self-promote;
-- admins cannot accidentally remove their own admin role from inside the app.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SQL Editor/bootstrap operations have no authenticated user context.
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role then
    if auth.uid() = old.id then
      raise exception 'You cannot change your own role.';
    end if;
    if not public.is_admin() then
      raise exception 'Only an administrator can change user roles.';
    end if;
    if old.role = 'admin' and new.role <> 'admin' then
      if (select count(*) from public.profiles p where p.role = 'admin') <= 1 then
        raise exception 'The last administrator cannot be demoted.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
before update on public.profiles
for each row execute function public.protect_profile_role();

-- 5) Profiles policies. Keep personal access and add admin access.
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;

create policy "Users can view own profile"
on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Admins can view all profiles"
on public.profiles for select to authenticated
using (public.is_admin());

create policy "Admins can update profiles"
on public.profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 6) Events: all signed-in users may view; creators may create/edit their own;
-- administrators may edit/manage events created by any teacher.
drop policy if exists "Authenticated users can view events" on public.events;
drop policy if exists "Authenticated users can create events" on public.events;
drop policy if exists "Creators can update own events" on public.events;
drop policy if exists "Admins can insert events" on public.events;
drop policy if exists "Admins can update all events" on public.events;
drop policy if exists "Admins can delete events" on public.events;

create policy "Authenticated users can view events"
on public.events for select to authenticated using (true);

create policy "Authenticated users can create events"
on public.events for insert to authenticated
with check (auth.uid() = created_by);

create policy "Creators can update own events"
on public.events for update to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "Admins can insert events"
on public.events for insert to authenticated
with check (public.is_admin() and auth.uid() = created_by);

create policy "Admins can update all events"
on public.events for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete events"
on public.events for delete to authenticated
using (public.is_admin());

-- 7) Attendance: students keep their own access; teachers see their event attendance;
-- administrators can review and correct attendance across the system.
drop policy if exists "Admins can view all attendance" on public.attendance;
drop policy if exists "Admins can update attendance" on public.attendance;
drop policy if exists "Admins can delete attendance" on public.attendance;

create policy "Admins can view all attendance"
on public.attendance for select to authenticated
using (public.is_admin());

create policy "Admins can update attendance"
on public.attendance for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete attendance"
on public.attendance for delete to authenticated
using (public.is_admin());

-- NOTE: To bootstrap the first administrator, use the SQL Editor after confirming
-- the account email exists in Auth > Users:
-- update public.profiles set role = 'admin' where email = 'YOUR_VERIFIED_ADMIN_EMAIL';
-- Do not allow public registration to choose the admin role.

-- 8) Ensure registration creates only Student or Teacher profiles from public signup metadata.
-- Admin accounts must be assigned manually by a trusted administrator.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  if requested_role not in ('student', 'teacher') then
    requested_role := 'student';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'full_name',
    requested_role
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

  return new;
end;
$$;

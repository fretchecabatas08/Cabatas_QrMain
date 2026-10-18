# SETUP COMMANDS — QR Attendance App

> **Target:** First-year students | **Expo SDK:** 54 | **Expo Go:** 54.0.8

---

## PREREQUISITES

| Tool | Download | Verify |
|---|---|---|
| Node.js (LTS) | https://nodejs.org/en | `node --version` |
| VS Code | https://code.visualstudio.com | (open it) |
| Expo Go 54.0.8 | Play Store → "Expo Go" | (version in app settings) |

---

## STEP 1 — Create the App

```powershell
cd D:\QR-ATT
npx create-expo-app@latest qr-att

# When prompted, select "SDK 54"
# Wait for npm install (~2 min)
```

---

## STEP 2 — Install Matching Versions

The default install may need these fixed versions that match Expo Go 54.0.8:

```powershell
npm install expo@~54.0.35 react@19.1.0 react-native@0.81.5 expo-router@~6.0.24 @expo/vector-icons@^15.0.3 expo-linking@~8.0.12 expo-constants@~18.0.13 expo-font@~14.0.12 expo-status-bar@~3.0.9 expo-splash-screen@~31.0.13 react-native-screens@~4.16.0 react-native-safe-area-context@~5.6.0 react-native-gesture-handler@~2.28.0 react-native-reanimated@~4.1.1 react-dom@19.1.0 react-native-web@~0.21.0 @types/react@~19.1.0 typescript@~5.9.2 --legacy-peer-deps
```

---

## STEP 3 — Start

```powershell
npx expo start
```

Scan QR code with Expo Go. Or press `W` for web.

---

## TROUBLESHOOTING

| Problem | Solution |
|---|---|
| npm install fails | Use `npm install --legacy-peer-deps` |
| App crashes in Expo Go | Make sure all versions match STEP 2 exactly |
| QR won't scan | Phone + computer on same WiFi |
| White screen | Wait 10s, or shake → Reload |
| TypeScript errors | Run `npx tsc --noEmit` |


---

## ADMINISTRATOR INTERFACE (added)

The project now includes role-aware Admin screens for the QR-ATT requirements:

- Admin dashboard with live Supabase totals and recent events.
- User Management with profile search, role filters, and role management.
- Event Management with create/edit/view, QR display, and close/reopen actions.
- Attendance History across events, including unique attendee counts and removal of incorrect records.
- System Reports with user/event/attendance totals and per-event attendance summaries.
- A purple-and-white design system shared across app screens.

### Set up Admin in Supabase

1. Copy `.env.example` to `.env` and add your project's Supabase URL and publishable/anon key. Never put a service-role key in the mobile app.
2. Open `docs/supabase/admin-migration.sql`, review it, and run it in Supabase SQL Editor.
3. In Supabase Dashboard, open **Authentication → Users** and confirm the account that should be the first administrator already exists.
4. In SQL Editor, run the final commented bootstrap statement from the migration after replacing `YOUR_VERIFIED_ADMIN_EMAIL` with that account's exact email:
   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'YOUR_VERIFIED_ADMIN_EMAIL';
   ```
5. Restart Expo with a clean cache if needed:
   ```powershell
   npx expo start -c
   ```

Public registration only allows Student and Teacher roles. Create the first Admin by assigning the role to a verified existing profile in Supabase.

### Validation performed

- `npx tsc --noEmit` completed successfully.
- Expo web export completed using temporary dummy Supabase environment values. A live Supabase login/data test still requires your real local `.env` and the migration above.

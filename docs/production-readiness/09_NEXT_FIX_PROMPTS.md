# 09_NEXT_FIX_PROMPTS.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# Next Fix Prompts

---

## Final Priority Rule

- **P0 #1: Run `SUPABASE_RUN_GET_AVAILABLE_SLOTS_FIX.sql`** — fixes 42702 ambiguous column error
- **P0 #2: Run `SUPABASE_RUN_BOOKING_AVAILABILITY_FIX.sql`** — GRANTs + locale-independent RPCs
- **P0 #3: Run `SUPABASE_REQUIRED_PUBLIC_DOCTOR_SCHEDULE_RLS_FIX.sql`** — active-doctor-only policies
- **P0 #4: Run `SUPABASE_REQUIRED_PATIENT_SELF_PROFILE_RLS_FIX.sql`** — make date_of_birth/sex nullable on patients table
- **P0 #5: Deploy remaining SQLs** — doctor invite table, schedule + service_ids columns
- **P0 #6: Deploy `activate-doctor-invite` Edge Function**
- **P0 #7: Commit and push all frontend changes**
- **P0 #8: Live-test patient booking full flow** (social login → ensurePatientRecord → create_booking)
- **P0 #9: Live-test Staff walk-in date selection**
- **P0 #10: Live-test Admin walk-in date selection**
- **P0 #11: Verify social-login patient has patients row after login**
- **P1: Full Doctor Portal QA**
- **P1: Run `SUPABASE_REQUIRED_STAFF_INVITES_SQL.md`** — create staff_invites table
- **P1: Deploy `activate-staff-invite` Edge Function** — staff social-login activation

---

## Prompt 1: Live-Test Admin Add Staff

**Use this prompt after any changes to the Add Staff flow:**

```
Go to https://clinic-sup.vercel.app/admin/staff.
Hard refresh (Ctrl+F5).
Open DevTools → Network tab.
Click "Add Staff".
Fill form and submit.

Check the create-staff request:
1. Does it have Authorization: Bearer <token> header?
2. What HTTP status code?
3. What response body?

Report the outcome.
If it fails, check Edge Function logs in Supabase Dashboard at:
https://supabase.com/dashboard/project/czswgpjjanllkmmwhmdh/functions/create-staff/logs
```

---

## Prompt 2: Verify Edge Function Secrets

**If Add Staff returns 500 with "Edge Function service role is not configured":**

```
Check Supabase secrets for project czswgpjjanllkmmwhmdh:

1. Go to https://supabase.com/dashboard/project/czswgpjjanllkmmwhmdh/settings/api
2. Copy the service_role key
3. Run:
   cd "Z:\CLINIC\clinicbooking-be"
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<paste>
   supabase secrets set SERVICE_ROLE_KEY=<paste>
4. Redeploy:
   supabase functions deploy create-staff
   supabase functions deploy update-staff-status
5. Test again on live site
```

---

## Prompt 3: Fix Admin Walk-in (P0 #2, after Add Staff works)

**Only use this prompt after Admin Add Staff is verified working:**

```
Audit and fix Admin Walk-in booking.

1. Check bookings RLS policies in Supabase Dashboard:
   - Does bookings INSERT allow staff/admin/super_admin to book for any patient?
   - If not, add:
     CREATE POLICY "bookings_insert_staff"
       ON public.bookings FOR INSERT
       TO authenticated
       WITH CHECK (
         has_any_role(ARRAY['staff', 'admin', 'super_admin'])
         OR auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
       );

2. Check the create_booking RPC is SECURITY DEFINER:
   - In Supabase Dashboard → Database → Functions
   - If not SECURITY DEFINER, recreate it:
     CREATE OR REPLACE FUNCTION create_booking(...) RETURNS ... SECURITY DEFINER ...

3. Walk through the admin walk-in page:
   - Patient search (test with search term)
   - Quick register (create guest patient)
   - Select doctor, service, slot
   - Create booking
   - Check console for errors

4. Fix any RLS issues blocking the flow.
```

---

## Prompt 4: Commit and Push Frontend Fix

**When tests confirm the fix is working:**

```
cd "Z:\CLINIC\clinic_fe_supabase_phase2_booking_full"
git add src/app/portals/admin/staff/staff.page.ts
git commit -m "fix: add explicit JWT auth header to create-staff and update-staff-status Edge Function calls"
git push
```

---

## Prompt 5: SQL Deployment (after P0s fixed)

**Prompt for deploying remaining SQL:**

```
Deploy these SQL files to Supabase in order:

1. SUPABASE_REQUIRED_NOTIFICATIONS_SQL.md
2. SUPABASE_REQUIRED_MEDICAL_RECORDS_SQL.md
3. SUPABASE_REQUIRED_MEDICATION_MASTER_SQL.md

For each file:
- Open Supabase SQL Editor
- Copy the SQL
- Run
- Verify table exists in Table Editor
- Run "SELECT * FROM <table>" to confirm no errors
```

---

## Prompt 6: Phase N — Migrate Settings Page

**Prompt after P0s fixed and SQL deployed:**

```
Migrate admin-settings.service.ts from MockDataService to Supabase.

1. Update src/app/portals/admin/services/admin-settings.service.ts to use SupabaseService instead of MockDataService
2. Update src/app/portals/admin/settings/settings.page.ts to remove MockDataService import
3. Delete MockDataService and all mock data files
4. Remove @microsoft/signalr dependency
5. Remove ApiService
6. Remove ClinicDashboardRealtimeService
7. Run npm run build
8. Report any errors
```

---

## Prompt 7: Run Schedule + Services ALTER TABLE SQLs

**Prompt before deploying doctor_invites table:**

```
Open Supabase Dashboard SQL Editor for project czswgpjjanllkmmwhmdh.

1. Copy the SQL from SUPABASE_REQUIRED_DOCTOR_PORTAL_SCHEDULE_FIX_SQL.md -- adds schedule column
2. Copy the SQL from SUPABASE_REQUIRED_DOCTOR_INVITE_SERVICES_FIX_SQL.md Section A -- adds service_ids column
3. Run both sequentially
4. Verify:
   SELECT column_name FROM information_schema.columns
   WHERE table_name='doctor_invites' AND column_name IN ('schedule','service_ids');
5. Run Section B from SUPABASE_REQUIRED_DOCTOR_INVITE_SERVICES_FIX_SQL.md
   to link existing "Choco Cheese" doctor to General Consultation service
```

## Prompt 8: Deploy Doctor Invite SQL

**Prompt after schedule + service_ids columns are added:**

```
Open Supabase Dashboard SQL Editor for project czswgpjjanllkmmwhmdh.
Copy the SQL from SUPABASE_REQUIRED_DOCTOR_INVITES_SQL.md.
Run it.
Verify table exists: SELECT * FROM doctor_invites LIMIT 1;
Verify indexes: SELECT indexname FROM pg_indexes WHERE tablename = 'doctor_invites';
```

## Prompt 9: Deploy Activate-Doctor-Invite Edge Function

**Prompt after SQL deployed:**

```
cd "Z:\CLINIC\clinicbooking-be"
supabase functions deploy activate-doctor-invite
```

## Prompt 12: Run Booking Availability SQL (P0 — MUST DO FIRST)

**This comes BEFORE the Doctor Invite SQL:**

```
Open Supabase Dashboard SQL Editor for project czswgpjjanllkmmwhmdh.
Copy ALL sections from SUPABASE_REQUIRED_BOOKING_AVAILABILITY_FIX_SQL.md.
Run them in order:
  Section A: GRANT SELECT on doctor_schedules, doctor_blocked_dates, doctor_day_statuses
  Section B: Replace get_available_slots RPC (locale-independent EXTRACT(DOW))
  Section C: Replace create_booking RPC (locale-independent EXTRACT(DOW))
Verify:
  SELECT grantee FROM information_schema.role_table_grants
  WHERE table_name='doctor_schedules' AND grantee IN ('anon','authenticated');
  -- Should return 2 rows
```

## Prompt 13: Manual SQL for Existing "Choco Cheese" Doctor

**Prompt if Choco Cheese was created before the fix:**

```
Run in Supabase SQL Editor:

INSERT INTO public.doctor_services (doctor_id, service_id)
SELECT d.id, s.id
FROM public.doctors d
CROSS JOIN public.services s
WHERE d.full_name = 'Choco Cheese'
  AND s.name = 'General Consultation'
ON CONFLICT (doctor_id, service_id) DO NOTHING;

Verify:
SELECT d.full_name, s.name AS service_name
FROM public.doctor_services ds
JOIN public.doctors d ON d.id = ds.doctor_id
JOIN public.services s ON s.id = ds.service_id
WHERE d.full_name = 'Choco Cheese';
```

## Prompt 9: Commit All Frontend Changes

**Prompt after code is tested:**

```
cd "Z:\CLINIC\clinic_fe_supabase_phase2_booking_full"
git add .
git commit -m "feat: implement admin doctor social login invite activation"
git push
```

## Prompt 10: Live-Test Doctor Invite Flow

**Prompt after SQL + Edge Function + frontend are deployed:**

```
1. Go to https://clinic-sup.vercel.app/admin/doctors
2. Click Add Doctor
3. Fill form:
   - Full Name: "Dr. Test Invite"
   - Doctor Email: [your test email]
   - Specialty: "General"
   - Fee: 500
4. Verify: NO password field is shown
5. Click Save
6. Verify: Success toast: "Doctor invite created. The doctor must sign in with Google or Facebook using this email to activate the account."
7. Verify: navigates back to doctor list

8. Open incognito window
9. Go to https://clinic-sup.vercel.app
10. Click Login → Continue with Google
11. Sign in with the SAME email used for the invite
12. Verify: redirects to /doctor/dashboard
13. Verify: doctor appears in Admin Doctors list with status "Active"
```

## Prompt 11: Clean Up Dead Code (Phase O)

**Prompt after all functional migrations done:**

```
Remove all dead code:

1. Delete src/app/core/services/api.service.ts
2. Remove ApiService from booking.service.ts
3. Delete src/app/core/services/clinic-dashboard-realtime.service.ts
4. Delete src/app/core/services/mock-data.service.ts
5. Delete all files in src/app/core/mock-data/
6. npm uninstall @microsoft/signalr
7. Remove apiBaseUrl from environment.ts and environment.prod.ts (if no consumer)
8. Run npm run build
9. Report build result
```

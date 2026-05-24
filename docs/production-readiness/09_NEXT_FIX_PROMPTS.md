# 09_NEXT_FIX_PROMPTS.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# Next Fix Prompts

---

## Final Priority Rule

- **If Admin Add Staff still fails, it is P0 #1.**
- **If Admin Add Staff works, Admin Walk-in is P0 #1.**
- **Do not continue cleanup until both are verified live.**

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

## Prompt 7: Clean Up Dead Code (Phase O)

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

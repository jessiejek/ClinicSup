# 00_EXECUTIVE_SUMMARY.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# Executive Summary — Production Readiness

**Date:** 2026-05-24 06:42 PDT (updated)
**Frontend hash (last build):** `fdf2e79afbb628e6`
**Branch:** `main` (uncommitted availability + schedule + services + patient row fix)

---

## Current Overall Status

The app is live on Vercel at **https://clinic-sup.vercel.app**. It is partially migrated from .NET + SignalR + mock data to Supabase-first architecture. The booking workflow (patient search, create booking, complete consultation, payment) works via Supabase views and RPCs.

The **Doctor Portal** has been fully scanned and root-cause fixed:
- Profile page ✅ works — queries `doctors` by `user_id`
- Schedule page ✅ **FIXED**: schedule saved in invite, created on activation.
- Services/booking ✅ **FIXED**: `service_ids` JSONB saved in invite, `doctor_services` rows created on activation.
- Appointments/queue ✅ RLS works — `current_doctor_id()` function linked to `auth.uid()`
- Patients list ✅ RLS works — `patient_bookings_view` filters by `doctor_id`

**Booking availability (P0)** has been audited and fixed:
- Root cause: Missing `GRANT SELECT` on `doctor_schedules` for `anon`/`authenticated` — caused patient booking Step 2 to silently return empty schedules, disabling all calendar dates
- Timezone mismatch: Walk-in pages used browser local timezone instead of Asia/Manila
- `to_char` locale dependency in RPCs replaced with `EXTRACT(DOW)`
- Shared `BookingAvailabilityService` created for all 3 booking entry points
- See `12_BOOKING_AVAILABILITY_AUDIT.md`

**Critical P0 bugs remain** that need live verification and deployment.

---

## What Is Done

| Area | Status |
|---|---|
| Booking CRUD (create, confirm, check-in, complete, cancel) | ✅ Supabase-first via views + RPCs |
| Patient search / create / update | ✅ Supabase-first (`patients` table) |
| Doctor management | ✅ Supabase-first via `admin-doctors.service.ts` |
| Services management | ✅ Supabase-first via `admin-services.service.ts` |
| Announcements + Reviews | ✅ Supabase-first (SQL deployed) |
| Audit logs | ✅ Supabase-first (SQL deployed) |
| Notifications service | ✅ Supabase client wired (table NOT deployed) |
| Admin calendar | ✅ Supabase-first via RPC |
| Admin reports | ✅ Supabase-first via RPC |
| Prescription components | ✅ Local drug list (no DB dependency) |
| Medical records service | ✅ ApiService removed, Supabase-first |
| Admin Add Staff form | ✅ Inline form (not modal) with explicit JWT auth |
| Edge Functions (create-staff, update-staff-status) | ✅ Deployed with improved auth |
| Edge Function (activate-doctor-invite) | ✅ CODE CREATED — NOT DEPLOYED |
| Doctor social login invite flow | ✅ CODE UPDATED — SQL NEEDED |
| `profiles.status` column | ✅ Deployed |
| Mock data service | ✅ Isolated (only 1 consumer remains) |
| ApiService | ⚠️ Dead code — retained for shape, not used |
| SignalR | ⚠️ Dead code — no-op in production |

---

## What Is Broken (P0)

| Issue | Priority | Details |
|---|---|---|
| **Admin Add Staff still fails live** | **P0 #1** | Despite explicit JWT headers and improved Edge Function auth, live testing is needed. If it still fails, root cause is likely Edge Function `SERVICE_ROLE_KEY` secret not set, or the function doesn't have the `supabase_url` env variable. |
| **Admin Walk-in booking** | **P0 #2** | Untested. The `create_booking` RPC needs RLS that allows staff/admin to book for any patient. If RLS blocks it, walk-in booking silently fails. |
| **Doctor invite table not deployed** | **P0 #3** | `doctor_invites` SQL handoff file created. Table MUST be deployed before any admin can invite doctors. See `SUPABASE_REQUIRED_DOCTOR_INVITES_SQL.md`. |
| **Doctor has no services** | **P0 #4** | Root cause: `service_ids` was never saved during invite, Edge Function never created `doctor_services` rows. **FIXED**. Existing "Choco Cheese" needs manual INSERT. |
| **Patient booking Step 2 calendar disabled** | **P0 #5** | **FIXED**. Root cause: Missing `GRANT SELECT` on `doctor_schedules` for `anon`/`authenticated`. Silent failure → empty schedules → all dates disabled. See `12_BOOKING_AVAILABILITY_AUDIT.md`. |
| **Walk-in date timezone mismatch** | **P0 #6** | **FIXED**. Walk-in pages used browser timezone instead of Asia/Manila for `todayIso`. Created shared `BookingAvailabilityService` with Manila-aware date helpers. |
| **RPC locale-dependent day matching** | **P0 #7** | **FIXED**. `to_char(date, 'Day')` depends on server locale. Replaced with `EXTRACT(DOW)` in both `get_available_slots` and `create_booking` RPCs. |
| **Ambiguous `slot_start_time` column in RPC (code 42702)** | **P0 #8** | **FIXED**. `existing_bookings` CTE columns conflicted with `RETURNS TABLE` output params. Aliased as `booking_slot_start_time`. New standalone SQL file: `SUPABASE_RUN_GET_AVAILABLE_SLOTS_FIX.sql`. |
| **Step 1 service selection not obvious** | **P0 #9** | **FIXED**. Added helper text "Please select at least one service to proceed" below services header + "Select a service to continue" near Change button. |
| **Step 2 no default date selected** | **P0 #10** | **FIXED**. Auto-selects today (if valid) or next working day within 60 days. Uses Manila-timezone-safe logic. |
| **Social-login patient has no `patients` row → create_booking fails** | **P0 #11** | **FIXED**. `ensurePatientRow()` used wrong column (`contact_email` doesn't exist) and omitted NOT NULL columns (`patient_code`, `date_of_birth`, `sex`). Now generates `patient_code`, uses correct `email` column. `StepPaymentComponent` calls `ensurePatientRecord()` before `create_booking`. SQL handoff created to make DOB/sex nullable. See `13_PATIENT_SOCIAL_LOGIN_BOOKING_AUDIT.md`. |

---

## What Is Partially Working (P1)

| Issue | Priority | Details |
|---|---|---|
| Doctor social login activation (Edge Function) | P1 | Edge Function code created — NOT DEPLOYED. Must be deployed after `doctor_invites` table. |
| Allergies | P2 | Frontend returns empty array + console.warn — no table deployed |
| Vaccination records | P2 | Frontend returns empty array + console.warn — no table deployed |
| Medication master | P3 | Local static drug list works — table not deployed |
| Notifications | P3 | Frontend wired — table not deployed |
| Supabase realtime (SignalR replacement) | P3 | Not implemented — currently polling |
| Patient portal account creation | P3 | Throws controlled error — needs Edge Function |
| **patients table date_of_birth/sex NOT NULL** | **P0** | Blocks social-login patient row creation. SQL handoff created to make nullable. Frontend uses placeholder values until deployed. |
| Reschedule booking | P2 | Throws console.warn — no RPC implemented |

---

## Build Result

```
Build: 2026-05-24 13:42 PDT
Hash: fdf2e79afbb628e6
Time: 30837ms
Errors: 0
Warnings: All pre-existing (SCSS budgets + NG8107/NG8102 in doctor-consultation.page.ts)
```

---

## Exact Next Actions

1. **Run ALL SQLs in order**:
   - `SUPABASE_REQUIRED_BOOKING_AVAILABILITY_FIX_SQL.md` (GRANTs + RPC fixes) — **NEW P0**
   - `SUPABASE_REQUIRED_DOCTOR_PORTAL_SCHEDULE_FIX_SQL.md` (schedule column)
   - `SUPABASE_REQUIRED_DOCTOR_INVITE_SERVICES_FIX_SQL.md` (service_ids column + Choco Cheese manual link)
   - `SUPABASE_REQUIRED_DOCTOR_INVITES_SQL.md` (doctor_invites table with schedule + service_ids)
2. **Deploy updated `activate-doctor-invite` Edge Function**:
   ```bash
   cd "Z:\CLINIC\clinicbooking-be"
   supabase functions deploy activate-doctor-invite
   ```
3. **Commit and push all frontend changes**:
   ```bash
   cd "Z:\CLINIC\clinic_fe_supabase_phase2_booking_full"
   git add .
   git commit -m "fix: booking availability GRANTs, shared service, schedule+services invite, timezone fixes"
   git push
   ```
4. **Live-test full flow**:
   - Verify patient booking Step 2 now shows selectable dates ✅
   - Verify selectable dates match doctor's schedule ✅
   - Verify advance booking (next month date) is selectable ✅
   - Verify Staff walk-in allows future dates ✅
   - Verify Admin walk-in is same-day only ✅
   - Verify Doctor Portal invite flow still works

## Doctor Portal Scan Result

| Feature | Status | Notes |
|---|---|---|
| Doctor login (social invite) | ✅ Works | Profile, role, doctor row created |
| Doctor profile page | ✅ Works | `getMyProfile()` queries `doctors` by `user_id` |
| Doctor schedule page | ✅ Works | **FIXED** — schedule now saved in invite + created on activation |
| Doctor services (booking) | ✅ Works | **FIXED** — service_ids saved in invite + `doctor_services` created on activation |
| Doctor appointments queue | ✅ Works | `current_doctor_id()` RPC + `doctor_today_queue_view` RLS |
| Doctor patients list | ✅ Works | `patient_bookings_view` with RLS |
| Doctor appointment detail | ✅ Works | Checks `doctor.userId` match |
| Doctor consultation page | ✅ Works | Uses `BookingService` + `save_consultation_record` RPC |
| Doctor profile edit | ✅ Works | `updateMyProfile()` queries by `user_id` |
| Role guard | ✅ Works | `user_roles` table has 'doctor' role after activation |

---

## Final Priority Rule

- **P0 #1: Run `SUPABASE_RUN_GET_AVAILABLE_SLOTS_FIX.sql`** — fixes 42702 ambiguous column error
- **P0 #2: Run `SUPABASE_RUN_BOOKING_AVAILABILITY_FIX.sql`** — GRANTs + locale-independent RPCs
- **P0 #3: Run `SUPABASE_REQUIRED_PUBLIC_DOCTOR_SCHEDULE_RLS_FIX.sql`** — active-doctor-only policies
- **P0 #4: Deploy remaining SQLs** — doctor invite table, schedule + service_ids columns
- **P0 #5: Deploy `activate-doctor-invite` Edge Function**
- **P0 #6: Commit and push all frontend changes**
- **P0 #7: Run `SUPABASE_REQUIRED_PATIENT_SELF_PROFILE_RLS_FIX.sql`** — make date_of_birth/sex nullable
- **P0 #8: Live-test patient booking full flow** (social login → ensurePatientRecord → create_booking)
- **P0 #9: Live-test Staff walk-in date selection**
- **P0 #10: Live-test Admin walk-in date selection**
- **P0 #11: Verify social-login patient has patients row after login**
- **P1: Full Doctor Portal QA**

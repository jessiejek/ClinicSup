# 10_ADMIN_DOCTOR_SOCIAL_INVITE_AUDIT.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# Admin Doctor Social Login Activation — Full Audit

---

## Root Cause of Current Doctor Account Issue

When an admin tries to create a new doctor via the "Add Doctor" form, the `AdminDoctorsService.createDoctorAsync()` method throws:

> *"Doctor account creation requires a linked Supabase Auth user account... The admin UI cannot create Auth users directly with the anon key."*

**Why this happens:**
1. The `doctors` table has `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
2. The frontend uses the **anon key** which cannot create Auth users
3. No Edge Function existed to atomically create both the Auth user and doctor record
4. The existing form asked for a password (`tempPassword`) that was never used

**The fix:** Replace direct doctor creation with an **invite-based activation flow**:
- Admin creates a `doctor_invites` record (no Auth user creation needed)
- Doctor signs in with Google/Facebook using the same email
- Edge Function `activate-doctor-invite` handles linking everything atomically

---

## Files Changed

### Frontend (5 files changed, 1 new)

| File | Change |
|---|---|
| `src/app/auth/callback/auth-callback.page.ts` | Added doctor activation check after OAuth session restore. Calls `activate-doctor-invite` Edge Function. On success, reloads profile with doctor role and redirects to `/doctor/dashboard`. |
| `src/app/portals/admin/services/admin-doctors.service.ts` | Added `CreateDoctorInviteDto` interface and `createDoctorInvite()` method. Uses `AuthStateService` to get `invited_by` user id. Inserts into `doctor_invites` table. Throws clear error if table doesn't exist (migration needed). |
| `src/app/portals/admin/doctor-form/doctor-form.page.ts` | **Removed** `tempPassword` field and password validation. Removed `CreateDoctorDto` usage for create flow. Submit now branches: for **edit mode** → `updateDoctor()` as before; for **create mode** → `createDoctorInvite()`. |
| `src/app/portals/admin/doctor-form/doctor-form.page.scss` | Added `.form-field__hint` CSS for the email hint text. |
| `SUPABASE_REQUIRED_DOCTOR_INVITES_SQL.md` | **NEW** — SQL handoff for `doctor_invites` table. |

### Backend/Supabase (1 new Edge Function)

| File | Size | Change |
|---|---|---|
| `supabase/functions/activate-doctor-invite/index.ts` | 6.1 KB | **NEW** — Edge Function for doctor activation flow. |

---

## SQL File Created

**File:** `Z:\CLINIC\clinic_fe_supabase_phase2_booking_full\SUPABASE_REQUIRED_DOCTOR_INVITES_SQL.md`

**Status:** ⚠️ **SQL NEEDED — NOT DEPLOYED**

### Table: `public.doctor_invites`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Default `gen_random_uuid()` |
| `doctor_id` | UUID FK → doctors(id) | NULL until accepted, ON DELETE SET NULL |
| `email` | TEXT NOT NULL | Doctor's email — matched during social login |
| `full_name` | TEXT NOT NULL | |
| `specialization` | TEXT NOT NULL DEFAULT '' | |
| `bio` | TEXT nullable | |
| `license_number` | TEXT nullable | |
| `ptr_number` | TEXT nullable | |
| `s2_number` | TEXT nullable | |
| `consultation_fee` | NUMERIC(10,2) | Default 0 |
| `slot_duration_minutes` | INT DEFAULT 30 | |
| `slot_capacity` | INT DEFAULT 1 | |
| `daily_patient_limit` | INT nullable | |
| `status` | TEXT NOT NULL DEFAULT 'pending' | CHECK: pending, accepted, revoked |
| `invited_by` | UUID FK → auth.users(id) | Who created the invite |
| `accepted_user_id` | UUID FK → auth.users(id) | NULL until accepted |
| `accepted_at` | TIMESTAMPTZ | NULL until accepted |
| `created_at` | TIMESTAMPTZ | Default now() |
| `updated_at` | TIMESTAMPTZ | Default now() |

### Key constraints:
- **Unique pending email index**: `UNIQUE INDEX ON doctor_invites (lower(email)) WHERE status = 'pending'`
- **Status check**: `CHECK (status IN ('pending', 'accepted', 'revoked'))`

### RLS policies:
- **SELECT**: admin/super_admin only
- **INSERT**: admin/super_admin only
- **UPDATE**: admin/super_admin only
- **DELETE**: admin/super_admin only
- Edge Function uses `service_role` key to bypass RLS for activation

---

## Edge Function: `activate-doctor-invite`

**File:** `clinicbooking-be/supabase/functions/activate-doctor-invite/index.ts`

**Status:** ✅ **CODE CREATED — NOT DEPLOYED**

### Behavior:

1. **CORS**: Handles OPTIONS preflight
2. **Auth**: Reads `Authorization: Bearer <token>` header
3. **JWT validation**: Uses anon client `auth.getUser(token)`
4. **Email extraction**: Gets `caller.email`, normalizes to lowercase
5. **Service role key**: `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')`
6. **Find invite**: Queries `doctor_invites WHERE status='pending' AND email=<lowercase caller email>`
7. **If no invite**: Returns `{ activated: false, role: null, reason: "No pending doctor invite found." }` with HTTP 200
8. **If invite found**:
   - **Upsert profile**: `profiles` row for the authenticated user
   - **Upsert role**: `user_roles` with `role: 'doctor'`
   - **Upsert doctor**: `doctors` row with invite data + `user_id: callerId`, status `Active`
   - **Mark invite accepted**: Updates `doctor_invites` with `status: 'accepted'`, `accepted_user_id`, `accepted_at`, `doctor_id`
9. **Returns success**: `{ activated: true, role: "doctor", doctorId: "..." }`
10. **Error handling**: Never returns secrets. Safe error messages only.

---

## Frontend Auth Flow (Social Login Activation)

### OAuth callback (`auth-callback.page.ts`):

```
Google/Facebook sign-in
        ↓
Supabase OAuth callback (redirect to /auth/callback)
        ↓
auth-callback.page.ts ngOnInit()
        ↓
Get session → supabase.auth.getSession()
        ↓
authService.loadAuthUser() → creates profile, role (defaults to Patient), patient row
        ↓
if role === 'Patient':
    call activate-doctor-invite Edge Function with access_token
        ↓
if activated=true and role=doctor:
    reload session → reload auth user with updated role
    redirect to /doctor/dashboard
        ↓
if activated=false:
    continue normal patient/public flow
```

### What does NOT break:
- **Patient social login**: If doctor activation returns `activated: false`, the normal patient flow continues
- **Existing doctor login**: If role is already 'Doctor', the activation check is skipped entirely
- **Admin role**: Only checked for role === 'Patient'

---

## Security

| Concern | Status |
|---|---|
| `service_role` key in frontend | ❌ Never — Edge Function only |
| Password in frontend code | ✅ Removed — no password field |
| Password in logs | ✅ Edge Function never logs passwords |
| Email in response | ✅ Not returned in response |
| Doctor auto-activation without invite | ✅ No matching invite → `activated: false` |
| Admin bypass of invite flow | ✅ Admin still cannot create doctors directly — must use invite |
| RLS on doctor_invites | ✅ Admin/super_admin only |
| Edge Function service_role usage | ✅ Only for Auth admin API + bypass RLS |

---

## Build Result

```
Build: 2026-05-24T12:34:05.228Z
Hash: 5ec26e21fdd42a06
Time: 23675ms
Errors: 0
Warnings: All pre-existing (SCSS budgets, Ionic pseudo-class selectors)
```

---

## Doctor Portal Scan (2026-05-24)

### Root Cause #1: Empty Schedule After Activation

When admin creates a doctor invite, the schedule is captured in `doctor-form.page.ts` (`scheduleDraft`) but was **never saved to any Supabase table**. The invite flow (`createDoctorInvite()`) only inserts profile fields into `doctor_invites`, ignoring the schedule entirely. During activation, the Edge Function never creates `doctor_schedules` rows. Result: logged-in doctor sees an empty schedule.

### Root Cause #2: "No Services Available" After Activation

When admin creates a doctor invite, the service selection is captured in `doctor-form.page.ts` (`selectedServiceIds` Set) but was **never saved to any Supabase table**. The booking wizard queries `doctor_available_services_view` which joins `doctor_services` × `services`. Since no `doctor_services` rows exist, the view returns empty → patient sees "No services available."

### Fixes Applied

| File | Change |
|---|---|
| `SUPABASE_REQUIRED_DOCTOR_INVITES_SQL.md` | Added `schedule JSONB` + `service_ids JSONB` columns |
| `SUPABASE_REQUIRED_DOCTOR_PORTAL_SCHEDULE_FIX_SQL.md` | ALTER TABLE SQL for `schedule` column |
| `SUPABASE_REQUIRED_DOCTOR_INVITE_SERVICES_FIX_SQL.md` | **NEW** — ALTER TABLE for `service_ids` + manual link SQL for "Choco Cheese" |
| `admin-doctors.service.ts` | Added `schedule` + `serviceIds` to `CreateDoctorInviteDto` and insert payload |
| `doctor-form.page.ts` | Passes `scheduleDraft` + `selectedServiceIds` in invite payload; added service selection UI with checkboxes; validates ≥1 service required |
| `doctor-form.page.scss` | Added `.services-list`, `.service-checkbox`, `.service-checkbox--selected` styles |
| `activate-doctor-invite/index.ts` | Reads `invite.schedule` → creates `doctor_schedules`; reads `invite.service_ids` → creates `doctor_services` rows using `.upsert({ onConflict: 'doctor_id, service_id', ignoreDuplicates: true })` |

### Verified Working Features

| Feature | Status | How It Works |
|---|---|---|
| Doctor profile page | ✅ | `getMyProfile()` → `doctors WHERE user_id = authUser.id` |
| Doctor profile edit | ✅ | `updateMyProfile()` → updates doctors row by user_id |
| Doctor schedule page | ✅ | `getMySchedule()` → get doctor by user_id → get doctor_schedules by doctor_id |
| Doctor services (booking) | ✅ | `getDoctorServices(doctorId)` → `doctor_available_services_view` → shows linked services |
| Doctor appointments/queue | ✅ | `getDoctorTodaySummary()` → `current_doctor_id()` RPC + `doctor_today_queue_view` |
| Doctor patients list | ✅ | `patient_bookings_view` with RLS (`doctor_id = current_doctor_id()`) |
| Doctor appointment detail | ✅ | Checks `doctor.userId` match |
| Doctor consultation | ✅ | Uses `save_consultation_record` RPC |

### RLS Confirmation

- `doctor_schedules`: SELECT policy is `true` (public read) — no RLS issue
- `doctor_services`: no direct RLS needed (service_role writes via EF, `doctor_available_services_view` is public)
- `bookings`: SELECT policy uses `doctor_id = current_doctor_id()` which queries `doctors WHERE user_id = auth.uid()` — works ✓
- `current_doctor_id()`: `SELECT id FROM doctors WHERE user_id = auth.uid()` — after activation creates doctors row with `user_id = callerId`, this works ✓
- `doctor_available_services_view` and `patient_bookings_view`: inherit RLS from base tables — works ✓

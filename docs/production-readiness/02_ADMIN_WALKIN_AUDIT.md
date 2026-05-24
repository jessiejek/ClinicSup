# 02_ADMIN_WALKIN_AUDIT.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# Admin Walk-in — End-to-End Audit

**P0 priority if Admin Add Staff is working.**

---

## Route

`/admin/walk-in` → routes to `WalkInPage` in `admin.routes.ts`

**File:** `src/app/portals/admin/walk-in/walk-in.page.ts`

---

## Component Components

### Step 1 — Patient Search / Quick Register

1. **Search** via `AdminPatientsService.getPatients()` — uses Supabase `.from('patients').select()` with ILIKE search
2. **Quick Register** via `AdminPatientsService.createGuestPatient()` — inserts into `patients` table
   - Patient code auto-generated: `WALK-YYYYMMDD-RAND4`
   - `user_id: null`, `is_guest: true`
3. **No MockDataService** — confirmed clean
4. **No ApiService/.NET** — confirmed clean

### Step 2 — Slot Selection

1. Doctors loaded from `PublicService.getDoctors()` — Supabase-first
2. Services loaded from `PublicService.getDoctorServices()` — Supabase-first
3. Slots loaded from `PublicService.getAvailableSlots()` — Supabase-first
4. Date locked to today (`todayIso`)

### Step 3 — Confirm Booking

1. Calls `BookingService.createWalkIn()` → `createSupabaseWalkInBooking()`
2. Which calls `create_booking` RPC internally
3. Then updates `bookings` row with `payment_mode` and `is_walk_in: true`

---

## Exact Failing Point (if any)

### `create_booking` RPC — RLS is the Primary Risk

The `create_booking` RPC is defined in **Phase 2 SQL**. It inserts into `bookings` with:
- `patient_id` = the selected patient (guest or existing)
- `doctor_id` = the selected doctor
- `p_patient_id` passed as a parameter

**RLS Risk:** The `bookings` table has RLS policies. If the RPC runs as the authenticated user (not definer), and the user is `admin`, the insert policy must allow `admin` role to insert bookings for any patient.

**Expected RLS policy for bookings INSERT:**
```sql
CREATE POLICY "Admin and staff can insert bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    has_any_role(ARRAY['admin', 'super_admin', 'staff'])
    OR auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
  );
```

**If this policy is missing**, the RPC will silently fail with an RLS violation (which Supabase returns as a generic error).

### Other Risks

| Check | Status | Action Needed |
|---|---|---|
| `patients.user_id` nullable? | ✅ Yes — guest patients have `user_id: null` | Confirmed safe |
| `patients` insert policy for admin/staff/super_admin? | ⚠️ **Verify** | Check `patients` table policies in Supabase |
| `patients` select policy for admin/staff/super_admin? | ⚠️ **Verify** | Must allow admin to read all patients |
| `patients` update policy for admin/staff/super_admin? | ⚠️ **Verify** | Needed if admin edits patient details |
| `create_booking` allows staff/admin/super_admin to book for another patient? | ⚠️ **Verify** | RPC uses `SECURITY DEFINER` or RLS bypass? |
| `p_is_walk_in` actually passed as `true`? | ✅ Yes — set by `createSupabaseWalkInBooking()` after booking created | Confirmed |
| Patient insert uses real `patients` table? | ✅ Yes — `admin-patients.service.ts` inserts into Supabase | Confirmed |
| Required patient columns match schema? | ✅ Yes — columns match `patients` table | Confirmed |
| No MockDataService? | ✅ Yes — walk-in page injects `AdminPatientsService` | Confirmed |
| No ApiService/.NET? | ✅ Yes — all calls go through Supabase | Confirmed |
| No fake success? | ✅ Yes — errors propagate as Observable errors | Confirmed |

---

## Key SQL Needed (if RLS is the issue)

Check Supabase Dashboard → SQL Editor → check the existing Phase 2 SQL policies for `bookings` table.

**If missing, run:**
```sql
-- Allow staff/admin/super_admin to book for any patient
CREATE POLICY "bookings_insert_staff"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role(ARRAY['staff'::app_role, 'admin'::app_role, 'super_admin'::app_role])
    OR auth.uid() IN (SELECT user_id FROM public.patients WHERE id = patient_id)
  );

-- Allow staff/admin to read all bookings
CREATE POLICY "bookings_read_all_staff"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(ARRAY['staff'::app_role, 'admin'::app_role, 'super_admin'::app_role])
    OR auth.uid() IN (SELECT user_id FROM public.patients WHERE id = patient_id)
  );
```

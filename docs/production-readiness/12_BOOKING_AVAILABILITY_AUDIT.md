# 12_BOOKING_AVAILABILITY_AUDIT.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# Booking Availability — Full Audit

**Date:** 2026-05-24 12:57 PDT
**Frontend hash (last build):** `6a5d45b40f1422a2`
**Branch:** `main` (uncommitted)

---

## Entry Points

| Entry Point | Route | Component | Slot Source |
|---|---|---|---|
| Patient Booking | `/public/booking` (or via wizard) | `StepDatePickerComponent` (Step 2) + `StepSlotSelectComponent` (Step 3) | `get_available_slots` RPC via `PublicService.getAvailableSlots()` |
| Staff Walk-in | `/staff/walk-in` | `StaffWalkInPage` | `get_available_slots` RPC via `PublicService.getAvailableSlots()` |
| Admin Walk-in | `/admin/walk-in` | `WalkInPage` | `get_available_slots` RPC via `PublicService.getAvailableSlots()` |

---

## Root Causes Found

### Root Cause #1: Missing `GRANT SELECT` on `doctor_schedules`

**Evidence:** `public_doctors_view` and `doctor_available_services_view` have explicit `GRANT SELECT ... TO anon, authenticated` in `phase-02-booking-workflow.sql`. `doctor_schedules` has NO such GRANT.

**Impact:** `PublicService.getDoctorSchedules()` queries the table using the `anon` key (or `authenticated` key if logged in). Without `GRANT SELECT`, Supabase returns a permission error. The `catchError(() => of([]))` in `PublicService.getDoctorSchedules()` silently returns an empty array. The patient booking Step 2 Calendar receives `[]` schedules, so `isWorkingDay()` always returns `false`, and **all calendar dates appear disabled**.

**Why the Doctor Portal works:** `DoctorService.fetchSchedule()` also queries `doctor_schedules`. The doctor is logged in (authenticated role). If there's also no GRANT for `authenticated`, this would fail too — but the doctor portal shows the schedule, suggesting either:
1. The GRANT was added manually in Supabase Dashboard
2. The `authenticated` role got SELECT via a different mechanism (e.g., table creation in Dashboard grants defaults)

**Fix applied:** New SQL handoff file `SUPABASE_REQUIRED_BOOKING_AVAILABILITY_FIX_SQL.md` includes:
```sql
GRANT SELECT ON public.doctor_schedules TO anon, authenticated;
GRANT SELECT ON public.doctor_blocked_dates TO anon, authenticated;
GRANT SELECT ON public.doctor_day_statuses TO anon, authenticated;
```

### Root Cause #2: `to_char` locale-dependent day-of-week matching in RPCs

**Evidence:** Both `get_available_slots` and `create_booking` RPCs use:
```sql
v_day_of_week := trim(to_char(p_appointment_date, 'Day'));
```
Then compare against `doctor_schedules.day_of_week` (an `appointment_day` ENUM).

**Impact:** `to_char(date, 'Day')` depends on the server's `lc_time` locale. If a Supabase project's locale is non-English, the day name would differ from the ENUM values (`Monday`, `Tuesday`, etc.).

**Fix applied:** Both RPCs rewritten in `SUPABASE_REQUIRED_BOOKING_AVAILABILITY_FIX_SQL.md` to use `EXTRACT(DOW FROM ...)` which returns a number (0=Sunday, 1=Monday, ..., 6=Saturday) — fully locale-independent.

```sql
v_dow := EXTRACT(DOW FROM p_appointment_date)::INT;
-- Then match with CASE:
AND ((v_dow = 0 AND ds.day_of_week = 'Sunday')
     OR (v_dow = 1 AND ds.day_of_week = 'Monday')
     ...)
```

### Root Cause #3: Timezone mismatch — frontend local time vs server UTC date

**Walk-in pages only.** Both `StaffWalkInPage` and `WalkInPage` (Admin) use:
```typescript
readonly todayIso = toLocalIsoDate(); // Uses browser's local timezone
```

The `create_booking` RPC uses `CURRENT_DATE` which is the **PostgreSQL server timezone** (default `UTC`). The `get_available_slots` RPC also uses `CURRENT_DATE`.

For example, when the browser is in America/Los_Angeles (PDT = UTC-7):
- Current local time: 2026-05-23 10:00 PM PDT
- `toLocalIsoDate()` returns `'2026-05-23'`
- Server `CURRENT_DATE` returns `'2026-05-24'` (UTC)
- `get_available_slots` checks `p_appointment_date < CURRENT_DATE` → `'2026-05-23' < '2026-05-24'` → TRUE → returns empty
- `create_booking` checks same → raises EXCEPTION

**Patient Booking is also affected** if using `new Date()` for `isPast()` and today comparisons, but the issue is less pronounced because:
- The `isPast()` method compares two local-timezone Dates (same timezone, so relative ordering is correct)
- However, when `isPast()` returns false (date is not past in local time) but the server's `CURRENT_DATE` disagrees, the booking creation call would fail

**Fix applied:** Created `BookingAvailabilityService` with Manila-timezone-aware date helpers:
- `getManilaTodayIso()` — returns current date in Asia/Manila
- `isManilaPast(dateStr)` — compares against Manila today
- `isManilaToday(dateStr)` — checks if date is Manila today
- `getManilaDayOfWeek(dateStr)` — returns `DayOfWeek` for a date in Manila timezone

Both walk-in pages updated to use `availabilityService.getManilaTodayIso()` instead of `toLocalIsoDate()`.

### Root Cause #4: No shared availability utility

### Root Cause #5: Ambiguous `slot_start_time` column in `get_available_slots` RPC (code 42702)

**Evidence:** The `get_available_slots` RPC declares `RETURNS TABLE (slot_start_time TIME, slot_end_time TIME, ...)`. The `existing_bookings` CTE selects `slot_start_time, slot_end_time` without table qualification. When the `LEFT JOIN existing_bookings eb` references `eb.slot_start_time`, PostgreSQL cannot determine whether this refers to the output parameter or the CTE column, producing error 42702.

**Impact:** When `get_available_slots` is called (e.g., patient booking Step 3), it fails with:
```json
{"code": "42702", "message": "column reference \"slot_start_time\" is ambiguous"}
```
Steps 1 and 2 work (doctor selection, date selection), but Step 3 (slot selection) never loads available slots.

**Fix applied:**
- `existing_bookings` CTE now aliases columns: `b.slot_start_time AS booking_slot_start_time`
- All booking columns qualified with `b.` prefix
- `LEFT JOIN` uses aliased names: `eb.booking_slot_start_time < ts.slot_end_time`
- Applied in both `SUPABASE_RUN_BOOKING_AVAILABILITY_FIX.sql` and `SUPABASE_REQUIRED_BOOKING_AVAILABILITY_FIX_SQL.md` (Section B)
- New standalone SQL file created: `SUPABASE_RUN_GET_AVAILABLE_SLOTS_FIX.sql` — contains ONLY the fixed `get_available_slots` function (no GRANTs, no `create_booking`)

**Evidence:** Patient Booking (Step 2), Staff Walk-in, and Admin Walk-in each had their own date/slot logic. The date picker queried `doctor_schedules` directly via `PublicService.getDoctorSchedules()`. The walk-in pages had their own slot loading (shared via `PublicService.getAvailableSlots()` but with different error handling).

**Fix applied:** Created `BookingAvailabilityService` (`src/app/portals/public/services/booking-availability.service.ts`) with:
- `getDoctorWorkingDays(doctorId)` — fetches and caches schedule data
- `isDoctorAvailableOnDate(doctorId, dateStr)` — checks schedule match
- `getAvailableSlots(doctorId, dateStr)` — wraps existing RPC
- `canBookOnDate(doctorId, dateStr)` — complete bookability check
- `getManilaTodayIso()` / `isManilaToday()` / `isManilaPast()` / `getManilaDayOfWeek()` — Manila-timezone date helpers

---

## Files Changed

### New Files

| File | Purpose |
|---|---|
| `SUPABASE_REQUIRED_BOOKING_AVAILABILITY_FIX_SQL.md` | SQL handoff: GRANTs + RPC fixes |
| `SUPABASE_RUN_BOOKING_AVAILABILITY_FIX.sql` | Clean runnable SQL: GRANTs + both RPCs (includes all fixes) |
| `SUPABASE_RUN_GET_AVAILABLE_SLOTS_FIX.sql` | Clean runnable SQL: ONLY fixed `get_available_slots` (ambiguous column fix) |
| `SUPABASE_REQUIRED_PUBLIC_DOCTOR_SCHEDULE_RLS_FIX.sql` | Clean runnable SQL: GRANTs + active-doctor-only RLS policies |
| `src/app/portals/public/services/booking-availability.service.ts` | Shared availability helper (Manila-timezone-aware) |
| `docs/production-readiness/12_BOOKING_AVAILABILITY_AUDIT.md` | This audit document |

### Modified Files

| File | Change |
|---|---|
| `src/app/portals/public/components/step-date-picker/step-date-picker.component.ts` | Uses `BookingAvailabilityService`; auto-select today/default date on load |
| `src/app/portals/admin/walk-in/walk-in.page.ts` | Uses `BookingAvailabilityService.getManilaTodayIso()` instead of `toLocalIsoDate()` |
| `src/app/portals/staff/walk-in/staff-walk-in.page.ts` | Uses `BookingAvailabilityService.getManilaTodayIso()` instead of `toLocalIsoDate()` |
| `src/app/portals/public/components/step-doctor-service/step-doctor-service.component.ts` | Added service-helper + btn-helper text |
| `src/app/portals/public/components/step-doctor-service/step-doctor-service.component.scss` | Added CSS for .service-helper, .btn-helper, .wizard-actions__btn-group |
| `SUPABASE_RUN_BOOKING_AVAILABILITY_FIX.sql` | Fixed ambiguous `slot_start_time` reference (b.slot_start_time AS booking_slot_start_time) |
| `SUPABASE_REQUIRED_BOOKING_AVAILABILITY_FIX_SQL.md` | Fixed ambiguous column reference in Section B |
| `docs/production-readiness/00_EXECUTIVE_SUMMARY.md` | Updated |
| `docs/production-readiness/09_NEXT_FIX_PROMPTS.md` | Updated |
| `docs/production-readiness/12_BOOKING_AVAILABILITY_AUDIT.md` | Updated |

---

## SQL Deploy Needed

Run in this order:

**Step 1 (standalone — fixes 42702 immediately):** `SUPABASE_RUN_GET_AVAILABLE_SLOTS_FIX.sql`
- Drops and recreates ONLY `get_available_slots` with aliased CTE columns
- No GRANTs, no `create_booking` changes

**Step 2 (full fix):** `SUPABASE_RUN_BOOKING_AVAILABILITY_FIX.sql`
- GRANT SELECT + locale-independent `EXTRACT(DOW)` in both RPCs + aliased CTE columns

**Step 3 (RLS hardening):** `SUPABASE_REQUIRED_PUBLIC_DOCTOR_SCHEDULE_RLS_FIX.sql`
- Replaces `USING (true)` policies with active-doctor-only policies

**Step 4 (patient self-profile fix):** `SUPABASE_REQUIRED_PATIENT_SELF_PROFILE_RLS_FIX.sql`
- Makes `date_of_birth`/`sex` nullable on patients table
- Ensures GRANTs and RLS policies for self-service
- Enables social-login patients to create their patients row

---

### Step 1 UX Improvement

- Added helper text: "Please select at least one service to proceed." — appears below the services header when no service is selected.
- Added button helper: "Select a service to continue" — appears below the Continue button when a doctor IS selected but no services are.
- Helper text uses neutral styling (primary-50 background, secondary text color) — not alarmist.
- Continue button already disabled when no service selected (existing `canContinue` getter).

### Step 2 Auto-Select Default Date

When Step 2 loads and working days are retrieved:
1. **Today is preferred** — if today is a working day and not in the past, it is auto-selected.
2. **Next valid date** — if today is not valid, it scans the next 60 days for the first working day and auto-selects it.
3. Continue button enables automatically when a date is auto-selected.
4. Uses Manila-timezone-safe date logic (`BookingAvailabilityService.getManilaTodayIso()`, `isManilaPast()`, `getManilaDateOffset()`).

## Choco Cheese Validation

| Check | Expected | Notes |
|---|---|---|
| Has `doctor_services` row | ✅ Yes | Linked to General Consultation |
| Has `doctor_schedules` Sunday active | ✅ Yes | 08:00-23:00 as shown in doctor portal |
| Patient booking Step 2 should enable Sunday | ✅ After GRANT SELECT fix | `getDoctorWorkingDays()` returns Sunday → `isWorkingDay()` returns true → `isSelectable()` returns true |
| Slot source | `get_available_slots` RPC | Generates slots from `doctor_schedules` using `generate_series` with `slot_duration_minutes` from `doctors` table |

---

## Advance Booking

**Patient Booking:** ✅ Works — no `max` constraint on date picker. Future months are navigable. Past dates disabled via `isPast()`.

**Staff Walk-in:** ✅ Works — `[min]="todayIso"` with no `[max]`. The `appointmentDate` input allows future dates. The `get_available_slots` RPC handles future dates correctly (no time-filtering for non-today dates).

**Admin Walk-in:** ✅ Same-day only by design — `[min]="todayIso" [max]="todayIso"`. This is intentional for walk-ins.

---

## Build Result

```
Build at: 2026-05-24T13:27:56.499Z
Hash: 9d82e019a6b4559a
Time: 23422ms
Errors: 0
Warnings: All pre-existing (SCSS budgets + NG8107/NG8102 in doctor-consultation.page.ts)
```

---

## Git Status

```
 M SUPABASE_REQUIRED_BOOKING_AVAILABILITY_FIX_SQL.md
 M SUPABASE_RUN_BOOKING_AVAILABILITY_FIX.sql
?? SUPABASE_RUN_GET_AVAILABLE_SLOTS_FIX.sql
?? SUPABASE_REQUIRED_PUBLIC_DOCTOR_SCHEDULE_RLS_FIX.sql
 M docs/production-readiness/00_EXECUTIVE_SUMMARY.md
 M docs/production-readiness/09_NEXT_FIX_PROMPTS.md
 M docs/production-readiness/12_BOOKING_AVAILABILITY_AUDIT.md
 M src/app/core/version.ts
 M src/app/portals/admin/walk-in/walk-in.page.ts
 M src/app/portals/public/components/step-date-picker/step-date-picker.component.ts
 M src/app/portals/public/components/step-doctor-service/step-doctor-service.component.ts
 M src/app/portals/public/components/step-doctor-service/step-doctor-service.component.scss
 M src/app/portals/public/services/booking-availability.service.ts
 M src/app/portals/staff/walk-in/staff-walk-in.page.ts
```

**Note:** Pre-existing modified files from the earlier Doctor Invite Services fix (`doctor-form.page.ts`, `admin-doctors.service.ts`, `activate-doctor-invite/index.ts`, production-readiness docs 00-10) are also in the working tree but not listed here.

---

## Deploy Commands

```bash
# 1. Fix ambiguous column first (quick fix)
# Open Supabase SQL Editor for project czswgpjjanllkmmwhmdh
# Run SUPABASE_RUN_GET_AVAILABLE_SLOTS_FIX.sql

# 2. Full availability fix (GRANTs + both RPCs)
# Run SUPABASE_RUN_BOOKING_AVAILABILITY_FIX.sql

# 3. RLS hardening (active-doctor policies)
# Run SUPABASE_REQUIRED_PUBLIC_DOCTOR_SCHEDULE_RLS_FIX.sql

# 4. Patient self-profile (nullable DOB/sex)
# Run SUPABASE_REQUIRED_PATIENT_SELF_PROFILE_RLS_FIX.sql

# 5. Commit frontend (when user says go)
cd "Z:\CLINIC\clinic_fe_supabase_phase2_booking_full"
git add .
git commit -m "fix: booking availability - GRANTs, RLS, ambiguous column, service UX, auto-select date"

# 5. Push frontend
git push
```

---

## Security Check

- No `service_role` key used in frontend
- No `.NET` endpoints
- No `MockDataService`
- RPC is `SECURITY DEFINER` with `SET search_path = public` (safe)
- All GRANTs are for `SELECT` only (read-only for anon/authenticated)

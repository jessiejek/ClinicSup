# 13_PATIENT_SOCIAL_LOGIN_BOOKING_AUDIT.md

**Date:** 2026-05-24 06:42 PDT
**Severity:** P0 — blocks all patient self-booking via social login

---

## Root Cause

Social-login (Google/Facebook) users who register as patients never get a row created in the `public.patients` table. The `auth.service.ts` method `ensurePatientRow()` had two bugs:

### Bug 1: Wrong column name
```typescript
// BEFORE (broken):
await this.supabase.from('patients').insert({
  ...
  contact_email: user.email,   // ❌ column "contact_email" does NOT exist on patients table
  is_guest: false,
});
```
The `patients` table has `email TEXT`, not `contact_email`. Supabase JS client simply ignores unknown columns — no error is thrown, no data is inserted.

### Bug 2: Missing NOT NULL columns
The `patients` table requires:
- `patient_code TEXT NOT NULL UNIQUE` — not provided, no default ❌
- `date_of_birth DATE NOT NULL` — not provided, no default ❌
- `sex TEXT NOT NULL` — not provided, no default ❌

The insert always fails with a PostgreSQL NOT NULL violation. The error was silently swallowed:
```typescript
if (insertError) {
  console.warn('Patient row insert skipped (non-blocking):', insertError.message);
}
```

### Impact Chain

1. Social login succeeds → `loadAuthUser()` runs → `ensurePatientRow()` → silent failure
2. User proceeds to booking → Step 6 submits → `create_booking` RPC called with `p_patient_id = NULL`
3. RPC evaluates: `v_current_patient_id := public.current_patient_id()`
4. `current_patient_id()` does `SELECT id FROM public.patients WHERE user_id = auth.uid()` → returns NULL
5. RPC checks: `IF v_patient_id IS NULL THEN RAISE EXCEPTION 'Patient is required.';`
6. User sees: `{"code": "P0001", "message": "Patient is required."}`

---

## Changes Made

### 1. `src/app/core/services/auth.service.ts`

#### Fix `ensurePatientRow()`

| Issue | Before | After |
|---|---|---|
| Column name | `contact_email: user.email` | `email: user.email` |
| Missing `patient_code` | Not provided | `PAT-${timestamp}${random}` via `Date.now().toString(36)` + random |
| Missing `date_of_birth` | Not provided | `'2000-01-01'` placeholder (until SQL makes column nullable) |
| Missing `sex` | Not provided | `'rather-not-say'` placeholder (until SQL makes column nullable) |
| Email lookup | `.eq('contact_email', user.email)` | `.eq('email', user.email)` |

#### Add public `ensurePatientRecord()` method

New public method that components can call on demand:
```typescript
async ensurePatientRecord(): Promise<void> {
  const { data: { user } } = await this.supabase.auth.getUser();
  if (!user) return;
  const profile = await this.loadProfile(user);
  const resolvedProfile = profile ?? await this.ensureProfileRow(user);
  await this.ensurePatientRow(user, resolvedProfile);
}
```

### 2. `src/app/core/services/auth-state.service.ts`

Added `ensurePatientRecord()` public method that delegates to `AuthService.ensurePatientRecord()`:
```typescript
async ensurePatientRecord(): Promise<void> {
  await this.authService.ensurePatientRecord();
}
```

### 3. `src/app/portals/public/components/step-payment/step-payment.component.ts`

`submitBooking()` now calls `ensurePatientRecord()` before `createBooking`:
```typescript
async submitBooking(): Promise<void> {
  // ... validation ...

  try {
    // Ensure the logged-in patient has a patients row so current_patient_id() resolves
    await this.authState.ensurePatientRecord();

    const booking = await firstValueFrom(this.bookingService.createBooking(payload));
    // ... rest of flow ...
  }
}
```

### 4. New SQL Handoff: `SUPABASE_REQUIRED_PATIENT_SELF_PROFILE_RLS_FIX.sql`

**Purpose:** Make `date_of_birth` and `sex` nullable so social-login patients don't need placeholder values.

**Contents:**
- `ALTER TABLE public.patients ALTER COLUMN date_of_birth DROP NOT NULL`
- `ALTER TABLE public.patients ALTER COLUMN sex DROP NOT NULL`
- GRANT SELECT/INSERT/UPDATE on `public.patients` TO `authenticated` (idempotent)
- DROP + CREATE policies for `patients_select_own`, `patients_insert_admin`, `patients_update_own`, `patients_delete_admin`
- Current `patients_insert_admin` already has `auth.uid() = user_id` check — no change needed
- `current_patient_id()` function verification (already correct)

---

## SQL Deploy Needed

Run `SUPABASE_REQUIRED_PATIENT_SELF_PROFILE_RLS_FIX.sql` in Supabase SQL Editor.

**Run this AFTER Phase 1 foundation SQL, BEFORE deploying new Edge Functions.**

---

## Without SQL Deploy

The frontend fix alone works because:
- Placeholder `date_of_birth = '2000-01-01'` satisfies NOT NULL constraint
- Placeholder `sex = 'rather-not-say'` satisfies NOT NULL constraint
- Patient can update their real DOB/sex later via profile edit

The SQL deploy is recommended to clean up the schema for proper social-login onboarding.

---

## Verification

After deploy, test:
1. Login with Google using a new email
2. Check browser console for "Patient row insert..." messages — should be absent (no error)
3. Navigate to `/public/booking?doctorId=...&serviceId=...`
4. Complete Steps 1-3, reach Step 6
5. Click "Confirm Booking"
6. Expected: ✅ Booking created successfully (no "Patient is required" error)

---

## Related Files

| File | Role |
|---|---|
| `src/app/core/services/auth.service.ts` | `ensurePatientRow()` fix + `ensurePatientRecord()` added |
| `src/app/core/services/auth-state.service.ts` | `ensurePatientRecord()` wrapper added |
| `src/app/portals/public/components/step-payment/step-payment.component.ts` | Calls `ensurePatientRecord()` before `createBooking` |
| `SUPABASE_REQUIRED_PATIENT_SELF_PROFILE_RLS_FIX.sql` | SQL handoff: nullable DOB/sex + GRANTs + RLS policies |
| `phase-01-foundation.sql` (lines 97-126, 369-390, 299-309) | Original `patients` table, policies, `current_patient_id()` |
| `phase-02-booking-workflow.sql` (lines 794-828) | `create_booking` RPC patient resolution logic |

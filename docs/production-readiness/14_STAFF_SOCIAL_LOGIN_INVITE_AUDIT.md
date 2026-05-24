# 14_STAFF_SOCIAL_LOGIN_INVITE_AUDIT.md

## Purpose

Audit and document the Staff Social Login Activation flow — Admin invites a staff member via email, who then activates their account by logging in with Google/Facebook.

## Status

**CODE COMPLETE** — NOT DEPLOYED (SQL + Edge Function not yet run in Supabase)

## Overview

| Item | Status | Notes |
|---|---|---|
| `staff_invites` table | ✅ SQL handoff created | `SUPABASE_REQUIRED_STAFF_INVITES_SQL.md` |
| `activate-staff-invite` Edge Function | ✅ Code written | `/supabase/functions/activate-staff-invite/index.ts` |
| Admin Add Staff → Invite flow | ✅ Code complete | `staff.page.ts` now inserts `staff_invites` |
| Auth callback staff check | ✅ Code complete | `auth-callback.page.ts` — `tryActivateStaffInvite()` |
| Staff redirect route | ✅ Confirmed | `/staff/dashboard` |
| StatusBadge "Invited" CSS | ✅ Added | `.badge--invited` in `status-badge.component.scss` |
| Build (npm run build) | ❌ NOT RUN YET | Must verify after all changes |

## Database: `staff_invites` Table

**File:** `SUPABASE_REQUIRED_STAFF_INVITES_SQL.md`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `email` | TEXT NOT NULL | Must not be blank |
| `full_name` | TEXT NOT NULL | Must not be blank |
| `phone` | TEXT NULL | Optional contact number |
| `status` | TEXT NOT NULL | `pending`, `accepted`, `revoked` (CHECK constraint) |
| `invited_by` | UUID NULL | FK → `auth.users(id)` |
| `accepted_user_id` | UUID NULL | FK → `auth.users(id)`, set on activation |
| `accepted_at` | TIMESTAMPTZ NULL | Set on activation |
| `created_at` | TIMESTAMPTZ | `DEFAULT now()` |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

**Indexes:**
- `idx_staff_invites_email_status` — `(lower(trim(email)), status)`
- `idx_staff_invites_pending_email` — UNIQUE on `(lower(trim(email)))` WHERE `status = 'pending'`

**RLS:** Admin-only policies (same pattern as `doctor_invites`)

## Edge Function: `activate-staff-invite`

**File:** `clinicbooking-be/supabase/functions/activate-staff-invite/index.ts`

**Flow:**
1. Validate caller via anon client from `Authorization: Bearer` header
2. Extract caller email and user ID
3. Query `staff_invites` for `WHERE status = 'pending' AND email = callerEmail`
4. If no match → return `{ activated: false, role: null }` (safe, not an error)
5. If match found:
   - Upsert profile row (`profiles` table)
   - Upsert staff role (`user_roles` with `role = 'staff'`)
   - Mark invite as `accepted` with `accepted_user_id` and `accepted_at`
6. Return `{ activated: true, role: 'staff' }`

**Idempotency:**
- Profile upsert uses `onConflict: 'id'` — safe for re-runs
- Role upsert uses `onConflict: 'user_id, role'` — won't duplicate
- Invite update is `eq('id', invite.id)` — only updates the specific invite row

## Admin Staff Page Changes

**File:** `src/app/portals/admin/staff/staff.page.ts`

### What changed:
- **Invite-based flow:** "Add Staff" now inserts a `staff_invites` pending record instead of calling `create-staff` Edge Function
- **Password removed:** No password field — staff activate via social login
- **Phone optional field:** Added phone to invite
- **Pending invites shown in table:** Loads both activated staff (from `profiles` + `user_roles`) and pending invites (from `staff_invites`)
- **"Invited" status badge:** Staff invites display as "Invited" status
- **Revoke action:** Admins can revoke pending invitations
- **No fake success:** Real Supabase errors displayed as error toasts

### Staff table rows (mixed sources):
- Active/Inactive staff from `profiles` (status column) via `user_roles` lookup
- Pending invites from `staff_invites` table
- Accepted invites excluded (already merged into activated staff)

## Auth Callback Changes

**File:** `src/app/auth/callback/auth-callback.page.ts`

The callback now tries both invite types in sequence:

```
1. Supabase session obtained
2. loadAuthUser() runs (creates profile, assigns role, creates patient row if patient)
3. If role === 'Patient':
   a. tryActivateDoctorInvite(accessToken)
      → If activated → redirect to /doctor/dashboard
   b. tryActivateStaffInvite(accessToken)    ← NEW
      → If activated → redirect to /staff/dashboard
4. If still Patient → persist user → navigateByRole(patient)
```

**Safety:**
- Doctor and staff checks only run if current role is `Patient` (prevents double-activation)
- Both are wrapped in try/catch (non-fatal)
- `activate-staff-invite` only runs after doctor activation check returns match `false`

## Redirect Route Confirmed

| Role | Route |
|---|---|
| Staff | `/staff/dashboard` (core/routes.ts confirmed) |
| Doctor | `/doctor/dashboard` |
| Admin | `/admin/dashboard` |
| Patient | `/patient/dashboard` |

## Regression Checks

| Scenario | Expected | Risk |
|---|---|---|
| Doctor invited email login | Doctor activated, redirect to `/doctor/dashboard` | LOW — doctor check runs FIRST; staff check only runs if doctor fails |
| Patient social-login booking | Patient row created, role = Patient | LOW — staff check only runs if role is Patient, and returns `{activated: false}` if no match |
| Admin login | Goes to `/admin/dashboard` | NONE — admin role is already set from existing user_roles |
| Staff login with invited email | Staff activated, redirect to `/staff/dashboard` | NEW FLOW — must test |

## Deploy Steps

1. Run `SUPABASE_REQUIRED_STAFF_INVITES_SQL.md` in Supabase SQL Editor
2. Deploy `activate-staff-invite` Edge Function:
   ```
   cd "Z:\CLINIC\clinicbooking-be"
   supabase functions deploy activate-staff-invite
   ```
3. Run `npm run build` and verify
4. Commit and push

## Test Steps

1. Admin goes to `/admin/staff` → "Invite Staff"
2. Enter staff name + email → "Send Invite"
3. Verify invite appears in table with "Invited" badge
4. Open incognito → Google login with that email
5. Should redirect to `/staff/dashboard`
6. Go back to admin → staff table should show active staff member
7. Verify doctor invite still works (separate email)
8. Verify patient social-login still creates patient row

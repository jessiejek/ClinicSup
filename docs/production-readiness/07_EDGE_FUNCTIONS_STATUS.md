# 07_EDGE_FUNCTIONS_STATUS.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# Edge Functions Status

---

## Function: `create-staff`

| Property | Detail |
|---|---|
| **File** | `clinicbooking-be/supabase/functions/create-staff/index.ts` |
| **Deployed** | ✅ Yes (2026-05-24) |
| **Last deploy method** | `supabase functions deploy create-staff` |
| **Environment secrets** | `SUPABASE_URL` (auto), `SUPABASE_ANON_KEY` (auto), `SUPABASE_SERVICE_ROLE_KEY` (must be set manually) |

### Auth Validation (after latest fix)

1. **Reads** `Authorization` header — returns 401 if missing
2. **Strips** `Bearer ` prefix
3. **Validates** token via `anonClient.auth.getUser(token)`
4. **Creates** admin client with service_role key — falls back to `SERVICE_ROLE_KEY` env var
5. **Queries** `user_roles` — normalizes role to lowercase
6. **Checks** for `admin` or `super_admin`
7. **Returns** 403 with caller's userId if role check fails

### Risks

| Risk | Likelihood | Impact |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` not set | Medium | Returns 500 "Edge Function service role is not configured." |
| `SERVICE_ROLE_KEY` not set as fallback | Medium | Same as above — check both env var names |
| CORS preflight failure | Low (tested) | Function handles OPTIONS correctly |
| Token expired during role check | Low | User sees 401 and can re-login |

---

## Function: `update-staff-status`

| Property | Detail |
|---|---|
| **File** | `clinicbooking-be/supabase/functions/update-staff-status/index.ts` |
| **Deployed** | ✅ Yes (2026-05-24) |
| **Last deploy method** | `supabase functions deploy update-staff-status` |

Same auth pattern as `create-staff`. Additionally:
- Supports `action: 'ban' | 'unban'`
- Uses `adminClient.auth.admin.updateUserById()` for ban
- Updates `profiles.status` column (gracefully handles missing column)

---

## CORS Helper

**File:** `clinicbooking-be/supabase/functions/_shared/cors.ts`

| Property | Value |
|---|---|
| `Access-Control-Allow-Origin` | `*` |
| `Access-Control-Allow-Methods` | `POST, GET, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type, Authorization` |
| **Missing:** `x-client-info` | ⚠️ Supabase JS client sends this header. Not including it may cause preflight warnings but won't block requests. |

**Deploy status:** The `cors.ts` file is uploaded alongside each function deployment (both functions include it in the deploy bundle).

---

## Function: `activate-doctor-invite`

| Property | Detail |
|---|---|
| **File** | `clinicbooking-be/supabase/functions/activate-doctor-invite/index.ts` |
| **Deployed** | ❌ **NOT DEPLOYED** |
| **Last deploy method** | Not yet deployed |
| **Environment secrets** | `SUPABASE_URL` (auto), `SUPABASE_ANON_KEY` (auto), `SUPABASE_SERVICE_ROLE_KEY` (must be set) |

### Auth Validation

1. Reads `Authorization: Bearer <token>` header — returns 401 if missing
2. Validates JWT via `anonClient.auth.getUser(token)`
3. Gets caller email from auth user, normalizes to lowercase
4. Gets service role key with fallback (`SERVICE_ROLE_KEY`)
5. Queries `doctor_invites WHERE status='pending' AND email=<email>`
6. No pending invite → returns `{ activated: false }` HTTP 200 (not an error)
7. Pending invite found → upserts profile, user_roles, doctors rows
8. Marks invite as accepted
9. Returns `{ activated: true, role: 'doctor', doctorId }`

### Prerequisites

- `doctor_invites` table must be deployed from `SUPABASE_REQUIRED_DOCTOR_INVITES_SQL.md`
- `schedule` JSONB column must exist on `doctor_invites` (ALTER TABLE from `SUPABASE_REQUIRED_DOCTOR_PORTAL_SCHEDULE_FIX_SQL.md`)
- `SUPABASE_SERVICE_ROLE_KEY` secret must be set (or `SERVICE_ROLE_KEY` as fallback)

### Schedule Creation

After upserting the `doctors` row, the Edge Function now reads `invite.schedule` (JSONB array of `{ dayOfWeek, startTime, endTime }`) and inserts corresponding rows into `public.doctor_schedules`. This ensures the admin-set schedule survives the invite → activation flow. If the schedule array is empty or missing, no `doctor_schedules` rows are created (doctor can set them manually later).

### Services Creation (new in latest update)

After creating `doctor_schedules`, the Edge Function now reads `invite.service_ids` (JSONB array of UUID strings) and inserts corresponding rows into `public.doctor_services` using `.upsert({ onConflict: 'doctor_id, service_id', ignoreDuplicates: true })`. This ensures the admin-selected services are linked to the activated doctor. If `service_ids` is empty or missing, no `doctor_services` rows are created.

## Git vs Deployed State Comparison

| Item | Local Code | Deployed | Notes |
|---|---|---|---|
| `create-staff/index.ts` | ✅ Updated (explicit auth, role normalization, service_role fallback) | ✅ Deployed | Both in sync |
| `update-staff-status/index.ts` | ✅ Updated (same auth pattern) | ✅ Deployed | Both in sync |
| `activate-doctor-invite/index.ts` | ✅ Updated (doctor_schedules creation + schedule fix) | ❌ **NOT DEPLOYED** | New Edge Function + schedule fix |
| `cors.ts` | ✅ No `x-client-info` header | ✅ Deployed | Deployed alongside functions |
| `staff.page.ts` (frontend) | ✅ Committed (`d6ffeb1`) | ✅ Committed/pushed | Auth fix committed |
| `auth-callback.page.ts` (frontend) | ✅ Committed (`d6ffeb1`) | ✅ Committed/pushed | Doctor activation check committed |
| `doctor-form.page.ts` (frontend) | ✅ Updated (passes schedule in invite) | ⚠️ Uncommitted update | Schedule fix needs separate commit |
| `admin-doctors.service.ts` (frontend) | ✅ Updated (schedule in CreateDoctorInviteDto + payload) | ⚠️ Uncommitted update | Schedule fix needs separate commit |

---

## Deployment Commands

```bash
cd "Z:\CLINIC\clinicbooking-be"

# Deploy existing functions (re-deploy if changed)
supabase functions deploy create-staff
supabase functions deploy update-staff-status

# Deploy new doctor activation function
supabase functions deploy activate-doctor-invite
```

## Set Service Role Key (if not already set)

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<paste-key-here>
supabase secrets set SERVICE_ROLE_KEY=<paste-key-here>
```

---

## What to Verify in Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/czswgpjjanllkmmwhmdh/functions
2. Check `create-staff` → Logs → Invoke it with a test admin JWT
3. Check `update-staff-status` → Logs → Invoke with a test admin JWT
4. Check `activate-doctor-invite` → Logs → Invoke with a test doctor email
5. **Verify** environment secrets are set in Settings → API

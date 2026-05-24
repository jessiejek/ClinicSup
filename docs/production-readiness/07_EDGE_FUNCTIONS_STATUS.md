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

## Git vs Deployed State Comparison

| Item | Local Code | Deployed | Notes |
|---|---|---|---|
| `create-staff/index.ts` | ✅ Updated (explicit auth, role normalization, service_role fallback) | ✅ Deployed | Both in sync |
| `update-staff-status/index.ts` | ✅ Updated (same auth pattern) | ✅ Deployed | Both in sync |
| `cors.ts` | ✅ No `x-client-info` header | ✅ Deployed | Deployed alongside functions |
| `staff.page.ts` (frontend) | ✅ Updated (explicit JWT header) | ❌ **NOT COMMITTED/PUSHED** | Unstaged changes. Vercel still serves old code. |

---

## Deployment Commands (for re-deploy)

```bash
cd "Z:\CLINIC\clinicbooking-be"
supabase functions deploy create-staff
supabase functions deploy update-staff-status
```

## Set Service Role Key (if needed)

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<paste-key-here>
supabase secrets set SERVICE_ROLE_KEY=<paste-key-here>
```

---

## What to Verify in Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/czswgpjjanllkmmwhmdh/functions
2. Check `create-staff` → Logs → Invoke it with a test admin JWT
3. Check `update-staff-status` → Logs → Invoke with a test admin JWT
4. **Verify** environment secrets are set in Settings → API

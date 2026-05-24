# 01_ADMIN_ADD_STAFF_AUDIT.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# Admin Add Staff — Full End-to-End Audit

---

## Frontend: Staff Page

**File:** `src/app/portals/admin/staff/staff.page.ts`

### Add Staff Flow (inline form)

1. User clicks "Add Staff" button → `openAddStaffForm()` is called
   - Resets `draft` (fullName, email, password) and `addError`
   - Sets `showAddStaffForm = true`

2. User fills form and submits → `save()` is called

3. **Explicit JWT flow** (added in latest fix):
   ```
   const { data: sessionData } = await this.supabase.client.auth.getSession();
   const accessToken = sessionData?.session?.access_token;
   if (!accessToken) → show "Your admin session expired. Please log in again." → return
   ```

4. **Body payload** sent:
   ```
   { fullName: string, email: string, password?: string }
   ```

5. **Explicit Authorization header**:
   ```
   headers: { Authorization: `Bearer ${accessToken}` }
   ```

6. Edge Function invoked via `supabase.client.functions.invoke('create-staff', { body, headers })`

7. On success: hide form, reload staff list, show success toast
8. On error: show error inline in form + error toast

### Toggle flow (Deactivate/Reactivate)

Same explicit JWT flow via `update-staff-status` Edge Function with explicit `Authorization` header.

---

## create-staff Edge Function

**File:** `clinicbooking-be/supabase/functions/create-staff/index.ts`

### Auth flow (after latest fix):
1. Read `Authorization` header — return 401 if missing
2. Strip `Bearer` prefix → call `anonClient.auth.getUser(token)`
3. Return 401 if user invalid/expired
4. Get `serviceRoleKey` with fallback: `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')`
5. Return 500 if no service role key configured
6. Query `user_roles` for caller — normalize roles: `String(role).toLowerCase()`
7. Return 403 with caller's userId if not admin/super_admin

### Create flow:
1. Validate input (email + fullName required)
2. Auto-generate password if not provided: `crypto.randomUUID().slice(0, 12)`
3. Create auth user via `adminClient.auth.admin.createUser()`
4. Upsert profile via `adminClient.from('profiles').upsert()`
5. Insert staff role via `adminClient.from('user_roles').insert()`
6. If role insert fails: delete auth user (rollback), return 500
7. Return safe response (no password, no secrets)

---

## update-staff-status Edge Function

**File:** `clinicbooking-be/supabase/functions/update-staff-status/index.ts`

Identical auth pattern to create-staff. Additionally:
- Supports `action: 'ban' | 'unban'`
- Uses `adminClient.auth.admin.updateUserById()` with `ban_duration`
- Updates `profiles.status` column (non-fatal if column missing)

---

## CORS Helper

**File:** `clinicbooking-be/supabase/functions/_shared/cors.ts`

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Note:** Does NOT include `x-client-info` header. This is not a problem for admin page usage but may cause warnings if the Supabase client library sends that header. Safe as-is for this use case.

---

## Deployment Status

| Item | Status |
|---|---|
| Frontend staff.page.ts fix (explicit JWT) | ✅ Code updated, **NOT committed or pushed** (unstaged) |
| create-staff edge function | ✅ Deployed (2026-05-24) |
| update-staff-status edge function | ✅ Deployed (2026-05-24) |
| Frontend build | ✅ Passed (0 errors) |

---

## Live Test Checklist

- [ ] 1. Open `https://clinic-sup.vercel.app/admin/staff` (hard refresh Ctrl+F5)
- [ ] 2. Login as admin if not already logged in
- [ ] 3. Open browser DevTools → Network tab → filter XHR/Fetch
- [ ] 4. Click **Add Staff** button
- [ ] 5. **Verify:** Inline form slides in (no modal/popup)
- [ ] 6. Fill in: Full Name, Email, Temporary Password
- [ ] 7. Click **Create Staff**
- [ ] 8. **Verify Network tab:** Look for `create-staff` request
- [ ] 9. **Verify:** `Authorization: Bearer <token>` header present
- [ ] 10. **Verify response:**

| Status | Meaning | Action |
|---|---|---|
| **200** | Success — staff created | Verify form closes + reloads list + toast shows |
| **401** | Missing/invalid Authorization header | Check frontend session, check Edge Function deployed |
| **403** | Not admin/super_admin | Check user_roles table in Supabase dashboard |
| **409** | Email already registered | Use different email or check Auth users |
| **500** | Service role key not configured | Check Supabase secrets → set `SUPABASE_SERVICE_ROLE_KEY` or `SERVICE_ROLE_KEY` |
| **CORS error** | Edge Function response missing CORS headers | Check Edge Function logs in Supabase dashboard |

- [ ] 11. **Test toggle:** Click Deactivate on a staff member
- [ ] 12. **Verify:** `update-staff-status` request has `Authorization` header
- [ ] 13. **Verify:** Staff status changes from Active → Inactive

---

## Known Live Issue and Whether Fixed

**Symptom:** "Add Staff" button in admin page does nothing, or create-staff silently fails.

**Root cause (first fix):** `ion-modal` was unreliable — replaced with inline form card. This got the button working but the Edge Function still failed.

**Root cause (second fix):** `supabase.functions.invoke()` does not reliably auto-inject the `Authorization` header on deployed Vercel. Fixed by explicitly passing the JWT in headers.

**Current status:** Code is fixed, deployed, but **not live-tested yet**. The Edge Functions were also redeployed with better auth validation.

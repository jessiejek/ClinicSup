# 08_BUILD_AND_SECURITY_SCAN.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# Build & Security Scan

---

## npm run build Result

```
Build at: 2026-05-24T09:22:49.017Z
Hash: 047b08094a279114
Time: 26298ms
✔ Browser application bundle generation complete
✔ Copying assets complete
✔ Index html generation complete
Errors: 0
Warnings: All pre-existing (SCSS budgets exceeded; Ionic pseudo-class selectors)
```

**Staff page chunk:** `3028.ebecce10ab37cc03.js` (17.64 kB)

---

## Security Scans

### service_role in Frontend

**Search:** `service_role|SERVICE_ROLE_KEY|service_role_key` across all `.ts` files

| Result | Detail |
|---|---|
| **PASS** | Zero occurrences of `service_role` in frontend code |
| **PASS** | Zero occurrences of `SERVICE_ROLE_KEY` in frontend code |
| **PASS** | Only uses `SUPABASE_ANON_KEY` from environment files |

### service_role in Edge Functions

| File | Usage |
|---|---|
| `create-staff/index.ts` | ✅ Uses `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')` — server-side only |
| `update-staff-status/index.ts` | ✅ Same pattern — server-side only |

---

### localhost outside env Files

**Search:** `localhost` across all `.ts` files (excluding `.spec.ts`)

| Result | Detail |
|---|---|
| **PASS** | Only found in `environment.ts` (dev) — `https://localhost:44384/api` |
| **PASS** | Not present in `environment.prod.ts` (production) |
| **PASS** | Not present in any other source file |

---

### .NET Endpoint Strings

**Search:** `clinicbooking.azurewebsites|\.net/api|apiBaseUrl` across all `.ts` files

| Result | Detail |
|---|---|
| **PASS** | No `.azurewebsites` or `.net/api` endpoints found |
| **PASS** | `environment.apiBaseUrl` is **empty string** in production |
| **NOTE** | `booking.service.ts` still has dead `buildBookingParams()` etc. that build `HttpParams` — these are **never called** at runtime |

---

### MockDataService Scan Summary

| Result | Detail |
|---|---|
| **PASS** | Walk-in page, booking service, medical records, prescriptions all use Supabase |
| **1 LIVE CONSUMER** | `admin-settings.service.ts` in settings page — NOT migrated |
| **PASS** | No other page imports MockDataService |

---

### ApiService Scan Summary

| Result | Detail |
|---|---|
| **PASS** | No live caller uses ApiService for data |
| **DEAD CODE** | `booking.service.ts` still injects `ApiService` but never calls it in production flow |
| **SAFE** | Deprecated service with no functional impact |

---

### SignalR Scan Summary

| Result | Detail |
|---|---|
| **PASS** | No consumer calls `ensureConnected()` or subscribes to `events$` |
| **DEAD CODE** | `clinic-dashboard-realtime.service.ts` is a no-op in production (`apiBaseUrl` is empty) |
| **DEPENDENCY** | `@microsoft/signalr` in `package.json` — unused |

---

## Live Deployment Alignment

| Item | Status |
|---|---|
| Latest frontend commit | `f224acd` (committed, pushed) |
| Staff page fix (explicit JWT) | ❌ **NOT committed/pushed** — Vercel serves old code |
| Edge Function create-staff | ✅ Deployed (deployed directly via CLI) |
| Edge Function update-staff-status | ✅ Deployed (deployed directly via CLI) |
| Vercel deployment | ⚠️ **May be stale** — only files up to commit `f224acd` are deployed. The staff.page.ts fix is NOT in that commit. |

**Risk:** The frontend code that explicitly passes `Authorization` header is **NOT live on Vercel**. The deployed version still uses the old `supabase.functions.invoke()` without explicit headers. The Edge Functions are updated, but without the frontend JWT fix:
- If `supabase.functions.invoke()` auto-injects the token (which it should in theory), it will work
- If it doesn't auto-inject, the updated Edge Functions will return 401 "Missing Authorization header"

**Recommendation:** Commit and push the frontend fix to Vercel before testing live.

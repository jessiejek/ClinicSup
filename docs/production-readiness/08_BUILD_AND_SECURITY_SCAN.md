# 08_BUILD_AND_SECURITY_SCAN.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# Build & Security Scan

---

## npm run build Result

```
Build at: 2026-05-24T12:34:05.228Z
Hash: 5ec26e21fdd42a06
Time: 23675ms
Errors: 0
Warnings: All pre-existing (SCSS budgets exceeded; Ionic pseudo-class selectors)
```

**Doctor form chunk:** `2684.e25923a82684625c.js` (19.70 kB) *
**Doctor form chunk (inline):** `7763.92e5854a5ca2491a.js` (11.32 kB) *
**Staff page chunk:** `3028.ebecce10ab37cc03.js` (17.64 kB)

*Doctor form now two chunks due to AdminServicesService lazy import

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
| Doctor invite feature (auth-callback, doctor-form, admin-doctors service) | ❌ **NOT committed/pushed** |
| Edge Function create-staff | ✅ Deployed (deployed directly via CLI) |
| Edge Function update-staff-status | ✅ Deployed (deployed directly via CLI) |
| Edge Function activate-doctor-invite | ❌ **NOT deployed** |
| Vercel deployment | ⚠️ **May be stale** — only files up to commit `f224acd` are deployed. |

**Risk:** Multiple frontend files are not committed/pushed. All new features exist only locally.

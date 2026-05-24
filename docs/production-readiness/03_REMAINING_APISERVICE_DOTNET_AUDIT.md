# 03_REMAINING_APISERVICE_DOTNET_AUDIT.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# Remaining ApiService / .NET Endpoint Audit

---

## ApiService Service File

**File:** `src/app/core/services/api.service.ts`

**Status:** DEAD CODE — SAFE TO REMOVE LATER

- Injected: `HttpClient`, `environment.apiBaseUrl`
- In **production** (`environment.prod.ts`): `apiBaseUrl: ''` — all calls go to empty string
- Every method (get, post, put, patch, delete, getBlob) returns an Observable
- `@deprecated` decorator present
- `buildUrl()` falls back to empty string in production

---

## Consumers Found

Searched all `.ts` files (excluding `.spec.ts`, `node_modules`, `.angular`, `dist`).

### Classification

| Consumer | File | Classification |
|---|---|---|
| `ApiService` import + injection | `src/app/core/services/booking.service.ts` | **DEAD CODE** — all actual data flows go through Supabase. The `apiService` field is injected but only used in dead fallback methods (`requestBookingList`, `requestMyBookingsPage`, `createBookingLike`). These methods are **not called** by any consumer in the app. |
| `ApiService` import | `src/app/core/services/api.service.ts` | N/A — definition file |
| `environment.apiBaseUrl` in production | `src/environments/environment.prod.ts` | **EMPTY** — `apiBaseUrl: ''` |
| `environment.apiBaseUrl` in dev | `src/environments/environment.ts` | **LOCAL ONLY** — `apiBaseUrl: 'https://localhost:44384/api'` only used for local dev if someone starts the old .NET backend |

---

## Dead .NET Endpoint Strings Found

Searched for `clinicbooking.azurewebsites`, `.net/api`, and similar patterns: **None found.**

The `booking.service.ts` still has `buildBookingParams()`, `buildStaffTodayParams()`, `buildStaffBookingsParams()` functions that build `HttpParams` objects — these are used by the dead `requestBookingList()` methods.

---

## Verdict

| Classification | Count | Action |
|---|---|---|
| LIVE BLOCKER | 0 | — |
| DEAD CODE | 2 | `ApiService` itself + `apiService` injection in `booking.service.ts` |
| LOW RISK | 0 | — |
| SAFE TO REMOVE LATER | 2 | Remove `ApiService` + `apiService` from booking service + dead params builders |

### Why Not Remove Immediately

- The `ApiService` is still technically available and removing it could break imports if another file references it
- The dead methods in `booking.service.ts` don't cause harm — they're simply never called
- Removing dead code is Phase N+O priority — not a P0

### To Remove Later

1. Delete `src/app/core/services/api.service.ts`
2. Remove `ApiService` import and inject from `booking.service.ts`
3. Remove dead methods: `requestBookingList()`, `requestMyBookingsPage()`, `createBookingLike()`, `normalizeCreateBookingRequest()`, all `build*Params()` functions
4. Remove `HttpClient`, `HttpParams`, `HttpErrorResponse` imports from booking.service.ts
5. Remove `apiBaseUrl` from `environment.ts` and `environment.prod.ts` (after confirming no other consumer)

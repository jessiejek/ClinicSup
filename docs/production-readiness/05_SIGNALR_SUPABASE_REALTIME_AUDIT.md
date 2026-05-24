# 05_SIGNALR_SUPABASE_REALTIME_AUDIT.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# SignalR / Supabase Realtime Audit

---

## SignalR Service File

**File:** `src/app/core/services/clinic-dashboard-realtime.service.ts`

**Status:** DEAD CODE — SAFE TO REMOVE LATER

### How it works (currently)

- Creates a `@microsoft/signalr` `HubConnection` to the old .NET backend
- Listens for 10 event types: BookingCreated, BookingCancelled, PatientCheckedIn, etc.
- Injects `AuthStateService` and `TokenService`
- Constructor checks `environment.apiBaseUrl` — if empty (production), the whole service is a no-op
- `ensureConnected()` and `disconnect()` methods exist but are **never called**

### Consumers Found

Searched across all `.ts` files (excluding `node_modules`, `.angular`, `dist`, `.spec.ts`).

| Consumer | Method | Status |
|---|---|---|
| `clinic-dashboard-realtime.service.ts` | Injected by Angular DI (providedIn: 'root') | DEAD — no consumer calls `ensureConnected()` or subscribes to `events$` |
| No file calls `start()`, `connect()`, `disconnect()`, `ensureConnected()` | — | Confirmed — zero consumers |
| `@microsoft/signalr` package | Listed in `package.json` | DEAD — not used anywhere |

---

## Supabase Realtime Replacement Plan

**Do not implement now. This is a future enhancement.**

### Why not now

- The app works without real-time updates — users refresh the page to see changes
- Supabase Realtime requires enabling the Realtime API on specific tables
- WebSocket connections cost resources on the Supabase project
- The free tier Supabase project may have Realtime disabled or limited

### What to do later

1. Enable Supabase Realtime on the Supabase dashboard for:
   - `bookings` table (new bookings, status changes)
   - `payments` table (payment confirmed)
   - `patients` table (profile updates)
2. Remove `@microsoft/signalr` from `package.json`
3. Delete `clinic-dashboard-realtime.service.ts`
4. Use Supabase's built-in Realtime channel API:

```typescript
const channel = supabase
  .channel('booking-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'bookings' },
    (payload) => {
      // Handle booking insert/update/delete
    }
  )
  .subscribe();
```

5. Create a lightweight `ClinicRealtimeService` with the same event interface but powered by Supabase channels.

---

## Dependency

| Package | Version (package.json) | Usage |
|---|---|---|
| `@microsoft/signalr` | Present | Only used by `ClinicDashboardRealtimeService` — dead code |

---

## Verdict

| Classification | Count | Action |
|---|---|---|
| LIVE BLOCKER | 0 | — |
| DEAD CODE | 1 service + 1 npm dependency | Remove after confirmation |
| LOW RISK | 0 | — |
| SAFE TO REMOVE LATER | Yes | Part of Phase O cleanup |

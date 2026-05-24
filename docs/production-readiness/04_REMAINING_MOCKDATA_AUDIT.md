# 04_REMAINING_MOCKDATA_AUDIT.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# Remaining MockDataService Audit

---

## Mock Data Service File

**File:** `src/app/core/services/mock-data.service.ts`

**Status:** LARGELY DEAD — 1 LIVE CONSUMER REMAINING

The service file is 900+ lines with comprehensive mock data for:
- Patients, doctors, services, bookings, consultations, prescriptions
- Allergies, vaccinations, lab requests, lab results, follow-ups
- Notifications, announcements, reviews, audit logs
- Clinic settings, payment settings, reports
- Drug list, seed users
- ALL the mutation methods (save, cancel, confirm, mark complete, etc.)

---

## Import Consumers Found

### LIVE BLOCKER

| Consumer | File | Impact |
|---|---|---|
| `MockDataService` import | `src/app/portals/admin/settings/settings.page.ts` | **LIVE BLOCKER** — The settings page imports `MockDataService` and uses it for clinic settings operations. This must be migrated to Supabase. |

### DEAD CODE — SAFE TO REMOVE LATER

All other pages that previously imported `MockDataService` have already been migrated. The following mock data files still exist but are **unused**:

- `src/app/core/mock-data/mock-announcements.data.ts`
- `src/app/core/mock-data/mock-bookings.data.ts`
- `src/app/core/mock-data/mock-clinic-settings.data.ts`
- `src/app/core/mock-data/mock-doctors.data.ts`
- `src/app/core/mock-data/mock-medical-records.data.ts`
- `src/app/core/mock-data/mock-notifications.data.ts`
- `src/app/core/mock-data/mock-patients.data.ts`
- `src/app/core/mock-data/mock-reports.data.ts`
- `src/app/core/mock-data/mock-reviews.data.ts`
- `src/app/core/mock-data/mock-services.data.ts`
- `src/app/core/mock-data/mock-users.data.ts`

---

## Per-Phase Removal Recap

| Phase | Target | Status |
|---|---|---|
| A | Bookings page | ✅ Removed |
| B | Calendar | ✅ Removed |
| C | Dashboard | ✅ Removed |
| D | Patients | ✅ Removed |
| E | Services | ✅ Removed |
| F | Reports | ✅ Removed |
| G | Notifications | ✅ Removed |
| H | Audit logs | ✅ Removed |
| I | Announcements | ✅ Removed |
| J | Reviews | ✅ Removed |
| K | Admin walk-in | ✅ Removed |
| L | Medical records | ✅ Removed |
| M | Prescription components | ✅ Removed |
| N | **Settings page** | ❌ **NOT DONE** — 1 live consumer remains |
| O | Dead code cleanup | ❌ NOT DONE |

---

## Verdict

| Classification | Count | Action |
|---|---|---|
| LIVE BLOCKER | 1 | `admin-settings.service.ts` → move to Supabase |
| DEAD CODE | 11 mock data files + service | Delete all mock data files + service after migration |
| LOW RISK | 0 | — |
| SAFE TO REMOVE LATER | 11+ files | After Phase N is done |

### To Remove All Mock Data Later

1. Migrate `admin-settings.service.ts` to Supabase (Phase N)
2. Delete `mock-data.service.ts`
3. Delete all 11 mock data files in `src/app/core/mock-data/`
4. Remove `MockDataService` import from `settings.page.ts`

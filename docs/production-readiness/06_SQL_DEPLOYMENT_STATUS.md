# 06_SQL_DEPLOYMENT_STATUS.md

Use this file as the source of truth for this area. Future agents should read this file before scanning the repo.

# SQL Deployment Status

---

## Already Deployed

| SQL / Migration | Status | Notes |
|---|---|---|
| Phase 1 Foundation (`phase-01-foundation.sql`) | ✅ Deployed | Core schema: clinics, profiles, patients, doctors, services, user_roles, bookings, etc. |
| Phase 2 Booking Workflow (`phase-02-booking-workflow.sql`) | ✅ Deployed | RPCs: create_booking, confirm_booking, cancel_booking, check_in_booking, save_consultation_record, record_payment, etc. Views: patient_bookings_view, doctor_today_queue_view, staff_today_queue_view, consultation_record_view |
| `audit_logs` table | ✅ Deployed | Audit logging for all entity changes |
| `announcements` table | ✅ Deployed | Public announcements (user-deployed from SUPABASE_REQUIRED_ANNOUNCEMENTS_SQL.md) |
| `reviews` table | ✅ Deployed | Patient reviews (user-deployed from SUPABASE_REQUIRED_REVIEWS_SQL.md) |
| `profiles.status` column | ✅ Deployed | Staff active/inactive status for toggle |

---

## Need Deploy

### 1. Notifications Table

**File:** `SUPABASE_REQUIRED_NOTIFICATIONS_SQL.md`

| Field | Detail |
|---|---|
| Status | ❌ NOT DEPLOYED |
| Reason Needed | Notification bell and panel show data. Currently the service queries `notifications` table which doesn't exist → errors. |
| Risk | **Low** — creates new table, no existing data affected |
| Safe to run as-is? | ✅ Yes — CREATE TABLE + indexes + RLS + policies. No destructive changes. |
| Priority | P2 — Notifications are cosmetic, not blocking |

### 2. Medical Records Tables (allergies + vaccination_records)

**File:** `SUPABASE_REQUIRED_MEDICAL_RECORDS_SQL.md`

| Field | Detail |
|---|---|
| Status | ❌ NOT DEPLOYED |
| Reason Needed | Allergies and vaccination records pages return empty arrays with console.warn. Write operations reject with errors. |
| Risk | **Low** — creates new tables, no existing data affected |
| Safe to run as-is? | ✅ Yes — CREATE TABLE + indexes + triggers + RLS + policies |
| Priority | P2 — Not blocking core booking workflow |

### 3. Medication Master Table

**File:** `SUPABASE_REQUIRED_MEDICATION_MASTER_SQL.md`

| Field | Detail |
|---|---|
| Status | ❌ NOT DEPLOYED |
| Reason Needed | Prescription builder uses static local drug list. This table would replace it. |
| Risk | **Low** — creates new table + seed data |
| Safe to run as-is? | ✅ Yes — CREATE TABLE + RLS + seed INSERT |
| Priority | P3 — Local static list works for now |

### 4. Walk-in/Bookings RLS Policies (If Missing)

| Field | Detail |
|---|---|
| Status | ⚠️ NEEDS REVIEW |
| Reason Needed | If admin/staff walk-in booking fails due to RLS, additional policies for `bookings` INSERT need to be added. |
| Risk | **Medium** — adding policies to an existing table. Must use correct role checks. |
| Safe to run as-is? | ❌ Needs audit first — check existing `bookings` policies in Supabase dashboard |
| Priority | P0 conditional — only if walk-in booking fails |

---

## Deployment Order

```
1. [If needed] Fix bookings RLS policies              ← P0 conditional
2. SUPABASE_REQUIRED_NOTIFICATIONS_SQL.md              ← P2
3. SUPABASE_REQUIRED_MEDICAL_RECORDS_SQL.md            ← P2
4. SUPABASE_REQUIRED_MEDICATION_MASTER_SQL.md          ← P3
```

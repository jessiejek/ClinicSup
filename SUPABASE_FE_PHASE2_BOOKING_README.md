# Supabase FE Phase 2 — Booking Creation

## What changed

This phase migrates patient booking creation and patient booking reads from the old ASP.NET API flow to Supabase.

Changed file:

- `src/app/core/services/booking.service.ts`

## Supabase objects used

- RPC: `create_booking`
- RPC: `cancel_booking`
- View: `patient_bookings_view`

## Covered flows

- Public booking wizard creates a booking through `create_booking`.
- My Bookings reads from `patient_bookings_view`.
- Patient booking detail reads from `patient_bookings_view`.
- Patient cancel action uses `cancel_booking`.

## Important test note

A user must have a matching row in `public.patients` for normal patient booking.

For a patient account, `patients.user_id` must equal `auth.users.id`.

If testing with the `jessiejayr@gmail.com` super_admin account, create or link a patient row to that same auth user before testing patient booking creation, otherwise the RPC will correctly return `PatientId is required.`

Example SQL for local/dev testing only:

```sql
insert into public.patients (
  patient_code,
  user_id,
  first_name,
  last_name,
  date_of_birth,
  sex,
  email,
  is_guest
)
select
  'PAT-JESSIE-001',
  u.id,
  'Jessie Jay',
  'Rubi',
  '1990-01-01',
  'Male',
  u.email,
  false
from auth.users u
where u.email = 'jessiejayr@gmail.com'
on conflict (patient_code) do update
set
  user_id = excluded.user_id,
  email = excluded.email,
  updated_at = now();
```

## QA checklist

1. Login succeeds.
2. Public doctors load.
3. Public services load.
4. Booking wizard loads doctors/services/slots.
5. Confirm Booking creates a Supabase booking.
6. User lands on `/patient/bookings/:id`.
7. My Bookings shows the created booking.
8. Booking Detail opens the created booking.
9. Cancel booking works for future bookings.

## Deferred

- Patient self-registration/profile creation RPC.
- Payment proof upload UI.
- Staff/doctor workflow button migration.
- Consultation and document upload UI migration.

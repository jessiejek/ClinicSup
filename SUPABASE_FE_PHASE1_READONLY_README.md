# FE Phase 1 — Supabase Read-Only Doctors/Services Integration

## Scope

This patch moves read-only doctors/services data from the legacy ASP.NET API to Supabase.

## Changed files

- `src/app/portals/public/services/public.service.ts`
- `src/app/portals/admin/services/admin-doctors.service.ts`
- `src/app/portals/admin/services/admin-services.service.ts`

## Supabase objects used

- `public.public_doctors_view`
- `public.doctor_available_services_view`
- `public.doctors`
- `public.services`
- `public.doctor_services`
- `public.doctor_schedules`
- RPC `public.get_available_slots`

## What should work

- Public doctors list
- Public doctor profile
- Public services list
- Booking page doctor/service/slot read-only loading
- Admin doctors list
- Admin services list
- Admin service activate/deactivate toggle
- Admin doctor deactivate button updates doctor status to `Inactive`

## Deferred

- Doctor create/edit auth-user creation
- Doctor schedule update
- Blocked-date write actions
- Service create/edit/delete
- Booking creation from FE
- Patient dashboard migration

## QA

1. Run `npm install` if needed.
2. Run `ionic serve`.
3. Login as the Supabase super_admin.
4. Verify:
   - `/public/doctors`
   - `/public/services`
   - `/admin/doctors`
   - `/admin/services`
   - public doctor profile opens
   - booking page can show doctor/service/slots

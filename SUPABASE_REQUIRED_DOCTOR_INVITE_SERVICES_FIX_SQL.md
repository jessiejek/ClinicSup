# SUPABASE_REQUIRED_DOCTOR_INVITE_SERVICES_FIX_SQL.md

## Purpose

Add a `service_ids` JSONB column to `doctor_invites` and provide a manual link for the existing "Choco Cheese" doctor.

## Root Cause

When admin creates a doctor invite, service selection is captured in the form (`selectedServiceIds` Set) but was never saved to any Supabase table. During activation, the Edge Function created a `doctors` row and `doctor_schedules` rows but never created `doctor_services` rows. Result: the booking wizard shows "No services available" for newly activated doctors.

## Status

SQL NEEDED — NOT DEPLOYED

## Required SQL

Run these SQL statements in Supabase SQL Editor **BEFORE** deploying the updated Edge Function.

### A. Add `service_ids` column to `doctor_invites`

```sql
-- Add service_ids JSONB column to doctor_invites
-- Safe/rerunnable
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'doctor_invites'
          AND column_name = 'service_ids'
    ) THEN
        ALTER TABLE public.doctor_invites
            ADD COLUMN service_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;
```

### B. Link existing "Choco Cheese" doctor to General Consultation service

Run this AFTER the ALTER TABLE above, and AFTER the `doctor_invites` table has been deployed.

```sql
-- Manually link "Choco Cheese" doctor to "General Consultation" service
-- Safe/rerunnable — uses ON CONFLICT DO NOTHING
INSERT INTO public.doctor_services (doctor_id, service_id)
SELECT d.id, s.id
FROM public.doctors d
CROSS JOIN public.services s
WHERE d.full_name = 'Choco Cheese'
  AND s.name = 'General Consultation'
ON CONFLICT (doctor_id, service_id) DO NOTHING;
```

### C. Verify

```sql
-- Verify service_ids column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'doctor_invites'
  AND column_name = 'service_ids';

-- Verify Choco Cheese has services
SELECT d.full_name, s.name AS service_name
FROM public.doctor_services ds
JOIN public.doctors d ON d.id = ds.doctor_id
JOIN public.services s ON s.id = ds.service_id
WHERE d.full_name = 'Choco Cheese';
```

## Table Dependencies

```
services ──┐
            ├── doctor_services (doctor_id, service_id) UNIQUE
doctors ───┘
            └── doctor_invites (service_ids JSONB)
```

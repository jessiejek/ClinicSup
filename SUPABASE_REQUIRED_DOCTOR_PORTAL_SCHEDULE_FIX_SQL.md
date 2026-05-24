# SUPABASE_REQUIRED_DOCTOR_PORTAL_SCHEDULE_FIX_SQL.md

## Purpose

Add a `schedule` JSONB column to `doctor_invites` table so that admin-set schedule data is preserved during invite creation and can be used by the `activate-doctor-invite` Edge Function to create `doctor_schedules` rows.

## Root Cause

When admin creates a doctor invite, the schedule is captured in the form (`scheduleDraft`) but was never saved to any Supabase table. The `createDoctorInvite()` method only inserted profile fields into `doctor_invites`, ignoring the schedule entirely. During activation, the Edge Function created a `doctors` row but never created `doctor_schedules` rows. Result: the logged-in doctor sees an empty schedule.

## Status

SQL NEEDED — NOT DEPLOYED

## Required SQL

Run this SQL section in Supabase SQL Editor BEFORE deploying the updated Edge Function.

```sql
-- ============================================================
-- Add schedule JSONB column to doctor_invites
-- Safe/rerunnable SQL
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'doctor_invites'
          AND column_name = 'schedule'
    ) THEN
        ALTER TABLE public.doctor_invites
            ADD COLUMN schedule JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;
```

-- ============================================================
-- SUPABASE_REQUIRED_PUBLIC_DOCTOR_SCHEDULE_RLS_FIX.sql
--
-- Fixes P0: Public booking Step 2 calendar shows all dates
-- disabled because 'anon' role cannot SELECT from base tables
-- doctor_schedules, doctor_blocked_dates, doctor_day_statuses.
--
-- Root cause #1: Missing GRANT SELECT on these 3 tables for
--   anon/authenticated roles.
-- Root cause #2: Existing RLS policy
--   'doctor_schedules_select_public' uses USING (true) with no
--   TO clause (defaults to PUBLIC) — this is fine but the GRANT
--   was missing, so RLS never evaluated.
--
-- This file replaces permissive USING (true) policies with
-- more restrictive policies that only expose schedules for
-- ACTIVE doctors.
--
-- Safe to run multiple times (DROP IF EXISTS + idempotent).
-- ============================================================

-- ============================================================
-- 1. GRANT SELECT on schedule/availability base tables
--    (needed before RLS policies can be evaluated)
-- ============================================================
GRANT SELECT ON public.doctor_schedules TO anon, authenticated;
GRANT SELECT ON public.doctor_blocked_dates TO anon, authenticated;
GRANT SELECT ON public.doctor_day_statuses TO anon, authenticated;

-- ============================================================
-- 2. Replace doctor_schedules public SELECT policy
--    Old: FOR SELECT USING (true) — allows ALL rows for ALL roles
--    New: FOR SELECT TO anon, authenticated — only schedules of
--         ACTIVE doctors
-- ============================================================
DROP POLICY IF EXISTS doctor_schedules_select_public ON public.doctor_schedules;

DROP POLICY IF EXISTS public_doctor_schedules_select ON public.doctor_schedules;

CREATE POLICY public_doctor_schedules_select
    ON public.doctor_schedules
    FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.doctors d
            WHERE d.id = doctor_schedules.doctor_id
              AND d.status = 'Active'
        )
    );

-- Doctors can always see their own schedule (regardless of status)
DROP POLICY IF EXISTS doctor_schedules_select_own ON public.doctor_schedules;

CREATE POLICY doctor_schedules_select_own
    ON public.doctor_schedules
    FOR SELECT
    TO authenticated
    USING (
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    );

-- ============================================================
-- 3. Replace doctor_blocked_dates public SELECT policy
--    Same restriction: only blocked dates for ACTIVE doctors
-- ============================================================
DROP POLICY IF EXISTS doctor_blocked_dates_select_public ON public.doctor_blocked_dates;

DROP POLICY IF EXISTS public_doctor_blocked_dates_select ON public.doctor_blocked_dates;

CREATE POLICY public_doctor_blocked_dates_select
    ON public.doctor_blocked_dates
    FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.doctors d
            WHERE d.id = doctor_blocked_dates.doctor_id
              AND d.status = 'Active'
        )
    );

-- Doctors can always see their own blocked dates
DROP POLICY IF EXISTS doctor_blocked_dates_select_own ON public.doctor_blocked_dates;

CREATE POLICY doctor_blocked_dates_select_own
    ON public.doctor_blocked_dates
    FOR SELECT
    TO authenticated
    USING (
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    );

-- ============================================================
-- 4. Replace doctor_day_statuses public SELECT policy
--    Same restriction: only day statuses for ACTIVE doctors
-- ============================================================
DROP POLICY IF EXISTS doctor_day_statuses_select_public ON public.doctor_day_statuses;

DROP POLICY IF EXISTS public_doctor_day_statuses_select ON public.doctor_day_statuses;

CREATE POLICY public_doctor_day_statuses_select
    ON public.doctor_day_statuses
    FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.doctors d
            WHERE d.id = doctor_day_statuses.doctor_id
              AND d.status = 'Active'
        )
    );

-- Doctors can always see their own day statuses
DROP POLICY IF EXISTS doctor_day_statuses_select_own ON public.doctor_day_statuses;

CREATE POLICY doctor_day_statuses_select_own
    ON public.doctor_day_statuses
    FOR SELECT
    TO authenticated
    USING (
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    );

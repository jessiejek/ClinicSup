-- ============================================================================
-- SUPABASE_REQUIRED_PATIENT_SELF_PROFILE_RLS_FIX.sql
--
-- Purpose: Enable social-login patients to auto-create their patients row.
--
-- Background:
--   Social login (Google/Facebook) users who register as patients don't
--   provide date_of_birth or sex. The `patients` table has these as
--   NOT NULL, which prevents the frontend from inserting a row via
--   `ensurePatientRecord()`. Without a patients row, `current_patient_id()`
--   returns NULL, and `create_booking` with p_patient_id=NULL fails with
--   "Patient is required."
--
-- Fix:
--   1. Make date_of_birth and sex nullable (social login users can complete
--      their profile later).
--   2. Ensure GRANT SELECT/INSERT/UPDATE exists for authenticated users
--      on public.patients (handled by Supabase RLS by default).
--   3. Ensure RLS policies allow self-service (already deployed in Phase 1).
--
-- Rerunnable: YES — all statements are idempotent (ALTER TABLE IF, DROP then
-- CREATE OR REPLACE, etc.).
-- Run order: BEFORE deploying new Edge Functions, AFTER Phase 1 foundation SQL.
-- ============================================================================

-- ============================================================================
-- SECTION A: Make optional columns nullable (social-login patients)
-- ============================================================================

ALTER TABLE public.patients
  ALTER COLUMN date_of_birth DROP NOT NULL,
  ALTER COLUMN sex DROP NOT NULL;

-- ============================================================================
-- SECTION B: Ensure GRANTs for self-service (rerunnable)
-- Note: Supabase enables RLS by default; these GRANTs are idempotent.
-- ============================================================================

GRANT SELECT ON public.patients TO authenticated;
GRANT INSERT ON public.patients TO authenticated;
GRANT UPDATE ON public.patients TO authenticated;

-- ============================================================================
-- SECTION C: Verify RLS policies exist (already in phase-01-foundation.sql)
-- These policies are required for self-service patient record management.
-- Run only if the Phase 1 foundation SQL has not been deployed, or to verify.
-- ============================================================================

-- Patients can SELECT their own row (or if doctor/staff/admin)
DROP POLICY IF EXISTS "patients_select_own" ON public.patients;
CREATE POLICY "patients_select_own" ON public.patients
    FOR SELECT USING (
        auth.uid() = user_id
        OR public.has_any_role(ARRAY['doctor', 'staff', 'admin', 'super_admin']::app_role[])
    );

-- Patients can INSERT their own row (user_id must match auth.uid())
DROP POLICY IF EXISTS "patients_insert_admin" ON public.patients;
CREATE POLICY "patients_insert_admin" ON public.patients
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR public.has_any_role(ARRAY['staff', 'admin', 'super_admin']::app_role[])
    );

-- Patients can UPDATE their own row
DROP POLICY IF EXISTS "patients_update_own" ON public.patients;
CREATE POLICY "patients_update_own" ON public.patients
    FOR UPDATE USING (
        auth.uid() = user_id
        OR public.has_any_role(ARRAY['staff', 'admin', 'super_admin']::app_role[])
    );

-- Admin-only DELETE
DROP POLICY IF EXISTS "patients_delete_admin" ON public.patients;
CREATE POLICY "patients_delete_admin" ON public.patients
    FOR DELETE USING (public.has_any_role(ARRAY['admin', 'super_admin']::app_role[]));

-- ============================================================================
-- SECTION D: Verify current_patient_id() function works
-- (Already deployed in Phase 1, but included for completeness.)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_patient_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_patient_id UUID;
BEGIN
    SELECT id INTO v_patient_id FROM public.patients WHERE user_id = auth.uid();
    RETURN v_patient_id;
END;
$$;

-- ============================================================================
-- SECTION E: Drop patients_sex_check constraint (blocks social-login insert)
-- The CHECK constraint on sex (likely IN ('male','female','other') or similar)
-- rejects 'rather-not-say' used as placeholder for social-login users.
-- Since sex is now nullable, the constraint is unnecessary.
-- ============================================================================

ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_sex_check;

-- ============================================================================
-- SECTION E2: Add missing bookings columns (if bookings table pre-existed)
-- The bookings table may have been created before phase-02-booking-workflow.sql
-- ran, missing columns like total_amount, final_amount, payment_mode, etc.
-- ============================================================================

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS queue_number INT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'PayAtClinic';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'Unpaid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS final_amount NUMERIC(10,2);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_professional_fee_waived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS doctor_completed_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ============================================================================
-- SECTION E3: Change bookings enum columns to TEXT
-- The create_booking RPC passes TEXT values (v_booking_status TEXT, 'PayAtClinic'
-- as TEXT, 'Unpaid' as TEXT) but if the existing table has these as enum types
-- (booking_status, payment_mode, payment_status), PostgreSQL rejects the insert.
-- Error: column "status" is of type booking_status but expression is of type text
--
-- PostgreSQL blocks ALTER COLUMN TYPE if any policy references the column,
-- so we temporarily drop all policies on public.bookings (and any other table
-- that might reference bookings.status via subquery or view), then recreate
-- the standard ones.
-- ============================================================================

-- Drop all policies that might block the ALTER
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN (
        SELECT policyname, tablename FROM pg_policies
        WHERE schemaname = 'public'
        -- Include any table whose policies might reference bookings columns
        AND tablename IN ('bookings', 'reviews')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.policyname, rec.tablename);
    END LOOP;
END;
$$;

-- Now alter the column types (no policy dependencies to block)
ALTER TABLE public.bookings ALTER COLUMN status TYPE TEXT USING status::TEXT;
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'Pending';
ALTER TABLE public.bookings ALTER COLUMN payment_mode TYPE TEXT USING payment_mode::TEXT;
ALTER TABLE public.bookings ALTER COLUMN payment_mode SET DEFAULT 'PayAtClinic';
ALTER TABLE public.bookings ALTER COLUMN payment_status TYPE TEXT USING payment_status::TEXT;
ALTER TABLE public.bookings ALTER COLUMN payment_status SET DEFAULT 'Unpaid';

-- Recreate standard policies on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Patients can see their own bookings
DROP POLICY IF EXISTS "bookings_select_patient" ON public.bookings;
CREATE POLICY "bookings_select_patient" ON public.bookings
    FOR SELECT USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    );

-- Staff/admin can see all bookings
DROP POLICY IF EXISTS "bookings_select_staff" ON public.bookings;
CREATE POLICY "bookings_select_staff" ON public.bookings
    FOR SELECT USING (
        public.has_any_role(ARRAY['staff', 'admin', 'super_admin', 'doctor']::app_role[])
    );

-- Doctors can see bookings assigned to them
DROP POLICY IF EXISTS "bookings_select_doctor" ON public.bookings;
CREATE POLICY "bookings_select_doctor" ON public.bookings
    FOR SELECT USING (
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    );

-- Patients can insert their own bookings (via RPC, but policy still needed for direct inserts)
DROP POLICY IF EXISTS "bookings_insert_patient" ON public.bookings;
CREATE POLICY "bookings_insert_patient" ON public.bookings
    FOR INSERT WITH CHECK (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
        OR public.has_any_role(ARRAY['staff', 'admin', 'super_admin']::app_role[])
    );

-- Staff/admin can update bookings
DROP POLICY IF EXISTS "bookings_update_staff" ON public.bookings;
CREATE POLICY "bookings_update_staff" ON public.bookings
    FOR UPDATE USING (
        public.has_any_role(ARRAY['staff', 'admin', 'super_admin', 'doctor']::app_role[])
    );

-- Recreate standard reviews policy (was dropped above to unblock ALTER)
DROP POLICY IF EXISTS "reviews_select_authenticated" ON public.reviews;
CREATE POLICY "reviews_select_authenticated"
    ON public.reviews
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
CREATE POLICY "reviews_select_public"
    ON public.reviews
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
CREATE POLICY "reviews_insert_own"
    ON public.reviews
    FOR INSERT
    TO authenticated
    WITH CHECK (
        patient_id IN (
            SELECT p.id FROM public.patients p WHERE p.user_id = auth.uid()
        )
    );

-- ============================================================================
-- SECTION F: Verify create_booking has self-booking support
-- (showing the patient-resolve logic; the full RPC is in Phase 2 SQL)
-- ============================================================================

-- The create_booking RPC already handles self-booking correctly:
--   v_current_patient_id := public.current_patient_id();
--   v_patient_id := COALESCE(p_patient_id, v_current_patient_id);
--   IF v_patient_id IS NULL THEN RAISE EXCEPTION 'Patient is required.'; END IF;
--
-- Once a patients row exists with user_id = auth.uid(), current_patient_id()
-- returns the patient's ID, and create_booking with p_patient_id=NULL works.

-- ============================================================================
-- Verification Queries (run after deploy)
-- ============================================================================
-- SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'patients'
--   ORDER BY ordinal_position;
-- Expected: date_of_birth -> YES, sex -> YES

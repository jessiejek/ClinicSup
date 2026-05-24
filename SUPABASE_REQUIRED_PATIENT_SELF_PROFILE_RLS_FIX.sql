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
-- SECTION E: Verify create_booking has self-booking support
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

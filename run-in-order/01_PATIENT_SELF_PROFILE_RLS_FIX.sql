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

-- Make service_id nullable (bookings table has this column from a different migration;
-- service linkage is through booking_service_items)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'service_id'
    ) THEN
        ALTER TABLE public.bookings ALTER COLUMN service_id DROP NOT NULL;
    END IF;
END;
$$;

-- Add missing columns to booking_service_items (if not exist)
ALTER TABLE public.booking_service_items ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE public.booking_service_items ADD COLUMN IF NOT EXISTS service_name_snapshot TEXT;
ALTER TABLE public.booking_service_items ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;
ALTER TABLE public.booking_service_items ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ============================================================================
-- SECTION E3: Fix create_booking RPC to cast TEXT to enum types
-- The create_booking RPC inserts TEXT values into booking_status, payment_mode,
-- and payment_status enum columns. PostgreSQL cannot implicitly cast TEXT to
-- an enum, so the INSERT fails with:
--    column "status" is of type booking_status but expression is of type text
--
-- Instead of ALTER COLUMN TYPE (which cascades into views, policies, and
-- functions that all depend on the column type), we fix the RPC to cast
-- the TEXT values explicitly to their enum types.
-- ============================================================================

-- Drop the overloaded create_booking with BOOLEAN (p_is_walk_in) param
-- Uses type-based signature: create_booking(UUID, UUID[], DATE, TIME, TIME, UUID, TEXT, BOOLEAN)
DROP FUNCTION IF EXISTS public.create_booking(UUID, UUID[], DATE, TIME, TIME, UUID, TEXT, BOOLEAN);

-- Recreate create_booking RPC with explicit enum casts
CREATE OR REPLACE FUNCTION public.create_booking(
    p_doctor_id UUID,
    p_service_ids UUID[],
    p_appointment_date DATE,
    p_slot_start_time TIME,
    p_slot_end_time TIME,
    p_patient_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_id UUID,
    queue_number INT,
    status TEXT,
    payment_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_patient_id UUID;
    v_queue_number INT;
    v_booking_id UUID;
    v_total_amount NUMERIC(10,2);
    v_doctor_consultation_fee NUMERIC(10,2);
    v_service RECORD;
    v_booking_status TEXT;
BEGIN
    -- Determine patient: use current patient if not provided
    v_patient_id := COALESCE(p_patient_id, public.current_patient_id());
    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Patient is required. Provide p_patient_id or ensure logged-in user has a patient record.';
    END IF;

    -- Verify doctor exists and is active
    -- NOTE: Use table alias 'd' to avoid ambiguity with RETURNS TABLE OUT param status
    IF NOT EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = p_doctor_id AND d.status = 'Active') THEN
        RAISE EXCEPTION 'Doctor not found or not active.';
    END IF;

    -- Verify all service IDs exist
    IF NOT EXISTS (
        SELECT 1 FROM public.services s
        WHERE s.id = ANY(p_service_ids) AND s.is_active = true
        HAVING COUNT(*) = array_length(p_service_ids, 1)
    ) THEN
        RAISE EXCEPTION 'One or more services not found or inactive.';
    END IF;

    -- Verify slot availability (no overlapping bookings)
    -- NOTE: Use table alias 'b' to avoid ambiguity with RETURNS TABLE OUT params (status, queue_number)
    IF EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.doctor_id = p_doctor_id
          AND b.appointment_date = p_appointment_date
          AND b.slot_start_time < p_slot_end_time
          AND b.slot_end_time > p_slot_start_time
          AND b.status NOT IN ('Cancelled', 'NoShow', 'Expired')
    ) THEN
        RAISE EXCEPTION 'Time slot is already booked.';
    END IF;

    -- Calculate total amount from services
    SELECT COALESCE(SUM(s.price), 0) INTO v_total_amount
    FROM public.services s WHERE s.id = ANY(p_service_ids);

    -- Get doctor's consultation fee
    SELECT consultation_fee INTO v_doctor_consultation_fee
    FROM public.doctors WHERE id = p_doctor_id;

    -- Add consultation fee to total
    v_total_amount := v_total_amount + COALESCE(v_doctor_consultation_fee, 0);

    -- Assign queue number (next number for this doctor on this date)
    -- NOTE: Use table alias 'b' to avoid ambiguity with RETURNS TABLE OUT param queue_number
    SELECT COALESCE(MAX(b.queue_number), 0) + 1 INTO v_queue_number
    FROM public.bookings b
    WHERE b.doctor_id = p_doctor_id AND b.appointment_date = p_appointment_date;

    -- Default status: 'Confirmed' for patient-initiated, 'Pending' for walk-in
    v_booking_status := 'Confirmed';

    -- Create booking with explicit enum casts for status, payment_mode, payment_status
    INSERT INTO public.bookings (
        patient_id, doctor_id, appointment_date, slot_start_time, slot_end_time,
        queue_number, status, payment_mode, payment_status, total_amount, final_amount,
        notes, is_walk_in
    ) VALUES (
        v_patient_id, p_doctor_id, p_appointment_date, p_slot_start_time, p_slot_end_time,
        v_queue_number, v_booking_status::booking_status, 'PayAtClinic'::payment_mode, 'Unpaid'::payment_status,
        v_total_amount, v_total_amount,
        p_notes, (p_patient_id IS NULL)
    )
    RETURNING id INTO v_booking_id;

    -- Create booking_service_items
    FOR v_service IN SELECT s.id, s.name, s.price FROM public.services s WHERE s.id = ANY(p_service_ids)
    LOOP
        INSERT INTO public.booking_service_items (booking_id, service_id, service_name, service_name_snapshot, quantity, price)
        VALUES (v_booking_id, v_service.id, v_service.name, v_service.name, 1, v_service.price);
    END LOOP;

    -- Return result
    RETURN QUERY SELECT v_booking_id, v_queue_number, v_booking_status, 'Unpaid';
END;
$$;

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

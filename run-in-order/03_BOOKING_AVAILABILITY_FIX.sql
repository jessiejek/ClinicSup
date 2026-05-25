-- ============================================================
-- Grants for doctor_schedules (needed by patient booking Step 2)
-- ============================================================
GRANT SELECT ON public.doctor_schedules TO anon, authenticated;

-- ============================================================
-- Grants for doctor_blocked_dates (needed by future front-end checks)
-- ============================================================
GRANT SELECT ON public.doctor_blocked_dates TO anon, authenticated;

-- ============================================================
-- Grants for doctor_day_statuses (needed by future front-end checks)
-- ============================================================
GRANT SELECT ON public.doctor_day_statuses TO anon, authenticated;

-- ============================================================
-- Replace get_available_slots with locale-independent EXTRACT(DOW)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_available_slots(
    p_doctor_id UUID,
    p_appointment_date DATE
)
RETURNS TABLE (
    slot_start_time TIME,
    slot_end_time TIME,
    is_available BOOLEAN,
    booked_count BIGINT,
    capacity BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_slot_duration INT;
    v_slot_capacity INT;
    v_dow INT;
    v_duration_interval INTERVAL;
    v_now_tstz TIMESTAMPTZ;
BEGIN
    -- Block past dates
    IF p_appointment_date < CURRENT_DATE THEN
        RETURN;
    END IF;

    SELECT slot_duration_minutes, slot_capacity
    INTO v_slot_duration, v_slot_capacity
    FROM public.doctors WHERE id = p_doctor_id;

    v_slot_duration := COALESCE(v_slot_duration, 30);
    v_slot_capacity := COALESCE(v_slot_capacity, 1);
    v_duration_interval := make_interval(mins => v_slot_duration);

    -- Blocked date check
    IF EXISTS (SELECT 1 FROM public.doctor_blocked_dates
               WHERE doctor_id = p_doctor_id AND blocked_date = p_appointment_date) THEN
        RETURN;
    END IF;

    -- Day status check
    DECLARE
        v_day_status RECORD;
    BEGIN
        SELECT * INTO v_day_status FROM public.doctor_day_statuses
        WHERE doctor_id = p_doctor_id AND target_date = p_appointment_date;

        IF v_day_status.status = 'unavailable' THEN
            RETURN;
        END IF;

        IF v_day_status.status = 'limited' AND v_day_status.max_slots IS NOT NULL THEN
            v_slot_capacity := v_day_status.max_slots;
        END IF;
    END;

    -- Get day-of-week number: 0=Sunday, 1=Monday, ..., 6=Saturday
    v_dow := EXTRACT(DOW FROM p_appointment_date)::INT;

    -- For today, only show slots that haven't passed yet
    IF p_appointment_date = CURRENT_DATE THEN
        v_now_tstz := CURRENT_TIMESTAMP;
    ELSE
        v_now_tstz := NULL;
    END IF;

    RETURN QUERY
    WITH schedule_slots AS (
        SELECT
            (p_appointment_date + ds.start_time)::TIMESTAMPTZ AS slot_start_ts,
            (p_appointment_date + ds.end_time)::TIMESTAMPTZ AS schedule_end_ts
        FROM public.doctor_schedules ds
        WHERE ds.doctor_id = p_doctor_id
          AND (
            -- Match day_of_week (appointment_day ENUM) by number
            (v_dow = 0 AND ds.day_of_week = 'Sunday')
            OR (v_dow = 1 AND ds.day_of_week = 'Monday')
            OR (v_dow = 2 AND ds.day_of_week = 'Tuesday')
            OR (v_dow = 3 AND ds.day_of_week = 'Wednesday')
            OR (v_dow = 4 AND ds.day_of_week = 'Thursday')
            OR (v_dow = 5 AND ds.day_of_week = 'Friday')
            OR (v_dow = 6 AND ds.day_of_week = 'Saturday')
          )
    ),
    all_slots AS (
        SELECT
            generate_series(
                ss.slot_start_ts,
                ss.schedule_end_ts - v_duration_interval,
                v_duration_interval
            ) AS slot_start_ts,
            ss.schedule_end_ts
        FROM schedule_slots ss
    ),
    time_slots AS (
        SELECT
            asl.slot_start_ts,
            asl.slot_start_ts::TIME AS slot_start_time,
            LEAST(
                (asl.slot_start_ts + v_duration_interval)::TIME,
                asl.schedule_end_ts::TIME
            ) AS slot_end_time,
            asl.schedule_end_ts
        FROM all_slots asl
    ),
    existing_bookings AS (
        SELECT
            b.slot_start_time AS booking_slot_start_time,
            b.slot_end_time AS booking_slot_end_time
        FROM public.bookings b
        WHERE b.doctor_id = p_doctor_id
          AND b.appointment_date = p_appointment_date
          AND b.status NOT IN ('Cancelled', 'NoShow', 'Expired')
    )
    SELECT
        ts.slot_start_time,
        ts.slot_end_time,
        (COUNT(eb.*) < v_slot_capacity) AS is_available,
        COUNT(eb.*)::BIGINT AS booked_count,
        v_slot_capacity::BIGINT AS capacity
    FROM time_slots ts
    LEFT JOIN existing_bookings eb
        ON eb.booking_slot_start_time < ts.slot_end_time
        AND eb.booking_slot_end_time > ts.slot_start_time
    WHERE (v_now_tstz IS NULL OR ts.slot_start_ts >= v_now_tstz)
    GROUP BY ts.slot_start_time, ts.slot_end_time, ts.slot_start_ts
    ORDER BY ts.slot_start_time;
END;
$$;

-- ============================================================
-- Replace create_booking with locale-independent EXTRACT(DOW)
-- and fixed v_service_id UUID variable
-- ============================================================

-- Drop any existing overload first (prevents PGRST203 ambiguity)
DROP FUNCTION IF EXISTS public.create_booking(UUID, UUID[], DATE, TIME, TIME, UUID, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.create_booking(
    p_doctor_id UUID,
    p_service_ids UUID[],
    p_appointment_date DATE,
    p_slot_start_time TIME,
    p_slot_end_time TIME,
    p_patient_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_is_walk_in BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    booking_id UUID,
    queue_number INT,
    status TEXT,
    payment_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_patient_id UUID;
    v_queue_number INT;
    v_booking_id UUID;
    v_total_amount NUMERIC(10,2);
    v_doctor_consultation_fee NUMERIC(10,2);
    v_booking_status TEXT;
    v_is_walk_in BOOLEAN;
    v_current_patient_id UUID;
    v_dow INT;
    v_slot_duration INT;
    v_slot_capacity INT;
    v_existing_count INT;
    v_service_id UUID;
BEGIN
    -- ================================================================
    -- DATE AND PATIENT VALIDATION
    -- ================================================================

    -- Reject past dates
    IF p_appointment_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot book an appointment in the past.';
    END IF;

    -- Doctor must be active
    IF NOT EXISTS (SELECT 1 FROM public.doctors WHERE id = p_doctor_id AND status = 'Active') THEN
        RAISE EXCEPTION 'Doctor not found or not active.';
    END IF;

    -- Resolve patient: NULL means self-booking
    v_current_patient_id := public.current_patient_id();
    v_patient_id := COALESCE(p_patient_id, v_current_patient_id);

    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Patient is required.';
    END IF;

    -- Access control: if booking for a DIFFERENT patient, require staff/admin/super_admin
    IF p_patient_id IS NOT NULL AND p_patient_id IS DISTINCT FROM v_current_patient_id THEN
        IF NOT public.has_any_role(ARRAY['staff'::app_role, 'admin'::app_role, 'super_admin'::app_role]) THEN
            RAISE EXCEPTION 'Permission denied: staff or admin role required to book for another patient.';
        END IF;
    END IF;

    -- Determine is_walk_in: explicit param beats inferred
    v_is_walk_in := COALESCE(p_is_walk_in, (p_patient_id IS NOT NULL OR v_patient_id IS DISTINCT FROM v_current_patient_id));

    -- ================================================================
    -- SCHEDULE VALIDATION
    -- ================================================================

    -- Check blocked dates
    IF EXISTS (SELECT 1 FROM public.doctor_blocked_dates
               WHERE doctor_id = p_doctor_id AND blocked_date = p_appointment_date) THEN
        RAISE EXCEPTION 'Doctor is not available on this date (blocked).';
    END IF;

    -- Check day status
    DECLARE
        v_day_status TEXT;
    BEGIN
        SELECT status INTO v_day_status FROM public.doctor_day_statuses
        WHERE doctor_id = p_doctor_id AND target_date = p_appointment_date;

        IF v_day_status = 'unavailable' THEN
            RAISE EXCEPTION 'Doctor is not available on this date (unavailable).';
        END IF;
    END;

    -- Get day-of-week number: 0=Sunday, 1=Monday, ..., 6=Saturday
    v_dow := EXTRACT(DOW FROM p_appointment_date)::INT;

    -- Validate slot is within doctor's schedule for this day of week
    IF NOT EXISTS (
        SELECT 1 FROM public.doctor_schedules
        WHERE doctor_id = p_doctor_id
          AND (
            (v_dow = 0 AND day_of_week = 'Sunday')
            OR (v_dow = 1 AND day_of_week = 'Monday')
            OR (v_dow = 2 AND day_of_week = 'Tuesday')
            OR (v_dow = 3 AND day_of_week = 'Wednesday')
            OR (v_dow = 4 AND day_of_week = 'Thursday')
            OR (v_dow = 5 AND day_of_week = 'Friday')
            OR (v_dow = 6 AND day_of_week = 'Saturday')
          )
          AND start_time <= p_slot_start_time
          AND end_time >= p_slot_end_time
    ) THEN
        RAISE EXCEPTION 'Selected time slot is outside the doctor''s schedule.';
    END IF;

    -- Check slot capacity (how many overlapping bookings already exist)
    SELECT slot_capacity INTO v_slot_capacity
    FROM public.doctors WHERE id = p_doctor_id;
    v_slot_capacity := COALESCE(v_slot_capacity, 1);

    -- Check if limited day status reduces capacity
    DECLARE
        v_limited_capacity INT;
    BEGIN
        SELECT
            CASE WHEN status = 'limited' AND max_slots IS NOT NULL
                 THEN LEAST(v_slot_capacity, max_slots)
                 ELSE v_slot_capacity
            END INTO v_limited_capacity
        FROM public.doctor_day_statuses
        WHERE doctor_id = p_doctor_id AND target_date = p_appointment_date;

        IF v_limited_capacity IS NOT NULL THEN
            v_slot_capacity := v_limited_capacity;
        END IF;
    END;

    -- Count existing overlapping bookings
    SELECT COUNT(*)::INT INTO v_existing_count
    FROM public.bookings
    WHERE doctor_id = p_doctor_id
      AND appointment_date = p_appointment_date
      AND status NOT IN ('Cancelled', 'NoShow', 'Expired')
      AND slot_start_time < p_slot_end_time
      AND slot_end_time > p_slot_start_time;

    IF v_existing_count >= v_slot_capacity THEN
        RAISE EXCEPTION 'This time slot is fully booked.';
    END IF;

    -- ================================================================
    -- BOOKING CREATION
    -- ================================================================

    -- Calculate total amount from consultation fee + service fees
    SELECT COALESCE(consultation_fee, 0) INTO v_doctor_consultation_fee
    FROM public.doctors WHERE id = p_doctor_id;

    v_total_amount := v_doctor_consultation_fee;

    -- Add service fees
    FOREACH v_service_id IN ARRAY p_service_ids
    LOOP
        SELECT COALESCE(price, 0) INTO STRICT v_doctor_consultation_fee
        FROM public.services WHERE id = v_service_id;

        v_total_amount := v_total_amount + v_doctor_consultation_fee;
    END LOOP;

    -- Generate queue number for this doctor on this date
    SELECT COALESCE(MAX(queue_number), 0) + 1 INTO v_queue_number
    FROM public.bookings
    WHERE doctor_id = p_doctor_id AND appointment_date = p_appointment_date;

    -- Determine booking status
    IF v_is_walk_in THEN
        v_booking_status := 'Pending';
    ELSE
        v_booking_status := 'Pending';
    END IF;

    -- Insert the booking
    INSERT INTO public.bookings (
        patient_id, doctor_id, appointment_date,
        slot_start_time, slot_end_time,
        queue_number, status, payment_mode,
        payment_status, total_amount,
        notes, created_by_user_id, is_walk_in
    ) VALUES (
        v_patient_id, p_doctor_id, p_appointment_date,
        p_slot_start_time, p_slot_end_time,
        v_queue_number,
        v_booking_status,
        CASE WHEN v_is_walk_in THEN 'PayAtClinic' ELSE 'PayAtClinic' END,
        'Unpaid',
        v_total_amount,
        p_notes,
        auth.uid(),
        v_is_walk_in
    )
    RETURNING id INTO v_booking_id;

    -- Insert service items
    FOREACH v_service_id IN ARRAY p_service_ids
    LOOP
        INSERT INTO public.booking_service_items (booking_id, service_id, service_name, quantity, price, service_name_snapshot)
        SELECT v_booking_id, s.id, s.name, 1, s.price, s.name
        FROM public.services s
        WHERE s.id = v_service_id;
    END LOOP;

    -- Insert payment record
    INSERT INTO public.payments (booking_id, amount, status)
    VALUES (v_booking_id, v_total_amount, 'Unpaid');

    -- Return
    RETURN QUERY
    SELECT v_booking_id, v_queue_number, v_booking_status, 'Unpaid'::TEXT;
END;
$$;

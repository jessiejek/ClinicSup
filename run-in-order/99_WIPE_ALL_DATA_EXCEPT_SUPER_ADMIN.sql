-- ============================================================
-- WIPE ALL DATA EXCEPT SUPER ADMIN (v3 — skips missing tables)
-- Run in Supabase SQL Editor.
-- ============================================================

DO $$
DECLARE
    v_super_admin_id UUID;
    v_super_admin_profile_id UUID;
    v_tables TEXT[] := ARRAY[
        'prescription_items',
        'lab_order_items',
        'consultation_vital_signs',
        'consultation_soap_notes',
        'consultation_diagnoses',
        'consultation_follow_ups',
        'lab_orders',
        'lab_results',
        'prescriptions',
        'consultations',
        'booking_service_items',
        'payments',
        'bookings',
        'vaccination_records',
        'allergies',
        'medical_records',
        'patient_media',
        'patient_documents',
        'reviews',
        'announcements',
        'notifications',
        'doctor_schedules',
        'doctor_blocked_dates',
        'doctor_day_statuses',
        'doctor_services',
        'staff_invites',
        'doctor_invites',
        'audit_logs'
    ];
    v_tbl TEXT;
BEGIN
    -- ================================================================
    -- 1. Identify super admin
    -- ================================================================
    SELECT id INTO v_super_admin_id
    FROM auth.users
    WHERE email = 'jessiejayr@gmail.com';

    IF v_super_admin_id IS NULL THEN
        RAISE EXCEPTION 'Super admin not found in auth.users. Aborting.';
    END IF;

    RAISE NOTICE 'Super admin: %', v_super_admin_id;

    -- ================================================================
    -- 2. Wipe all child tables (skip if doesn't exist)
    -- ================================================================
    FOREACH v_tbl IN ARRAY v_tables
    LOOP
        BEGIN
            EXECUTE format('DELETE FROM public.%I', v_tbl);
            RAISE NOTICE '  ✓ Cleared public.%', v_tbl;
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE '  - Skipped public.% (not found)', v_tbl;
            WHEN OTHERS THEN
                RAISE NOTICE '  - Skipped public.% (%).  Continuing...', v_tbl, SQLERRM;
        END;
    END LOOP;

    -- ================================================================
    -- 3. Delete non-super-admin roles, profiles, and auth users
    -- ================================================================
    DELETE FROM public.user_roles
    WHERE user_id != v_super_admin_id;
    RAISE NOTICE '  ✓ Cleared public.user_roles (excl super admin)';

    DELETE FROM public.patients
    WHERE user_id != v_super_admin_id;
    RAISE NOTICE '  ✓ Cleared public.patients (excl super admin)';

    DELETE FROM public.doctors;
    RAISE NOTICE '  ✓ Cleared public.doctors';

    DELETE FROM public.profiles
    WHERE id != v_super_admin_id;
    RAISE NOTICE '  ✓ Cleared public.profiles (excl super admin)';

    DELETE FROM auth.users
    WHERE id != v_super_admin_id;
    RAISE NOTICE '  ✓ Cleared auth.users (excl super admin)';

    -- ================================================================
    -- Done
    -- ================================================================
    RAISE NOTICE '==========================================';
    RAISE NOTICE '  WIPE COMPLETE';
    RAISE NOTICE '  Super admin preserved: %', v_super_admin_id;
    RAISE NOTICE '==========================================';

END $$;

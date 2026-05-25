-- ============================================================
-- FIX: Allow users to insert own patient role on first login
-- Safe to re-run. Skips if policy already exists.
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_roles'
        AND policyname = 'user_roles_insert_own_patient'
    ) THEN
        CREATE POLICY "user_roles_insert_own_patient" ON public.user_roles
            FOR INSERT WITH CHECK (
                auth.uid() = user_id
                AND role = 'patient'::app_role
            );
        RAISE NOTICE 'Created user_roles_insert_own_patient policy.';
    ELSE
        RAISE NOTICE 'Policy user_roles_insert_own_patient already exists, skipped.';
    END IF;
END $$;

# SUPABASE_REQUIRED_DOCTOR_INVITES_SQL.md

## Purpose

Add a `doctor_invites` table to support Admin-approved Doctor Social Login Activation.

Admin creates a pending doctor invite without creating an Auth user or password. The doctor signs in with Google/Facebook using the same email, then the `activate-doctor-invite` Edge Function safely activates the doctor account using the service role key server-side.

## Status

SQL NEEDED - NOT DEPLOYED

## Required SQL

Run this SQL section in Supabase SQL Editor.

```sql
-- ============================================================
-- doctor_invites - Pending doctor activation via social login
-- Safe/rerunnable SQL
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.doctor_invites (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id             UUID NULL REFERENCES public.doctors(id) ON DELETE SET NULL,

    email                 TEXT NOT NULL,
    full_name             TEXT NOT NULL,

    specialization        TEXT NOT NULL DEFAULT '',
    bio                   TEXT NULL,
    license_number        TEXT NULL,
    ptr_number            TEXT NULL,
    s2_number             TEXT NULL,

    consultation_fee      NUMERIC(10,2) NOT NULL DEFAULT 0,
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    slot_capacity         INT NOT NULL DEFAULT 1,
    daily_patient_limit   INT NULL,
    schedule              JSONB NOT NULL DEFAULT '[]'::jsonb,

    status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'revoked')),

    invited_by            UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    accepted_user_id      UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    accepted_at           TIMESTAMPTZ NULL,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT doctor_invites_email_not_blank
      CHECK (length(trim(email)) > 0),

    CONSTRAINT doctor_invites_full_name_not_blank
      CHECK (length(trim(full_name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_doctor_invites_email_status
    ON public.doctor_invites (lower(trim(email)), status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_doctor_invites_pending_email
    ON public.doctor_invites (lower(trim(email)))
    WHERE status = 'pending';

DROP TRIGGER IF EXISTS trg_doctor_invites_updated_at ON public.doctor_invites;

CREATE TRIGGER trg_doctor_invites_updated_at
    BEFORE UPDATE ON public.doctor_invites
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.doctor_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doctor_invites_select_admin" ON public.doctor_invites;
DROP POLICY IF EXISTS "doctor_invites_insert_admin" ON public.doctor_invites;
DROP POLICY IF EXISTS "doctor_invites_update_admin" ON public.doctor_invites;
DROP POLICY IF EXISTS "doctor_invites_delete_admin" ON public.doctor_invites;

CREATE POLICY "doctor_invites_select_admin"
    ON public.doctor_invites
    FOR SELECT
    TO authenticated
    USING (
        public.has_any_role(ARRAY['admin'::app_role, 'super_admin'::app_role])
    );

CREATE POLICY "doctor_invites_insert_admin"
    ON public.doctor_invites
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_any_role(ARRAY['admin'::app_role, 'super_admin'::app_role])
    );

CREATE POLICY "doctor_invites_update_admin"
    ON public.doctor_invites
    FOR UPDATE
    TO authenticated
    USING (
        public.has_any_role(ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
    WITH CHECK (
        public.has_any_role(ARRAY['admin'::app_role, 'super_admin'::app_role])
    );

CREATE POLICY "doctor_invites_delete_admin"
    ON public.doctor_invites
    FOR DELETE
    TO authenticated
    USING (
        public.has_any_role(ARRAY['admin'::app_role, 'super_admin'::app_role])
    );
```

## Client-side behaviour until SQL is deployed

- The admin doctor form will show a clear error message if `doctor_invites` table does not exist.
- Invite creation will fail safely with an error toast — no fake success.
- The Edge Function `activate-doctor-invite` will also fail if table is missing.

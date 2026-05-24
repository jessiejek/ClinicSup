# SUPABASE_REQUIRED_STAFF_INVITES_SQL.md

## Purpose

Add a `staff_invites` table to support Admin-approved Staff Social Login Activation.

Admin creates a pending staff invite (no password). The staff member signs in with Google/Facebook using the same email, then the `activate-staff-invite` Edge Function safely activates the staff account using the service role key server-side.

## Status

SQL NEEDED — NOT DEPLOYED

## Required SQL

Run this entire block in Supabase SQL Editor.

```sql
-- ============================================================
-- staff_invites - Pending staff activation via social login
-- Safe/rerunnable SQL — follows doctor_invites pattern
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_invites (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email                 TEXT NOT NULL,
    full_name             TEXT NOT NULL,
    phone                 TEXT NULL,

    status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'revoked')),

    invited_by            UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    accepted_user_id      UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    accepted_at           TIMESTAMPTZ NULL,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT staff_invites_email_not_blank
      CHECK (length(trim(email)) > 0),

    CONSTRAINT staff_invites_full_name_not_blank
      CHECK (length(trim(full_name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_email_status
    ON public.staff_invites (lower(trim(email)), status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_invites_pending_email
    ON public.staff_invites (lower(trim(email)))
    WHERE status = 'pending';

DROP TRIGGER IF EXISTS trg_staff_invites_updated_at ON public.staff_invites;

CREATE TRIGGER trg_staff_invites_updated_at
    BEFORE UPDATE ON public.staff_invites
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (same pattern as doctor_invites)

DROP POLICY IF EXISTS "staff_invites_select_admin" ON public.staff_invites;
DROP POLICY IF EXISTS "staff_invites_insert_admin" ON public.staff_invites;
DROP POLICY IF EXISTS "staff_invites_update_admin" ON public.staff_invites;
DROP POLICY IF EXISTS "staff_invites_delete_admin" ON public.staff_invites;

CREATE POLICY "staff_invites_select_admin"
    ON public.staff_invites
    FOR SELECT
    TO authenticated
    USING (
        public.has_any_role(ARRAY['admin'::app_role, 'super_admin'::app_role])
    );

CREATE POLICY "staff_invites_insert_admin"
    ON public.staff_invites
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_any_role(ARRAY['admin'::app_role, 'super_admin'::app_role])
    );

CREATE POLICY "staff_invites_update_admin"
    ON public.staff_invites
    FOR UPDATE
    TO authenticated
    USING (
        public.has_any_role(ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
    WITH CHECK (
        public.has_any_role(ARRAY['admin'::app_role, 'super_admin'::app_role])
    );

CREATE POLICY "staff_invites_delete_admin"
    ON public.staff_invites
    FOR DELETE
    TO authenticated
    USING (
        public.has_any_role(ARRAY['admin'::app_role, 'super_admin'::app_role])
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_invites TO authenticated;
```

## Client-side behaviour until SQL is deployed

- The admin staff invite form will show a clear error message if `staff_invites` table does not exist.
- Invite creation will fail safely with an error toast — no fake success.
- The Edge Function `activate-staff-invite` will also fail if the table is missing.

# SUPABASE_REQUIRED_ANNOUNCEMENTS_SQL.md

This file documents the SQL required to support the **announcements** feature in the frontend.
The `announcements` table does not yet exist in the deployed schema.

## Required SQL

Run this in your Supabase SQL Editor (or include in the next migration batch).

```sql
-- ============================================================
-- announcements — clinic announcements visible on public home
-- ============================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT        NOT NULL,
    body        TEXT        NOT NULL DEFAULT '',
    image_url   TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for active announcements sorted by recency
CREATE INDEX IF NOT EXISTS idx_announcements_active_created
    ON public.announcements (is_active, created_at DESC);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can read active announcements (public home page)
CREATE POLICY "announcements_select_public"
    ON public.announcements
    FOR SELECT
    USING (is_active = true);

-- Authenticated users (admin / staff) can read all
CREATE POLICY "announcements_select_all_authenticated"
    ON public.announcements
    FOR SELECT
    TO authenticated
    USING (true);

-- Admin / staff can insert
CREATE POLICY "announcements_insert_authenticated"
    ON public.announcements
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Admin / staff can update
CREATE POLICY "announcements_update_authenticated"
    ON public.announcements
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Admin / staff can delete
CREATE POLICY "announcements_delete_authenticated"
    ON public.announcements
    FOR DELETE
    TO authenticated
    USING (true);
```

## Client-side behaviour until SQL is deployed

- **Admin Announcements page**: Shows empty state ("No announcements") when the table is missing (Supabase returns an error).
- **Public home page**: Returns an empty array and logs a console.warn if the table is missing.
- No fake/mock data is ever shown.

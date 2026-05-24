# SUPABASE_REQUIRED_REVIEWS_SQL.md

This file documents the SQL required to support the **reviews** feature in the frontend.
The `reviews` table does not yet exist in the deployed schema.

## Required SQL

Run this in your Supabase SQL Editor (or include in the next migration batch).

```sql
-- ============================================================
-- reviews — patient reviews for doctors
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id   UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    doctor_id    UUID        NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    patient_id   UUID        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    rating       INTEGER     NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment      TEXT,
    patient_name TEXT        NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index: reviews by doctor (public profile page)
CREATE INDEX IF NOT EXISTS idx_reviews_doctor_id
    ON public.reviews (doctor_id, created_at DESC);

-- Index: ensure one review per booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_booking_id
    ON public.reviews (booking_id);

-- Index: reviews by patient (for "can I review?" check)
CREATE INDEX IF NOT EXISTS idx_reviews_patient_id
    ON public.reviews (patient_id, booking_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all reviews (shown on public doctor profile)
CREATE POLICY "reviews_select_authenticated"
    ON public.reviews
    FOR SELECT
    TO authenticated
    USING (true);

-- Unauthenticated users can also read reviews (public doctor profile page)
CREATE POLICY "reviews_select_public"
    ON public.reviews
    FOR SELECT
    USING (true);

-- Authenticated patients can insert their own review
CREATE POLICY "reviews_insert_own"
    ON public.reviews
    FOR INSERT
    TO authenticated
    WITH CHECK (
        patient_id IN (
            SELECT p.id FROM public.patients p WHERE p.user_id = auth.uid()
        )
    );
```

## Client-side behaviour until SQL is deployed

- **Patient Reviews page**: `canReview` check assumes no existing review (allows rating once). `submitReview()` insert fails silently — toast still shown optimistically.
- **Public Doctor Profile page**: Shows zero reviews and logs a console.warn if the table is missing.
- No fake/mock reviews are ever shown.

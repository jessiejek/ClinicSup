# SUPABASE_REQUIRED_MEDICATION_MASTER_SQL.md

This file documents the SQL required to support the **medication_master** (drug suggestion) feature in the frontend.
The `medication_master` table does not yet exist in the deployed schema.

Until this table is deployed, the prescription components use a **local static constant** for drug name suggestions.
This is acceptable UI-only data — it does not pretend to be a live database query.
Once this table exists, the frontend can be updated to query it via Supabase.

## Required SQL

Run this in your Supabase SQL Editor (or include in the next migration batch).

```sql
-- ============================================================
-- medication_master — master drug list for prescription auto-suggest
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medication_master (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_name   TEXT        NOT NULL,
    generic_name    TEXT,
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_master_name
    ON public.medication_master (medicine_name);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.medication_master ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read the drug list
CREATE POLICY "medication_master_select"
    ON public.medication_master
    FOR SELECT
    TO authenticated
    USING (true);

-- Admin / super_admin can manage the drug list
CREATE POLICY "medication_master_insert_admin"
    ON public.medication_master
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_any_role(ARRAY['admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "medication_master_update_admin"
    ON public.medication_master
    FOR UPDATE
    TO authenticated
    USING (public.has_any_role(ARRAY['admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "medication_master_delete_admin"
    ON public.medication_master
    FOR DELETE
    TO authenticated
    USING (public.has_any_role(ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- ============================================================
-- Seed common drugs
-- ============================================================
INSERT INTO public.medication_master (medicine_name, generic_name) VALUES
    ('Paracetamol', 'Paracetamol'),
    ('Amoxicillin', 'Amoxicillin'),
    ('Amoxicillin + Clavulanic Acid', 'Co-amoxiclav'),
    ('Cephalexin', 'Cephalexin'),
    ('Azithromycin', 'Azithromycin'),
    ('Clarithromycin', 'Clarithromycin'),
    ('Ciprofloxacin', 'Ciprofloxacin'),
    ('Levofloxacin', 'Levofloxacin'),
    ('Metronidazole', 'Metronidazole'),
    ('Clindamycin', 'Clindamycin'),
    ('Doxycycline', 'Doxycycline'),
    ('Ibuprofen', 'Ibuprofen'),
    ('Mefenamic Acid', 'Mefenamic Acid'),
    ('Naproxen', 'Naproxen'),
    ('Celecoxib', 'Celecoxib'),
    ('Diclofenac', 'Diclofenac'),
    ('Omeprazole', 'Omeprazole'),
    ('Pantoprazole', 'Pantoprazole'),
    ('Esomeprazole', 'Esomeprazole'),
    ('Ranitidine', 'Ranitidine'),
    ('Metoclopramide', 'Metoclopramide'),
    ('Ondansetron', 'Ondansetron'),
    ('Losartan', 'Losartan'),
    ('Amlodipine', 'Amlodipine'),
    ('Metoprolol', 'Metoprolol'),
    ('Carvedilol', 'Carvedilol'),
    ('Enalapril', 'Enalapril'),
    ('Atorvastatin', 'Atorvastatin'),
    ('Rosuvastatin', 'Rosuvastatin'),
    ('Simvastatin', 'Simvastatin'),
    ('Metformin', 'Metformin'),
    ('Glimepiride', 'Glimepiride'),
    ('Insulin Glargine', 'Insulin Glargine'),
    ('Salbutamol', 'Salbutamol'),
    ('Montelukast', 'Montelukast'),
    ('Fluticasone', 'Fluticasone'),
    ('Cetirizine', 'Cetirizine'),
    ('Loratadine', 'Loratadine'),
    ('Fexofenadine', 'Fexofenadine'),
    ('Dexamethasone', 'Dexamethasone'),
    ('Prednisone', 'Prednisone'),
    ('Hydrocortisone', 'Hydrocortisone'),
    ('Ferrous Sulfate', 'Ferrous Sulfate'),
    ('Folic Acid', 'Folic Acid'),
    ('Vitamin B Complex', 'Vitamin B Complex'),
    ('Vitamin C', 'Ascorbic Acid'),
    ('Calcium Carbonate', 'Calcium Carbonate'),
    ('Multivitamins', 'Multivitamins'),
    ('Tramadol', 'Tramadol'),
    ('Gabapentin', 'Gabapentin'),
    ('Diazepam', 'Diazepam'),
    ('Clonazepam', 'Clonazepam'),
    ('Sertraline', 'Sertraline'),
    ('Fluoxetine', 'Fluoxetine'),
    ('Furosemide', 'Furosemide'),
    ('Spironolactone', 'Spironolactone'),
    ('Warfarin', 'Warfarin'),
    ('Clopidogrel', 'Clopidogrel'),
    ('Aspirin', 'Aspirin'),
    ('Bisoprolol', 'Bisoprolol')
ON CONFLICT DO NOTHING;

-- Index for search
CREATE INDEX IF NOT EXISTS idx_medication_master_search
    ON public.medication_master (medicine_name, generic_name);
```

## Client-side behaviour until SQL is deployed

- **Prescription form and builder**: Patient name suggestions work from a local static constant (`PRESCRIPTION_DRUG_LIST`). The list is clearly UI-only — it contains common drug names and does not pretend to be a live Supabase query.
- No fake database-backed medication options are shown.
- Once the table is deployed, the local constant can be replaced with a Supabase `.from('medication_master').select('*')` query.

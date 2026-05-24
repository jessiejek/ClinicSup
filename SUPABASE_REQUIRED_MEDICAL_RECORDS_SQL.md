# SUPABASE_REQUIRED_MEDICAL_RECORDS_SQL.md

This file documents the SQL required to support the **medical records** features in the frontend.
The following tables do not yet exist in the deployed schema:
- `allergies`
- `vaccination_records`

## Required SQL

Run this in your Supabase SQL Editor (or include in the next migration batch).

```sql
-- ============================================================
-- allergies — patient allergy records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.allergies (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id   UUID        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    allergen     TEXT        NOT NULL,
    reaction     TEXT        NOT NULL DEFAULT '',
    severity     TEXT        NOT NULL DEFAULT 'Moderate' CHECK (severity IN ('Mild', 'Moderate', 'Severe')),
    allergen_name TEXT,
    allergen_type TEXT,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_allergies_patient_id
    ON public.allergies (patient_id);

CREATE TRIGGER trg_allergies_updated_at
    BEFORE UPDATE ON public.allergies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS for allergies
-- ============================================================
ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;

-- Patients read own; doctors read assigned patients; staff/admin read all
CREATE POLICY "allergies_select"
    ON public.allergies
    FOR SELECT
    USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
        OR public.has_any_role(ARRAY['doctor'::app_role, 'staff'::app_role, 'admin'::app_role, 'super_admin'::app_role])
    );

-- Staff/admin can insert
CREATE POLICY "allergies_insert_staff"
    ON public.allergies
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_any_role(ARRAY['staff'::app_role, 'admin'::app_role, 'super_admin'::app_role])
    );

-- Staff/admin can update
CREATE POLICY "allergies_update_staff"
    ON public.allergies
    FOR UPDATE
    TO authenticated
    USING (
        public.has_any_role(ARRAY['staff'::app_role, 'admin'::app_role, 'super_admin'::app_role])
    );

-- Staff/admin can delete
CREATE POLICY "allergies_delete_staff"
    ON public.allergies
    FOR DELETE
    TO authenticated
    USING (
        public.has_any_role(ARRAY['staff'::app_role, 'admin'::app_role, 'super_admin'::app_role])
    );

-- ============================================================
-- vaccination_records — patient vaccination records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vaccination_records (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id            UUID        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    vaccine_name          TEXT        NOT NULL,
    brand_name            TEXT,
    dose_number           TEXT,
    lot_number            TEXT,
    date_given            DATE        NOT NULL,
    administered_by       TEXT,
    date_administered     DATE,
    administered_by_user_id UUID      REFERENCES auth.users(id),
    next_dose_date        DATE,
    remarks               TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vaccination_records_patient_id
    ON public.vaccination_records (patient_id);

CREATE TRIGGER trg_vaccination_records_updated_at
    BEFORE UPDATE ON public.vaccination_records
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS for vaccination_records
-- ============================================================
ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;

-- Patients read own; doctors/staff/admin read all
CREATE POLICY "vaccination_records_select"
    ON public.vaccination_records
    FOR SELECT
    USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
        OR public.has_any_role(ARRAY['doctor'::app_role, 'staff'::app_role, 'admin'::app_role, 'super_admin'::app_role])
    );

-- Staff/admin can insert
CREATE POLICY "vaccination_records_insert_staff"
    ON public.vaccination_records
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_any_role(ARRAY['staff'::app_role, 'admin'::app_role, 'super_admin'::app_role])
    );

-- Staff/admin can update
CREATE POLICY "vaccination_records_update_staff"
    ON public.vaccination_records
    FOR UPDATE
    TO authenticated
    USING (
        public.has_any_role(ARRAY['staff'::app_role, 'admin'::app_role, 'super_admin'::app_role])
    );

-- Staff/admin can delete
CREATE POLICY "vaccination_records_delete_staff"
    ON public.vaccination_records
    FOR DELETE
    TO authenticated
    USING (
        public.has_any_role(ARRAY['staff'::app_role, 'admin'::app_role, 'super_admin'::app_role])
    );
```

## Client-side behaviour until SQL is deployed

- **Allergies**: `getAllergiesByPatientId()` returns empty array with `console.warn`. `addAllergy()`/`updateAllergy()`/`removeAllergy()` reject with error and show a toast.
- **Vaccination records**: `getVaccinationsByPatientId()` returns empty array with `console.warn`. `addVaccinationRecord()` rejects with error and shows a toast.

## Methods returning controlled errors

These method signatures are kept for forward compatibility but return `throwError()` with a migration message.
Each indicates exactly which Supabase resource to use as a replacement.

| Method | Supabase Replacement |
|---|---|
| `fetchConsultation(id)` | `.from('consultation_record_view').select('*').eq('consultation_id', id)` |
| `createConsultation(body)` | `supabase.rpc('save_consultation_record', { p_booking_id, ... })` |
| `updateConsultation(id, body)` | `supabase.rpc('save_consultation_record', { p_booking_id, ... })` |
| `lockConsultation$(id)` | `.from('consultations').update({status:'Completed'}).eq('id', id)` |
| `saveVitalSigns(consultationId, body)` | `.from('consultation_vital_signs').insert({consultation_id, systolic_bp, ...})` |
| `addDiagnosis(consultationId, body)` | `.from('consultation_diagnoses').insert({consultation_id, diagnosis_text, ...})` |
| `deleteDiagnosis(consultationId, diagnosisId)` | `.from('consultation_diagnoses').delete().eq('id', diagnosisId)` |
| `addPrescription(consultationId, body)` | `.from('prescriptions').insert() + prescription_items` |
| `updatePrescription(consultationId, prescriptionId, body)` | `.from('prescriptions').update() + prescription_items` |
| `deletePrescription(consultationId, prescriptionId)` | `.from('prescriptions').delete().eq('id', prescriptionId)` |
| `addLabRequest(consultationId, body)` | `.from('lab_orders').insert() + lab_order_items` |
| `deleteLabRequest(consultationId, requestId)` | `.from('lab_orders').delete().eq('id', requestId)` |

import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, from, map, of, throwError } from 'rxjs';
import {
  Allergy,
  Consultation,
  Diagnosis,
  FollowUp,
  LabRequest,
  LabResult,
  Prescription,
  PrescriptionItem,
  VitalSigns
} from '../models';
import { SupabaseService } from './supabase.service';

export interface MedicalRecordsState {
  consultations: Consultation[];
  prescriptions: Prescription[];
  allergies: Allergy[];
  labRequests: LabRequest[];
  labResults: LabResult[];
  vaccinations: VaccinationRecord[];
  followUps: FollowUp[];
  isLoading: boolean;
  error: string | null;
}

// Re-export the VaccinationRecord type alias so consumers don't break
export type VaccinationRecord = import('../models').VaccinationRecord;

/**
 * Named request interfaces kept for forward compatibility.
 * These are not yet wired to Supabase — they document the shape
 * that a future RPC-based implementation will accept.
 */
export interface ConsultationUpsertRequest {
  bookingId: string;
  chiefComplaint: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  historyOfPresentIllness?: string;
  peGeneralFindings?: string;
  followUpDate?: string;
  consultationTime?: string;
}

export interface DiagnosisUpsertRequest {
  icd10Code?: string;
  icd10Description?: string;
  description: string;
  type: Diagnosis['type'];
}

export interface PrescriptionUpsertRequest {
  notes?: string;
  items: Array<{
    medicineName: string;
    genericName?: string;
    dosageForm: string;
    strength: string;
    sig: string;
    quantity: number;
    frequency?: string;
    duration?: string;
    instructions?: string;
    isControlledSubstance?: boolean;
    route?: string;
    routeDescription?: string;
    unitOfMeasure?: string;
    unitOfMeasureDescription?: string;
    frequencyCode?: string;
    brandName?: string;
  }>;
}

export interface LabRequestUpsertRequest {
  testName: string;
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class MedicalRecordsService {
  private readonly supabase = inject(SupabaseService).client;

  // ================================================================
  // CONSULTATION CRUD — NOT IMPLEMENTED
  // These methods were previously wired to .NET API endpoints.
  // Supabase tables exist (consultations, consultation_vital_signs,
  // consultation_soap_notes, consultation_diagnoses, prescriptions,
  // prescription_items, lab_orders, lab_order_items) but a
  // frontend-ready RPC has not been deployed yet.
  // Migrate to supabase.rpc('save_consultation_record', ...) when ready.
  // ================================================================

  fetchConsultation(_id: string): Observable<Consultation> {
    return throwError(() => new Error(
      'fetchConsultation is not available — migrate to Supabase consultation_record_view query.'
    ));
  }

  createConsultation(_body: ConsultationUpsertRequest): Observable<Consultation> {
    return throwError(() => new Error(
      'createConsultation is not available — migrate to supabase.rpc(\'save_consultation_record\', ...).'
    ));
  }

  updateConsultation(_id: string, _body: ConsultationUpsertRequest): Observable<Consultation> {
    return throwError(() => new Error(
      'updateConsultation is not available — migrate to supabase.rpc(\'save_consultation_record\', ...).'
    ));
  }

  lockConsultation$(_id: string): Observable<Consultation> {
    return throwError(() => new Error(
      'lockConsultation$ is not available — migrate to supabase.from(\'consultations\').update({status:\'Completed\'}).'
    ));
  }

  saveVitalSigns(_consultationId: string, _body: VitalSigns): Observable<VitalSigns> {
    return throwError(() => new Error(
      'saveVitalSigns is not available — migrate to supabase.from(\'consultation_vital_signs\').insert(...).'
    ));
  }

  addDiagnosis(_consultationId: string, _body: DiagnosisUpsertRequest): Observable<Diagnosis> {
    return throwError(() => new Error(
      'addDiagnosis is not available — migrate to supabase.from(\'consultation_diagnoses\').insert(...).'
    ));
  }

  deleteDiagnosis(_consultationId: string, _diagnosisId: string): Observable<void> {
    return throwError(() => new Error(
      'deleteDiagnosis is not available — migrate to supabase.from(\'consultation_diagnoses\').delete().'
    ));
  }

  addPrescription(_consultationId: string, _body: PrescriptionUpsertRequest): Observable<Prescription> {
    return throwError(() => new Error(
      'addPrescription is not available — migrate to supabase.from(\'prescriptions\').insert(...) + prescription_items.'
    ));
  }

  updatePrescription(_consultationId: string, _prescriptionId: string, _body: PrescriptionUpsertRequest): Observable<Prescription> {
    return throwError(() => new Error(
      'updatePrescription is not available — migrate to supabase.from(\'prescriptions\').update(...) + prescription_items.'
    ));
  }

  deletePrescription(_consultationId: string, _prescriptionId: string): Observable<void> {
    return throwError(() => new Error(
      'deletePrescription is not available — migrate to supabase.from(\'prescriptions\').delete().'
    ));
  }

  addLabRequest(_consultationId: string, _body: LabRequestUpsertRequest): Observable<LabRequest> {
    return throwError(() => new Error(
      'addLabRequest is not available — migrate to supabase.from(\'lab_orders\').insert(...) + lab_order_items.'
    ));
  }

  deleteLabRequest(_consultationId: string, _requestId: string): Observable<void> {
    return throwError(() => new Error(
      'deleteLabRequest is not available — migrate to supabase.from(\'lab_orders\').delete().'
    ));
  }

  // ================================================================
  // SUPABASE-BASED FULL PATIENT RECORDS (the only API method that IS used)
  // ================================================================

  fetchPatientMedicalRecords(patientId: string): Observable<MedicalRecordsState> {
    const consultations$ = from(
      this.supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) return [] as Consultation[];
        return (data ?? []).map((row) => mapConsultationRow(row as Record<string, unknown>));
      })
    );

    const prescriptions$ = from(
      this.supabase
        .from('prescriptions')
        .select('*, prescription_items(*)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) return [] as Prescription[];
        return (data ?? []).map((row) => mapPrescriptionRow(row as Record<string, unknown>));
      })
    );

    const allergies$ = from(
      this.supabase
        .from('allergies')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) return [] as Allergy[];
        return (data ?? []).map((row) => mapAllergyRow(row as Record<string, unknown>));
      })
    );

    const labRequests$ = from(
      this.supabase
        .from('lab_orders')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) return [] as LabRequest[];
        return (data ?? []).map((row) => mapLabOrderRow(row as Record<string, unknown>));
      })
    );

    const labResults$ = from(
      this.supabase
        .from('lab_results_view')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) return [] as LabResult[];
        return (data ?? []).map((row) => mapLabResultViewRow(row as Record<string, unknown>));
      })
    );

    const vaccinations$ = from(
      this.supabase
        .from('vaccination_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) return [] as VaccinationRecord[];
        return (data ?? []).map((row) => mapVaccinationRow(row as Record<string, unknown>));
      })
    );

    const followUps$ = from(
      this.supabase
        .from('consultation_follow_ups')
        .select('*')
        .eq('patient_id', patientId)
        .order('follow_up_date', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) return [] as FollowUp[];
        return (data ?? []).map((row) => mapFollowUpRow(row as Record<string, unknown>));
      })
    );

    return forkJoin({
      consultations: consultations$,
      prescriptions: prescriptions$,
      allergies: allergies$,
      labRequests: labRequests$,
      labResults: labResults$,
      vaccinations: vaccinations$,
      followUps: followUps$
    }).pipe(
      map((results) => ({
        ...results,
        isLoading: false,
        error: null
      })),
      map((state) => state as MedicalRecordsState)
    );
  }

  // ================================================================
  // SUPABASE-BASED QUERIES (individual)
  // ================================================================

  getConsultationByBookingId(bookingId: string): Observable<Consultation | undefined> {
    return from(
      this.supabase
        .from('consultations')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not fetch consultation by booking:', error.message);
          return undefined;
        }
        return data ? mapConsultationRow(data as Record<string, unknown>) : undefined;
      }),
      catchError(() => of(undefined))
    );
  }

  getConsultationsByPatientId(patientId: string): Observable<Consultation[]> {
    return from(
      this.supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not fetch consultations:', error.message);
          return [];
        }
        return (data ?? []).map((row) => mapConsultationRow(row as Record<string, unknown>));
      }),
      catchError(() => of([]))
    );
  }

  getConsultationsByDoctorId(doctorId: string): Observable<Consultation[]> {
    return from(
      this.supabase
        .from('consultations')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not fetch consultations:', error.message);
          return [];
        }
        return (data ?? []).map((row) => mapConsultationRow(row as Record<string, unknown>));
      }),
      catchError(() => of([]))
    );
  }

  getPrescriptionsByPatientId(patientId: string): Observable<Prescription[]> {
    return from(
      this.supabase
        .from('prescriptions')
        .select('*, prescription_items(*)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not fetch prescriptions:', error.message);
          return [];
        }
        return (data ?? []).map((row) => mapPrescriptionRow(row as Record<string, unknown>));
      }),
      catchError(() => of([]))
    );
  }

  getPrescriptionsByConsultationId(consultationId: string): Observable<Prescription[]> {
    return from(
      this.supabase
        .from('prescriptions')
        .select('*, prescription_items(*)')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not fetch prescriptions:', error.message);
          return [];
        }
        return (data ?? []).map((row) => mapPrescriptionRow(row as Record<string, unknown>));
      }),
      catchError(() => of([]))
    );
  }

  getAllergiesByPatientId(patientId: string): Observable<Allergy[]> {
    return from(
      this.supabase
        .from('allergies')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] allergies table not available:', error.message);
          return [];
        }
        return (data ?? []).map((row) => mapAllergyRow(row as Record<string, unknown>));
      }),
      catchError(() => of([]))
    );
  }

  getLabResultsByPatientId(patientId: string): Observable<LabResult[]> {
    return from(
      this.supabase
        .from('lab_results_view')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not fetch lab results:', error.message);
          return [];
        }
        return (data ?? []).map((row) => mapLabResultViewRow(row as Record<string, unknown>));
      }),
      catchError(() => of([]))
    );
  }

  getLabRequestsByPatientId(patientId: string): Observable<LabRequest[]> {
    return from(
      this.supabase
        .from('lab_orders')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not fetch lab requests:', error.message);
          return [];
        }
        return (data ?? []).map((row) => mapLabOrderRow(row as Record<string, unknown>));
      }),
      catchError(() => of([]))
    );
  }

  getLabRequestsByConsultationId(consultationId: string): Observable<LabRequest[]> {
    return from(
      this.supabase
        .from('lab_orders')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not fetch lab requests:', error.message);
          return [];
        }
        return (data ?? []).map((row) => mapLabOrderRow(row as Record<string, unknown>));
      }),
      catchError(() => of([]))
    );
  }

  getVaccinationsByPatientId(patientId: string): Observable<VaccinationRecord[]> {
    return from(
      this.supabase
        .from('vaccination_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] vaccination_records table not available:', error.message);
          return [];
        }
        return (data ?? []).map((row) => mapVaccinationRow(row as Record<string, unknown>));
      }),
      catchError(() => of([]))
    );
  }

  getFollowUpsByPatientId(patientId: string): Observable<FollowUp[]> {
    return from(
      this.supabase
        .from('consultation_follow_ups')
        .select('*')
        .eq('patient_id', patientId)
        .order('follow_up_date', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not fetch follow-ups:', error.message);
          return [];
        }
        return (data ?? []).map((row) => mapFollowUpRow(row as Record<string, unknown>));
      }),
      catchError(() => of([]))
    );
  }

  // ================================================================
  // SUPABASE-BASED WRITE METHODS
  // ================================================================

  addAllergy(allergy: Allergy): void {
    this.supabase
      .from('allergies')
      .insert({
        patient_id: allergy.patientId,
        allergen: allergy.allergen,
        reaction: allergy.reaction,
        severity: allergy.severity,
        allergen_name: allergy.allergenName,
        allergen_type: allergy.allergenType,
        notes: allergy.notes
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not save allergy:', error.message);
        }
      });
  }

  updateAllergy(allergy: Allergy): void {
    this.supabase
      .from('allergies')
      .update({
        allergen: allergy.allergen,
        reaction: allergy.reaction,
        severity: allergy.severity,
        allergen_name: allergy.allergenName,
        allergen_type: allergy.allergenType,
        notes: allergy.notes
      })
      .eq('id', allergy.id)
      .then(({ error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not update allergy:', error.message);
        }
      });
  }

  removeAllergy(allergyId: string): void {
    this.supabase
      .from('allergies')
      .delete()
      .eq('id', allergyId)
      .then(({ error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not remove allergy:', error.message);
        }
      });
  }

  addLabResult(labResult: LabResult): void {
    this.supabase
      .from('lab_results')
      .insert({
        patient_id: labResult.patientId,
        consultation_id: labResult.consultationId || undefined,
        file_name: labResult.fileName,
        notes: labResult.notes || undefined,
        status: 'Uploaded'
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not save lab result:', error.message);
        }
      });
  }

  addVaccinationRecord(vaccinationRecord: VaccinationRecord): void {
    this.supabase
      .from('vaccination_records')
      .insert({
        patient_id: vaccinationRecord.patientId,
        vaccine_name: vaccinationRecord.vaccineName,
        brand_name: vaccinationRecord.brandName,
        dose_number: vaccinationRecord.doseNumber != null ? String(vaccinationRecord.doseNumber) : undefined,
        lot_number: vaccinationRecord.lotNumber,
        date_given: vaccinationRecord.dateGiven,
        administered_by: vaccinationRecord.administeredBy,
        date_administered: vaccinationRecord.dateAdministered,
        administered_by_user_id: vaccinationRecord.administeredByUserId,
        next_dose_date: vaccinationRecord.nextDoseDate,
        remarks: vaccinationRecord.remarks
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] vaccination_records table not available:', error.message);
        }
      });
  }

  addFollowUp(followUp: FollowUp): void {
    this.supabase
      .from('consultation_follow_ups')
      .insert({
        consultation_id: followUp.consultationId,
        patient_id: followUp.patientId,
        doctor_id: followUp.doctorId,
        follow_up_date: followUp.followUpDate,
        reason: followUp.reason,
        status: followUp.status === 'Completed' ? 'Completed' : 'Pending'
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[MedicalRecordsService] Could not save follow-up:', error.message);
        }
      });
  }
}

// ================================================================
// SUPABASE ROW → MODEL MAPPERS
// ================================================================

function mapConsultationRow(row: Record<string, unknown>): Consultation {
  const id = String(row['id'] ?? '');
  return {
    id,
    bookingId: String(row['booking_id'] ?? ''),
    patientId: String(row['patient_id'] ?? ''),
    doctorId: String(row['doctor_id'] ?? ''),
    consultationDate: String(row['created_at'] ?? ''),
    generalNotes: row['general_notes'] ? String(row['general_notes']) : undefined,
    chiefComplaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    status: normalizeConsultationStatus(String(row['status'] ?? 'Draft')),
    isLocked: String(row['status'] ?? '') === 'Completed',
    diagnoses: [],
    prescriptionIds: [],
    labRequestIds: [],
    createdAt: String(row['created_at'] ?? new Date().toISOString()),
    updatedAt: String(row['updated_at'] ?? new Date().toISOString())
  };
}

function mapPrescriptionRow(row: Record<string, unknown>): Prescription {
  const itemsRaw = row['prescription_items'];
  const items: PrescriptionItem[] = Array.isArray(itemsRaw)
    ? itemsRaw.map((item: Record<string, unknown>) => ({
        id: String(item['id'] ?? ''),
        prescriptionId: String(item['prescription_id'] ?? ''),
        medicineName: String(item['medication_name'] ?? ''),
        genericName: item['generic_name'] ? String(item['generic_name']) : undefined,
        dosageForm: String(item['dosage'] ?? 'Other'),
        strength: String(item['strength'] ?? ''),
        quantity: Number(item['quantity'] ?? 1),
        sig: '',
        frequency: item['frequency'] ? String(item['frequency']) : undefined,
        duration: item['duration'] ? String(item['duration']) : undefined,
        route: item['route'] ? String(item['route']) : undefined,
        instructions: item['instructions'] ? String(item['instructions']) : undefined
      }))
    : [];

  return {
    id: String(row['id'] ?? ''),
    consultationId: String(row['consultation_id'] ?? ''),
    patientId: String(row['patient_id'] ?? ''),
    doctorId: '',
    issuedAt: String(row['created_at'] ?? new Date().toISOString()),
    status: 'Active' as const,
    items,
    notes: row['notes'] ? String(row['notes']) : undefined
  };
}

function mapAllergyRow(row: Record<string, unknown>): Allergy {
  return {
    id: String(row['id'] ?? ''),
    patientId: String(row['patient_id'] ?? ''),
    allergen: String(row['allergen'] ?? ''),
    reaction: String(row['reaction'] ?? ''),
    severity: normalizeAllergySeverity(String(row['severity'] ?? 'Moderate')),
    allergenName: row['allergen_name'] ? String(row['allergen_name']) : undefined,
    allergenType: row['allergen_type'] ? String(row['allergen_type']) as Allergy['allergenType'] : undefined,
    notes: row['notes'] ? String(row['notes']) : undefined
  };
}

function mapLabResultViewRow(row: Record<string, unknown>): LabResult {
  return {
    id: String(row['id'] ?? ''),
    labRequestId: String(row['lab_order_item_id'] ?? ''),
    patientId: String(row['patient_id'] ?? ''),
    consultationId: row['consultation_id'] ? String(row['consultation_id']) : undefined,
    fileName: String(row['file_name'] ?? ''),
    resultDate: String(row['created_at'] ?? ''),
    notes: String(row['result_text'] ?? '') || (row['notes'] ? String(row['notes']) : undefined)
  };
}

function mapLabOrderRow(row: Record<string, unknown>): LabRequest {
  return {
    id: String(row['id'] ?? ''),
    consultationId: String(row['consultation_id'] ?? ''),
    patientId: String(row['patient_id'] ?? ''),
    doctorId: '',
    testName: 'Lab order',
    reason: row['notes'] ? String(row['notes']) : undefined,
    status: 'Requested' as const,
    requestedAt: String(row['created_at'] ?? new Date().toISOString())
  };
}

function mapVaccinationRow(row: Record<string, unknown>): VaccinationRecord {
  return {
    id: String(row['id'] ?? ''),
    patientId: String(row['patient_id'] ?? ''),
    vaccineName: String(row['vaccine_name'] ?? ''),
    brandName: row['brand_name'] ? String(row['brand_name']) : undefined,
    doseNumber: row['dose_number'] != null ? String(row['dose_number']) : undefined,
    lotNumber: row['lot_number'] ? String(row['lot_number']) : undefined,
    dateGiven: String(row['date_given'] ?? ''),
    administeredBy: row['administered_by'] ? String(row['administered_by']) : undefined,
    dateAdministered: row['date_administered'] ? String(row['date_administered']) : undefined,
    administeredByUserId: row['administered_by_user_id'] ? String(row['administered_by_user_id']) : undefined,
    nextDoseDate: row['next_dose_date'] ? String(row['next_dose_date']) : undefined,
    remarks: row['remarks'] ? String(row['remarks']) : undefined
  };
}

function mapFollowUpRow(row: Record<string, unknown>): FollowUp {
  return {
    id: String(row['id'] ?? ''),
    consultationId: String(row['consultation_id'] ?? ''),
    patientId: String(row['patient_id'] ?? ''),
    doctorId: String(row['doctor_id'] ?? ''),
    followUpDate: String(row['follow_up_date'] ?? ''),
    reason: String(row['reason'] ?? ''),
    status: normalizeFollowUpStatus(String(row['status'] ?? 'Pending')),
    reminderEnabled: undefined
  };
}

// ================================================================
// NORMALIZER HELPERS
// ================================================================

function normalizeConsultationStatus(value: string): Consultation['status'] {
  switch (value) {
    case 'Completed':
    case 'Locked':
    case 'Amended':
      return value;
    default:
      return 'Draft';
  }
}

function normalizeFollowUpStatus(value: string): FollowUp['status'] {
  switch (value) {
    case 'Completed':
    case 'Cancelled':
      return value;
    default:
      return 'Pending';
  }
}

function normalizeAllergySeverity(value: string): Allergy['severity'] {
  switch (value) {
    case 'Mild':
    case 'Severe':
      return value;
    default:
      return 'Moderate';
  }
}

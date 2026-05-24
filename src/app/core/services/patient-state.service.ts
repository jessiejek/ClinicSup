import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { Patient } from '../models';
import { SupabaseService } from './supabase.service';

type NullableString = string | null | undefined;

interface PatientRow {
  id: string;
  patient_code?: NullableString;
  first_name?: NullableString;
  middle_name?: NullableString;
  last_name?: NullableString;
  date_of_birth?: NullableString;
  sex?: NullableString;
  civil_status?: NullableString;
  address?: NullableString;
  city?: NullableString;
  zip_code?: NullableString;
  contact_number?: NullableString;
  contact_email?: NullableString;
  emergency_contact_name?: NullableString;
  emergency_contact_number?: NullableString;
  emergency_contact_relationship?: NullableString;
  blood_type?: NullableString;
  phil_health_number?: NullableString;
  hmo_provider?: NullableString;
  hmo_card_number?: NullableString;
  user_id?: NullableString;
  is_guest?: boolean | null;
  consented_at?: NullableString;
  consent_version?: NullableString;
}

@Injectable({ providedIn: 'root' })
export class PatientStateService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly patientsSubject = new BehaviorSubject<Patient[]>([]);
  private readonly loadingSubject = new BehaviorSubject(false);

  readonly patients$ = this.patientsSubject.asObservable();
  readonly isLoading$ = this.loadingSubject.asObservable();

  /**
   * Reload the patient cache from Supabase.
   */
  refresh(): void {
    this.loadingSubject.next(true);
    from(this.fetchPatients()).subscribe({
      next: (patients) => {
        this.patientsSubject.next(patients);
        this.loadingSubject.next(false);
      },
      error: () => {
        this.loadingSubject.next(false);
      }
    });
  }

  /**
   * Returns the cached patient list as an observable.
   * On first call, triggers a refresh if the cache is empty.
   */
  getPatients(): Observable<Patient[]> {
    if (this.patientsSubject.value.length === 0) {
      this.refresh();
    }
    return this.patients$;
  }

  /**
   * Returns a single patient by ID, querying Supabase directly.
   * Falls back to cached data if found there.
   */
  getPatientById(id: string): Observable<Patient | undefined> {
    const cached = this.patientsSubject.value.find((p) => p.id === id);
    if (cached) return from([cached]);

    return from(this.fetchPatientById(id));
  }

  /**
   * Filters patients by user_id (Supabase Auth user).
   */
  getPatientByUserId(userId: string): Observable<Patient | undefined> {
    return from(this.fetchPatientByUserId(userId));
  }

  /**
   * Searches patients by name, patient code, email, or contact number.
   * Delegates to Supabase ILIKE filtering.
   */
  getFilteredPatients(query: string): Observable<Patient[]> {
    if (!query?.trim()) {
      return this.getPatients();
    }
    return from(this.fetchFilteredPatients(query.trim()));
  }

  /**
   * Creates a new patient in Supabase.
   * ⚠ Not currently called from any page — kept as a safe wrapper.
   */
  addPatient(input: { firstName: string; lastName: string; dateOfBirth?: string; sex?: string; contactNumber?: string; email?: string }): Observable<Patient> {
    return from(this.insertPatient(input));
  }

  /**
   * Updates an existing patient in Supabase.
   * ⚠ Not currently called from any page — kept as a safe wrapper.
   */
  savePatient(patient: Patient): Observable<Patient> {
    return from(this.updatePatient(patient));
  }

  /**
   * Updates the consent timestamp and version for a patient.
   * ⚠ Not currently called from any page — kept as a safe wrapper.
   */
  updatePatientConsent(patientId: string, consentVersion: string): Observable<Patient> {
    return from(this.patchPatientConsent(patientId, consentVersion));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async fetchPatients(): Promise<Patient[]> {
    const { data, error } = await this.supabase
      .from('patients')
      .select('*')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .limit(200);

    if (error) {
      console.warn('[PatientStateService] Failed to fetch patients:', error.message);
      return [];
    }

    return ((data ?? []) as PatientRow[]).map(mapPatientDetailFromRow);
  }

  private async fetchPatientById(id: string): Promise<Patient | undefined> {
    const { data, error } = await this.supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn('[PatientStateService] Failed to fetch patient by ID:', error.message);
      return undefined;
    }

    return data ? mapPatientDetailFromRow(data as PatientRow) : undefined;
  }

  private async fetchPatientByUserId(userId: string): Promise<Patient | undefined> {
    const { data, error } = await this.supabase
      .from('patients')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[PatientStateService] Failed to fetch patient by user ID:', error.message);
      return undefined;
    }

    return data ? mapPatientDetailFromRow(data as PatientRow) : undefined;
  }

  private async fetchFilteredPatients(query: string): Promise<Patient[]> {
    const term = `%${query}%`;

    const { data, error } = await this.supabase
      .from('patients')
      .select('*')
      .or(`first_name.ilike.${term},last_name.ilike.${term},patient_code.ilike.${term},contact_number.ilike.${term},contact_email.ilike.${term}`)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .limit(50);

    if (error) {
      console.warn('[PatientStateService] Failed to filter patients:', error.message);
      return [];
    }

    return ((data ?? []) as PatientRow[]).map(mapPatientDetailFromRow);
  }

  private async insertPatient(input: { firstName: string; lastName: string; dateOfBirth?: string; sex?: string; contactNumber?: string; email?: string }): Promise<Patient> {
    const { data, error } = await this.supabase
      .from('patients')
      .insert({
        first_name: input.firstName,
        last_name: input.lastName,
        date_of_birth: input.dateOfBirth ?? null,
        sex: input.sex ?? null,
        contact_number: input.contactNumber ?? null,
        contact_email: input.email ?? null,
        is_guest: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create patient: ${error.message}`);
    }

    const patient = mapPatientDetailFromRow(data as PatientRow);
    this.upsertCache(patient);
    return patient;
  }

  private async updatePatient(patient: Patient): Promise<Patient> {
    const payload: Record<string, unknown> = {
      first_name: patient.firstName,
      middle_name: patient.middleName ?? null,
      last_name: patient.lastName,
      date_of_birth: patient.dateOfBirth || null,
      sex: patient.sex || null,
      civil_status: patient.civilStatus ?? null,
      address: patient.address ?? null,
      city: patient.city ?? null,
      zip_code: patient.zipCode ?? null,
      contact_number: patient.contactNumber ?? null,
      contact_email: patient.email ?? null,
      emergency_contact_name: patient.emergencyContactName ?? null,
      emergency_contact_number: patient.emergencyContactNumber ?? null,
      emergency_contact_relationship: patient.emergencyContactRelationship ?? null,
      blood_type: patient.bloodType ?? null,
      phil_health_number: patient.philHealthNumber ?? null,
      hmo_provider: patient.hmoProvider ?? null,
      hmo_card_number: patient.hmoCardNumber ?? null,
    };

    const { data, error } = await this.supabase
      .from('patients')
      .update(payload)
      .eq('id', patient.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save patient: ${error.message}`);
    }

    const updated = mapPatientDetailFromRow(data as PatientRow);
    this.upsertCache(updated);
    return updated;
  }

  private async patchPatientConsent(patientId: string, consentVersion: string): Promise<Patient> {
    const { data, error } = await this.supabase
      .from('patients')
      .update({
        consented_at: new Date().toISOString(),
        consent_version: consentVersion,
      })
      .eq('id', patientId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update patient consent: ${error.message}`);
    }

    const updated = mapPatientDetailFromRow(data as PatientRow);
    this.upsertCache(updated);
    return updated;
  }

  private upsertCache(patient: Patient): void {
    const current = this.patientsSubject.value;
    const idx = current.findIndex((p) => p.id === patient.id);
    if (idx >= 0) {
      const copy = [...current];
      copy[idx] = patient;
      this.patientsSubject.next(copy);
    } else {
      this.patientsSubject.next([...current, patient]);
    }
  }
}

// ---------------------------------------------------------------------------
// Mapping helpers (kept local — mirrors AdminPatientsService mapping)
// ---------------------------------------------------------------------------

function mapPatientDetailFromRow(row: PatientRow): Patient {
  return {
    id: row.id,
    patientCode: trimStr(row.patient_code) || row.id,
    firstName: trimStr(row.first_name) || '',
    middleName: trimStr(row.middle_name),
    lastName: trimStr(row.last_name) || '',
    dateOfBirth: trimStr(row.date_of_birth) || '',
    sex: trimStr(row.sex) || '',
    civilStatus: trimStr(row.civil_status),
    address: trimStr(row.address),
    city: trimStr(row.city),
    zipCode: trimStr(row.zip_code),
    contactNumber: trimStr(row.contact_number),
    email: trimStr(row.contact_email),
    emergencyContactName: trimStr(row.emergency_contact_name),
    emergencyContactNumber: trimStr(row.emergency_contact_number),
    emergencyContactRelationship: trimStr(row.emergency_contact_relationship),
    bloodType: trimStr(row.blood_type),
    philHealthNumber: trimStr(row.phil_health_number),
    hmoProvider: trimStr(row.hmo_provider),
    hmoCardNumber: trimStr(row.hmo_card_number),
    userId: trimStr(row.user_id),
    hasAccount: Boolean(row.user_id),
    isEmailVerified: undefined,
    isGuest: Boolean(row.is_guest),
    consentedAt: trimStr(row.consented_at),
    consentVersion: trimStr(row.consent_version),
  };
}

function trimStr(value: NullableString): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t || undefined;
}

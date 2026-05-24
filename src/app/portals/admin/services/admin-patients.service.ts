import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  CreatePatientPortalAccountRequest,
  CreatePatientRequest,
  PagedResult,
  PatientDetail,
  PatientSummary,
  UpdatePatientRequest
} from '../../../core/models';

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

export interface PatientAccountRegistrationRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
  avatarUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminPatientsService {
  private readonly supabase = inject(SupabaseService).client;

  getPatients(page = 1, pageSize = 20, search?: string): Observable<PagedResult<PatientSummary>> {
    return from(this.fetchPatients(page, pageSize, search));
  }

  createPatient(dto: CreatePatientRequest): Observable<PatientDetail> {
    return from(this.createPatientAsync(dto));
  }

  /**
   * Creates a guest patient (walk-in) with no auth user link.
   * Sets user_id = null and is_guest = true.
   * Used by staff walk-in registration flow.
   */
  createGuestPatient(dto: CreatePatientRequest): Observable<PatientDetail> {
    return from(this.createGuestPatientAsync(dto));
  }

  registerPatientAccount(dto: PatientAccountRegistrationRequest): Observable<string> {
    // Deferred: Supabase admin auth user creation needs a secure Edge Function.
    // For now, return a placeholder error to prevent silent failures.
    throw new Error('Patient account registration is not yet available via Supabase direct. Use Supabase Auth admin API.');
  }

  getPatientById(id: string): Observable<PatientDetail> {
    return from(this.fetchPatientById(id));
  }

  updatePatient(id: string, dto: UpdatePatientRequest): Observable<PatientDetail> {
    return from(this.updatePatientAsync(id, dto));
  }

  createPatientPortalAccount(id: string, dto: CreatePatientPortalAccountRequest): Observable<PatientDetail> {
    // Deferred: requires Supabase admin auth user creation via Edge Function.
    // For now, just update the patient record with email reference.
    return from(this.updatePatientContactEmail(id, dto.email));
  }

  addPatient(dto: CreatePatientRequest): Observable<PatientDetail> {
    return this.createPatient(dto);
  }

  private async fetchPatients(page: number, pageSize: number, search?: string): Promise<PagedResult<PatientSummary>> {
    let query = this.supabase
      .from('patients')
      .select('id, patient_code, first_name, middle_name, last_name, date_of_birth, sex, contact_number, contact_email, user_id, is_guest', { count: 'exact' })
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search?.trim()) {
      const term = search.trim();
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,patient_code.ilike.%${term}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const items = ((data ?? []) as PatientRow[]).map((row) => mapPatientSummaryFromRow(row));
    const totalCount = count ?? items.length;

    return {
      items,
      totalCount,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
    };
  }

  private async fetchPatientById(id: string): Promise<PatientDetail> {
    const { data, error } = await this.supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Patient not found.');

    return mapPatientDetailFromRow(data as PatientRow);
  }

  private async createPatientAsync(dto: CreatePatientRequest): Promise<PatientDetail> {
    const { data, error } = await this.supabase
      .from('patients')
      .insert({
        first_name: dto.firstName,
        middle_name: dto.middleName ?? null,
        last_name: dto.lastName,
        date_of_birth: dto.dateOfBirth ?? null,
        sex: dto.sex ?? null,
        contact_number: dto.contactNumber ?? null,
        contact_email: dto.email ?? null,
        address: dto.address ?? null,
        is_guest: false,
      })
      .select()
      .single();

    if (error) throw error;
    return mapPatientDetailFromRow(data as PatientRow);
  }

  /**
   * Creates a guest patient (walk-in) with no auth user link.
   * Sets user_id = null and is_guest = true.
   * No profiles or user_roles row is created.
   */
  private async createGuestPatientAsync(dto: CreatePatientRequest): Promise<PatientDetail> {
    // Guest walk-in patient: no auth.users row, no profiles row, no user_roles row.
    // patient_code generated client-side until DB-side auto-generation is added.
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const patientCode = `WALK-${dateStr}-${rand}`;

    const { data, error } = await this.supabase
      .from('patients')
      .insert({
        patient_code: patientCode,
        first_name: dto.firstName,
        middle_name: dto.middleName ?? null,
        last_name: dto.lastName,
        date_of_birth: dto.dateOfBirth ?? null,
        sex: dto.sex ?? null,
        contact_number: dto.contactNumber ?? null,
        contact_email: dto.email ?? null,
        address: dto.address ?? null,
        user_id: null,
        is_guest: true,
      })
      .select()
      .single();

    if (error) throw error;
    return mapPatientDetailFromRow(data as PatientRow);
  }

  private async updatePatientAsync(id: string, dto: UpdatePatientRequest): Promise<PatientDetail> {
    const payload: Record<string, unknown> = {};
    const fieldMap: Record<string, string> = {
      firstName: 'first_name', middleName: 'middle_name', lastName: 'last_name',
      dateOfBirth: 'date_of_birth', sex: 'sex', civilStatus: 'civil_status',
      address: 'address', city: 'city', zipCode: 'zip_code',
      contactNumber: 'contact_number', email: 'contact_email',
      emergencyContactName: 'emergency_contact_name',
      emergencyContactNumber: 'emergency_contact_number',
      emergencyContactRelationship: 'emergency_contact_relationship',
      bloodType: 'blood_type', philHealthNumber: 'phil_health_number',
      hmoProvider: 'hmo_provider', hmoCardNumber: 'hmo_card_number',
    };

    for (const [camel, snake] of Object.entries(fieldMap)) {
      const val = (dto as Record<string, unknown>)[camel];
      if (val !== undefined) payload[snake] = val;
    }

    const { data, error } = await this.supabase
      .from('patients')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapPatientDetailFromRow(data as PatientRow);
  }

  private async updatePatientContactEmail(id: string, email: string): Promise<PatientDetail> {
    const { data, error } = await this.supabase
      .from('patients')
      .update({ contact_email: email.trim() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapPatientDetailFromRow(data as PatientRow);
  }
}

function mapPatientSummaryFromRow(row: PatientRow): PatientSummary {
  return {
    id: row.id,
    patientCode: trimStr(row.patient_code) || row.id,
    firstName: trimStr(row.first_name) || '',
    middleName: trimStr(row.middle_name),
    lastName: trimStr(row.last_name) || '',
    fullName: composeName(row.first_name, row.middle_name, row.last_name),
    dateOfBirth: trimStr(row.date_of_birth) || '',
    sex: trimStr(row.sex) || '',
    contactNumber: trimStr(row.contact_number),
    email: trimStr(row.contact_email),
    userId: trimStr(row.user_id),
    hasAccount: Boolean(row.user_id),
    isGuest: Boolean(row.is_guest),
  };
}

function mapPatientDetailFromRow(row: PatientRow): PatientDetail {
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

function composeName(first: NullableString, middle: NullableString, last: NullableString): string {
  const parts = [first, middle, last].map((v) => trimStr(v)).filter((v): v is string => Boolean(v));
  return parts.length ? parts.join(' ') : 'Patient';
}

function trimStr(value: NullableString): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t || undefined;
}

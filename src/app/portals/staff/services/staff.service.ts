import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { BookingService } from '../../../core/services/booking.service';
import { PagedResult, PatientDetail, PatientSummary } from '../../../core/models';

type NullableString = string | null | undefined;

interface PatientRow {
  id: string;
  patient_code?: NullableString;
  first_name?: NullableString;
  middle_name?: NullableString;
  last_name?: NullableString;
  full_name?: NullableString;
  date_of_birth?: NullableString;
  sex?: NullableString;
  contact_number?: NullableString;
  contact_email?: NullableString;
  user_id?: NullableString;
  is_guest?: boolean | null;
}

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly bookingService = inject(BookingService);

  getDoctors = () =>
    from(this.fetchDoctors()).pipe(
      map((doctors) =>
        doctors.map((d) => ({
          id: d.id,
          fullName: d.fullName,
          specialization: d.specialization,
        }))
      )
    );

  getPatients = (page = 1, pageSize = 20, search?: string) =>
    from(this.fetchPatients(page, pageSize, search));

  getPatientById(id: string): Observable<PatientDetail> {
    return from(this.fetchPatientById(id));
  }

  createPatientPortalAccount(patientId: string, dto: { email: string; temporaryPassword: string }): Observable<PatientDetail> {
    // Deferred: requires Supabase admin auth user creation via Edge Function.
    // For now, just update the patient's contact email.
    return from(this.updatePatientEmail(patientId, dto.email));
  }

  getBookings = () => this.bookingService.getBookings();
  getTodaysBookings = () => this.bookingService.getTodaysBookings();

  private async fetchDoctors(): Promise<Array<{ id: string; fullName: string; specialization: string }>> {
    const { data, error } = await this.supabase
      .from('doctors')
      .select('id, full_name, specialization')
      .eq('status', 'Active')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: trimStr(row['id']) ?? '',
      fullName: trimStr(row['full_name']) ?? 'Doctor',
      specialization: trimStr(row['specialization']) ?? '',
    }));
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

    const row = data as Record<string, unknown>;
    return {
      id: trimStr(row['id']) ?? '',
      patientCode: trimStr(row['patient_code']) ?? trimStr(row['id']) ?? '',
      firstName: trimStr(row['first_name']) ?? '',
      middleName: trimStr(row['middle_name']),
      lastName: trimStr(row['last_name']) ?? '',
      dateOfBirth: trimStr(row['date_of_birth']) ?? '',
      sex: trimStr(row['sex']) ?? '',
      civilStatus: trimStr(row['civil_status']),
      address: trimStr(row['address']),
      city: trimStr(row['city']),
      zipCode: trimStr(row['zip_code']),
      contactNumber: trimStr(row['contact_number']),
      email: trimStr(row['contact_email']),
      emergencyContactName: trimStr(row['emergency_contact_name']),
      emergencyContactNumber: trimStr(row['emergency_contact_number']),
      emergencyContactRelationship: trimStr(row['emergency_contact_relationship']),
      bloodType: trimStr(row['blood_type']),
      philHealthNumber: trimStr(row['phil_health_number']),
      hmoProvider: trimStr(row['hmo_provider']),
      hmoCardNumber: trimStr(row['hmo_card_number']),
      userId: trimStr(row['user_id']),
      hasAccount: Boolean(row['user_id']),
      isEmailVerified: undefined,
      isGuest: Boolean(row['is_guest']),
      consentedAt: trimStr(row['consented_at']),
      consentVersion: trimStr(row['consent_version']),
    };
  }

  private async updatePatientEmail(patientId: string, email: string): Promise<PatientDetail> {
    const { data, error } = await this.supabase
      .from('patients')
      .update({ contact_email: email.trim() })
      .eq('id', patientId)
      .select()
      .single();

    if (error) throw error;
    const row = data as Record<string, unknown>;
    return {
      id: trimStr(row['id']) ?? '',
      patientCode: trimStr(row['patient_code']) ?? '',
      firstName: trimStr(row['first_name']) ?? '',
      middleName: trimStr(row['middle_name']),
      lastName: trimStr(row['last_name']) ?? '',
      dateOfBirth: trimStr(row['date_of_birth']) ?? '',
      sex: trimStr(row['sex']) ?? '',
      civilStatus: trimStr(row['civil_status']),
      address: trimStr(row['address']),
      city: trimStr(row['city']),
      zipCode: trimStr(row['zip_code']),
      contactNumber: trimStr(row['contact_number']),
      email: trimStr(row['contact_email']),
      emergencyContactName: trimStr(row['emergency_contact_name']),
      emergencyContactNumber: trimStr(row['emergency_contact_number']),
      emergencyContactRelationship: trimStr(row['emergency_contact_relationship']),
      bloodType: trimStr(row['blood_type']),
      philHealthNumber: trimStr(row['phil_health_number']),
      hmoProvider: trimStr(row['hmo_provider']),
      hmoCardNumber: trimStr(row['hmo_card_number']),
      userId: trimStr(row['user_id']),
      hasAccount: Boolean(row['user_id']),
      isEmailVerified: undefined,
      isGuest: Boolean(row['is_guest']),
      consentedAt: trimStr(row['consented_at']),
      consentVersion: trimStr(row['consent_version']),
    };
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

function trimStr(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t || undefined;
}

function composeName(first: unknown, middle: unknown, last: unknown): string {
  const parts = [first, middle, last].map((v) => trimStr(v)).filter((v): v is string => Boolean(v));
  return parts.length ? parts.join(' ') : 'Patient';
}

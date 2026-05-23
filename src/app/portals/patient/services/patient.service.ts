import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { BookingService } from '../../../core/services/booking.service';
import {
  Booking,
  Consultation,
  Patient,
  Prescription,
  UpdatePatientRequest
} from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly authState = inject(AuthStateService);
  private readonly bookingService = inject(BookingService);

  getMyProfile(): Observable<Patient> {
    return from(this.fetchMyPatient());
  }

  updateMyProfile(dto: UpdatePatientRequest): Observable<Patient> {
    return from(this.updateMyPatient(dto));
  }

  submitConsent(version: string): Observable<Patient> {
    return from(this.submitPatientConsent(version));
  }

  getCurrentPatient(userId: string): Observable<Patient | undefined> {
    return from(this.fetchPatientByUserId(userId));
  }

  getPatientBookings(patientId: string): Observable<Booking[]> {
    return this.bookingService.getBookingsByPatientId(patientId);
  }

  getUpcomingBookings(patientId: string): Observable<Booking[]> {
    return this.bookingService.getUpcomingBookingsByPatientId(patientId);
  }

  getPatientConsultations(patientId: string): Observable<Consultation[]> {
    // Deferred: requires consultation views to be fully queried from Supabase
    // Return empty for now — consultation history is shown via booking detail
    return from(Promise.resolve([]));
  }

  getPatientPrescriptions(patientId: string): Observable<Prescription[]> {
    // Deferred: requires prescriptions in Supabase
    return from(Promise.resolve([]));
  }

  private async fetchMyPatient(): Promise<Patient> {
    const userId = this.authState.snapshot?.id;
    if (!userId) throw new Error('User not authenticated.');

    const patient = await this.fetchPatientByUserId(userId);
    if (!patient) throw new Error('Patient profile not found.');
    return patient;
  }

  private async updateMyPatient(dto: UpdatePatientRequest): Promise<Patient> {
    const userId = this.authState.snapshot?.id;
    if (!userId) throw new Error('User not authenticated.');

    const payload: Record<string, unknown> = {};
    const fieldMap: Record<string, string> = {
      firstName: 'first_name',
      middleName: 'middle_name',
      lastName: 'last_name',
      dateOfBirth: 'date_of_birth',
      sex: 'sex',
      civilStatus: 'civil_status',
      address: 'address',
      city: 'city',
      zipCode: 'zip_code',
      contactNumber: 'contact_number',
      email: 'contact_email',
      emergencyContactName: 'emergency_contact_name',
      emergencyContactNumber: 'emergency_contact_number',
      emergencyContactRelationship: 'emergency_contact_relationship',
      bloodType: 'blood_type',
      philHealthNumber: 'phil_health_number',
      hmoProvider: 'hmo_provider',
      hmoCardNumber: 'hmo_card_number',
    };

    for (const [camel, snake] of Object.entries(fieldMap)) {
      const val = (dto as Record<string, unknown>)[camel];
      if (val !== undefined) payload[snake] = val;
    }

    const { data, error } = await this.supabase
      .from('patients')
      .update(payload)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return mapPatientRow(data as Record<string, unknown>);
  }

  private async submitPatientConsent(version: string): Promise<Patient> {
    const userId = this.authState.snapshot?.id;
    if (!userId) throw new Error('User not authenticated.');

    const { data, error } = await this.supabase
      .from('patients')
      .update({ consent_version: version, consented_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return mapPatientRow(data as Record<string, unknown>);
  }

  private async fetchPatientByUserId(userId: string): Promise<Patient | undefined> {
    const { data, error } = await this.supabase
      .from('patients')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapPatientRow(data as Record<string, unknown>) : undefined;
  }
}

function mapPatientRow(row: Record<string, unknown>): Patient {
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
    isEmailVerified: undefined,
    isGuest: false,
    consentedAt: trimStr(row['consented_at']),
    consentVersion: trimStr(row['consent_version']),
  };
}

function trimStr(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t || undefined;
}

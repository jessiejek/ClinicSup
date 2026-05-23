import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, map, of, switchMap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  Booking,
  Consultation,
  Patient,
  Prescription,
  UpdatePatientRequest
} from '../../../core/models';
import { MockDataService } from '../../../core/services/mock-data.service';

type NullableString = string | null | undefined;

interface PatientDto {
  id: string;
  patientCode?: NullableString;
  firstName?: NullableString;
  middleName?: NullableString;
  lastName?: NullableString;
  fullName?: NullableString;
  dateOfBirth?: NullableString;
  sex?: NullableString;
  civilStatus?: NullableString;
  address?: NullableString;
  city?: NullableString;
  zipCode?: NullableString;
  contactNumber?: NullableString;
  email?: NullableString;
  emergencyContactName?: NullableString;
  emergencyContactNumber?: NullableString;
  emergencyContactRelationship?: NullableString;
  bloodType?: NullableString;
  philHealthNumber?: NullableString;
  hmoProvider?: NullableString;
  hmoCardNumber?: NullableString;
  userId?: NullableString;
  isEmailVerified?: boolean | null;
  isGuest?: boolean | null;
  consentedAt?: NullableString;
  consentVersion?: NullableString;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly apiService = inject(ApiService);
  private readonly mockData = inject(MockDataService);

  getMyProfile(): Observable<Patient> {
    return this.apiService.get<PatientDto>('/patients/me').pipe(map((patient) => mapPatientDetail(patient)));
  }

  updateMyProfile(dto: UpdatePatientRequest): Observable<Patient> {
    return this.apiService.put<PatientDto>('/patients/me', dto).pipe(map((patient) => mapPatientDetail(patient)));
  }

  submitConsent(version: string): Observable<Patient> {
    return this.apiService
      .post<PatientDto | void>('/patients/me/consent', { consentVersion: version })
      .pipe(
        switchMap((patient) => {
          if (isPatientDto(patient)) {
            return of(mapPatientDetail(patient));
          }

          return this.getMyProfile();
        })
      );
  }

  getCurrentPatient(userId: string): Observable<Patient | undefined> {
    return this.getMyProfile().pipe(
      map((patient) => (patient.userId === userId ? patient : undefined)),
      catchError(() => of(undefined))
    );
  }

  getPatientBookings(patientId: string): Observable<Booking[]> {
    return of(
      this.mockData
        .getBookings()
        .filter((booking) => booking.patientId === patientId)
        .sort(
          (a, b) =>
            new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
        )
    ).pipe(delay(300));
  }

  getUpcomingBookings(patientId: string): Observable<Booking[]> {
    const now = new Date();

    return of(
      this.mockData
        .getBookings()
        .filter(
          (booking) =>
            booking.patientId === patientId &&
            new Date(`${booking.appointmentDate}T${booking.slotStartTime}:00`) >= now &&
            ['Pending', 'ProofSubmitted', 'Confirmed', 'OnHold'].includes(booking.status)
        )
        .sort(
          (a, b) =>
            new Date(`${a.appointmentDate}T${a.slotStartTime}:00`).getTime() -
            new Date(`${b.appointmentDate}T${b.slotStartTime}:00`).getTime()
        )
    ).pipe(delay(300));
  }

  getPatientConsultations(patientId: string): Observable<Consultation[]> {
    return of(
      this.mockData
        .getConsultations()
        .filter((consultation) => consultation.patientId === patientId)
        .sort(
          (a, b) =>
            new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime()
        )
    ).pipe(delay(300));
  }

  getPatientPrescriptions(patientId: string): Observable<Prescription[]> {
    return of(
      this.mockData
        .getPrescriptions()
        .filter((prescription) => prescription.patientId === patientId)
        .sort(
          (a, b) =>
            new Date(b.issuedAt ?? b.prescriptionDate ?? '').getTime() -
            new Date(a.issuedAt ?? a.prescriptionDate ?? '').getTime()
        )
    ).pipe(delay(300));
  }
}

function mapPatientDetail(dto: PatientDto): Patient {
  return {
    id: dto.id,
    patientCode: normalizeString(dto.patientCode) || dto.id,
    firstName: normalizeString(dto.firstName) || '',
    middleName: normalizeString(dto.middleName),
    lastName: normalizeString(dto.lastName) || '',
    dateOfBirth: normalizeString(dto.dateOfBirth) || '',
    sex: normalizeString(dto.sex) || '',
    civilStatus: normalizeString(dto.civilStatus),
    address: normalizeString(dto.address),
    city: normalizeString(dto.city),
    zipCode: normalizeString(dto.zipCode),
    contactNumber: normalizeString(dto.contactNumber),
    email: normalizeString(dto.email),
    emergencyContactName: normalizeString(dto.emergencyContactName),
    emergencyContactNumber: normalizeString(dto.emergencyContactNumber),
    emergencyContactRelationship: normalizeString(dto.emergencyContactRelationship),
    bloodType: normalizeString(dto.bloodType),
    philHealthNumber: normalizeString(dto.philHealthNumber),
    hmoProvider: normalizeString(dto.hmoProvider),
    hmoCardNumber: normalizeString(dto.hmoCardNumber),
    userId: normalizeString(dto.userId),
    isEmailVerified: dto.isEmailVerified ?? undefined,
    isGuest: Boolean(dto.isGuest),
    consentedAt: normalizeString(dto.consentedAt),
    consentVersion: normalizeString(dto.consentVersion)
  };
}

function normalizeString(value: NullableString): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isPatientDto(value: unknown): value is PatientDto {
  return typeof value === 'object' && value !== null && 'id' in value;
}

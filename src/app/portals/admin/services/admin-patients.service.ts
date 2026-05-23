import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  AuthSessionDto,
  CreatePatientPortalAccountRequest,
  CreatePatientRequest,
  PagedResult,
  PatientDetail,
  PatientSummary,
  UpdatePatientRequest
} from '../../../core/models';

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
  hasAccount?: boolean | null;
  isEmailVerified?: boolean | null;
  isGuest?: boolean | null;
  consentedAt?: NullableString;
  consentVersion?: NullableString;
}

interface PagedResultDto<T> {
  items: T[];
  totalCount?: number;
  total?: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  private readonly apiService = inject(ApiService);

  getPatients(page = 1, pageSize = 20, search?: string): Observable<PagedResult<PatientSummary>> {
    const params = buildPatientsParams(page, pageSize, search);
    return this.apiService
      .get<PagedResultDto<PatientDto>>('/patients', { params })
      .pipe(map((result) => mapPagedPatientSummaries(result)));
  }

  createPatient(dto: CreatePatientRequest): Observable<PatientDetail> {
    return this.apiService.post<PatientDto>('/patients', dto).pipe(map((patient) => mapPatientDetail(patient)));
  }

  registerPatientAccount(dto: PatientAccountRegistrationRequest): Observable<string> {
    return this.apiService
      .post<AuthSessionDto>('/auth/register', {
        firstName: dto.firstName.trim(),
        middleName: dto.middleName?.trim() || undefined,
        lastName: dto.lastName.trim(),
        email: dto.email.trim(),
        password: dto.password,
        avatarUrl: dto.avatarUrl?.trim() || undefined
      })
      .pipe(
        map((response) => {
          const userId = response.user.id?.trim();
          if (!userId) {
            throw new Error('Register response did not include a user id.');
          }

          return userId;
        })
      );
  }

  getPatientById(id: string): Observable<PatientDetail> {
    return this.apiService
      .get<PatientDto>(`/patients/${encodeURIComponent(id)}`)
      .pipe(map((patient) => mapPatientDetail(patient)));
  }

  updatePatient(id: string, dto: UpdatePatientRequest): Observable<PatientDetail> {
    return this.apiService
      .put<PatientDto>(`/patients/${encodeURIComponent(id)}`, dto)
      .pipe(map((patient) => mapPatientDetail(patient)));
  }

  createPatientPortalAccount(id: string, dto: CreatePatientPortalAccountRequest): Observable<PatientDetail> {
    return this.apiService
      .post<PatientDto>(`/patients/${encodeURIComponent(id)}/portal-account`, {
        email: dto.email.trim(),
        temporaryPassword: dto.temporaryPassword
      })
      .pipe(map((patient) => mapPatientDetail(patient)));
  }

  addPatient(dto: CreatePatientRequest): Observable<PatientDetail> {
    return this.createPatient(dto);
  }
}

function mapPagedPatientSummaries(result: PagedResultDto<PatientDto>): PagedResult<PatientSummary> {
  const totalCount = normalizeNumber(result.totalCount ?? result.total);

  return {
    items: result.items.map((item) => mapPatientSummary(item)),
    totalCount,
    total: totalCount,
    page: normalizeNumber(result.page) || 1,
    pageSize: normalizeNumber(result.pageSize) || result.items.length || 20,
    totalPages: normalizeNumber(result.totalPages)
  };
}

function mapPatientSummary(dto: PatientDto): PatientSummary {
  const firstName = normalizeString(dto.firstName) || '';
  const middleName = normalizeString(dto.middleName);
  const lastName = normalizeString(dto.lastName) || '';

  return {
    id: dto.id,
    patientCode: normalizeString(dto.patientCode) || dto.id,
    firstName,
    middleName,
    lastName,
    fullName: resolvePatientFullName(dto),
    dateOfBirth: normalizeString(dto.dateOfBirth) || '',
    sex: normalizeString(dto.sex) || '',
    contactNumber: normalizeString(dto.contactNumber),
    email: normalizeString(dto.email),
    userId: normalizeString(dto.userId),
    hasAccount: normalizeBoolean(dto.hasAccount),
    isGuest: Boolean(dto.isGuest)
  };
}

function mapPatientDetail(dto: PatientDto): PatientDetail {
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
    hasAccount: normalizeBoolean(dto.hasAccount),
    isEmailVerified: dto.isEmailVerified ?? undefined,
    isGuest: Boolean(dto.isGuest),
    consentedAt: normalizeString(dto.consentedAt),
    consentVersion: normalizeString(dto.consentVersion)
  };
}

function resolvePatientFullName(dto: PatientDto): string {
  const explicitName = normalizeString(dto.fullName);
  if (explicitName) {
    return explicitName;
  }

  const parts = [dto.firstName, dto.middleName, dto.lastName]
    .map((value) => normalizeString(value))
    .filter((value): value is string => Boolean(value));

  return parts.length ? parts.join(' ') : 'Patient';
}

function buildPatientsParams(page: number, pageSize: number, search?: string): HttpParams {
  let params = new HttpParams()
    .set('page', String(Math.max(1, page)))
    .set('pageSize', String(Math.max(1, pageSize)));

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    params = params.set('search', trimmedSearch);
  }

  return params;
}

function normalizeString(value: NullableString): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeBoolean(value: boolean | null | undefined): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

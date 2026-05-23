import { Injectable, inject } from '@angular/core';
import { Observable, delay, map, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { BookingService } from '../../../core/services/booking.service';
import { MockDataService } from '../../../core/services/mock-data.service';
import { CreatePatientPortalAccountRequest, PagedResult, PatientDetail, PatientSummary } from '../../../core/models';

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
  contactNumber?: NullableString;
  email?: NullableString;
  userId?: NullableString;
  hasAccount?: boolean | null;
  isGuest?: boolean | null;
}

interface PagedResultDto<T> {
  items: T[];
  totalCount?: number;
  total?: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly apiService = inject(ApiService);
  private readonly bookingService = inject(BookingService);
  private readonly mockData = inject(MockDataService);

  getDoctors = () => of(this.mockData.getDoctors()).pipe(delay(300));

  getPatients = (page = 1, pageSize = 20, search?: string) =>
    this.apiService
      .get<PagedResultDto<PatientDto>>('/patients', {
        params: buildPatientsParams(page, pageSize, search)
      })
      .pipe(map((result) => mapPagedPatientSummaries(result)));

  getPatientById(id: string): Observable<PatientDetail> {
    return this.apiService.get<PatientDetail>(`/patients/${encodeURIComponent(id)}`);
  }

  createPatientPortalAccount(patientId: string, dto: CreatePatientPortalAccountRequest): Observable<PatientDetail> {
    return this.apiService.post<PatientDetail>(`/patients/${encodeURIComponent(patientId)}/portal-account`, {
      email: dto.email.trim(),
      temporaryPassword: dto.temporaryPassword
    });
  }

  getBookings = () => this.bookingService.getBookings();

  getTodaysBookings = () => this.bookingService.getTodaysBookings();
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

function buildPatientsParams(page: number, pageSize: number, search?: string) {
  const params: Record<string, string> = {
    page: String(Math.max(1, page)),
    pageSize: String(Math.max(1, pageSize))
  };

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    params['search'] = trimmedSearch;
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

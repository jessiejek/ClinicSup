import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  AvailabilityStatus,
  DayOfWeek,
  Doctor,
  DoctorBlockedDate,
  DoctorDayStatus,
  DoctorSchedule,
  DoctorScheduleInput,
  DoctorStatus
} from '../../../core/models';

type NullableString = string | null | undefined;

interface DoctorDto {
  id: string;
  userId?: NullableString;
  fullName?: NullableString;
  firstName?: NullableString;
  middleName?: NullableString;
  lastName?: NullableString;
  specialization?: NullableString;
  bio?: NullableString;
  profilePhotoUrl?: NullableString;
  avatarUrl?: NullableString;
  licenseNumber?: NullableString;
  ptrNumber?: NullableString;
  s2Number?: NullableString;
  consultationFee?: number | null;
  slotDurationMinutes?: number | null;
  slotCapacity?: number | null;
  dailyPatientLimit?: number | null;
  status?: DoctorStatus | string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
}

interface DoctorScheduleDto {
  id: string;
  doctorId?: NullableString;
  dayOfWeek?: DayOfWeek | string | null;
  startTime?: NullableString;
  endTime?: NullableString;
}

interface DoctorBlockedDateDto {
  id: string;
  doctorId?: NullableString;
  blockedDate?: NullableString;
  reason?: NullableString;
}

interface DoctorDayStatusDto {
  id: string;
  doctorId?: NullableString;
  date?: NullableString;
  status?: AvailabilityStatus | string | null;
  runningLateMinutes?: number | null;
}

export type DoctorDetail = Doctor;

export interface UpdateDoctorDto {
  fullName: string;
  specialization: string;
  bio: string;
  licenseNumber: string;
  ptrNumber: string;
  s2Number: string;
  consultationFee: number;
  slotDurationMinutes: number;
  slotCapacity: number;
  dailyPatientLimit: number | null;
  status: DoctorStatus;
}

export interface SetDayStatusDto {
  date: string;
  status: AvailabilityStatus;
  runningLateMinutes: number | null;
}

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private readonly apiService = inject(ApiService);

  getMyProfile(): Observable<DoctorDetail> {
    return this.apiService.get<DoctorDto>('/doctors/me').pipe(map((doctor) => mapDoctorDto(doctor)));
  }

  updateMyProfile(dto: UpdateDoctorDto): Observable<DoctorDetail> {
    return this.apiService.put<DoctorDto>('/doctors/me', dto).pipe(map((doctor) => mapDoctorDto(doctor)));
  }

  getMySchedule(): Observable<DoctorSchedule[]> {
    return this.getMyProfile().pipe(
      switchMap((doctor) => (doctor ? this.getDoctorSchedules(doctor.id) : of([]))),
      catchError(() => of([]))
    );
  }

  getDayStatus(id: string): Observable<DoctorDayStatus> {
    return this.apiService.get<DoctorDayStatusDto>(`/doctors/${id}/day-status`).pipe(
      map((status) => mapDoctorDayStatusDto(status))
    );
  }

  setDayStatus(id: string, dto: SetDayStatusDto): Observable<DoctorDayStatus> {
    return this.apiService.post<DoctorDayStatusDto>(`/doctors/${id}/day-status`, dto).pipe(
      map((status) => mapDoctorDayStatusDto(status))
    );
  }

  getCurrentDoctor(userId: string): Observable<Doctor | undefined> {
    return this.getMyProfile().pipe(map((doctor) => (doctor && doctor.userId === userId ? doctor : undefined)));
  }

  getDoctorSchedules(doctorId: string): Observable<DoctorSchedule[]> {
    return this.apiService.get<DoctorScheduleDto[]>(`/doctors/${doctorId}/schedule`).pipe(
      map((schedules) => schedules.map((schedule) => mapDoctorScheduleDto(schedule)))
    );
  }

  getDoctorBlockedDates(doctorId: string): Observable<DoctorBlockedDate[]> {
    return this.apiService.get<DoctorBlockedDateDto[]>(`/doctors/${doctorId}/blocked-dates`).pipe(
      map((dates) => dates.map((date) => mapDoctorBlockedDateDto(date)))
    );
  }

  updateSchedule(doctorId: string, schedules: DoctorScheduleInput[]): Observable<DoctorSchedule[]> {
    return this.apiService.put<DoctorScheduleDto[]>(`/doctors/${doctorId}/schedule`, { schedules }).pipe(
      map((dtos) => dtos.map((dto) => mapDoctorScheduleDto(dto)))
    );
  }

  createBlockedDate(doctorId: string, payload: { blockedDate: string; reason?: string | null }): Observable<DoctorBlockedDate> {
    return this.apiService.post<DoctorBlockedDateDto>(`/doctors/${doctorId}/blocked-dates`, payload).pipe(
      map((dto) => mapDoctorBlockedDateDto(dto))
    );
  }

  deleteBlockedDate(doctorId: string, blockedDateId: string): Observable<void> {
    return this.apiService.delete<void>(`/doctors/${doctorId}/blocked-dates/${blockedDateId}`);
  }
}

function mapDoctorDto(dto: DoctorDto): Doctor {
  const fullName = resolveDoctorName(dto);
  return {
    id: dto.id,
    userId: normalizeString(dto.userId) || dto.id,
    fullName,
    specialization: normalizeString(dto.specialization) || '',
    bio: normalizeString(dto.bio),
    profilePhotoUrl: normalizeString(dto.profilePhotoUrl ?? dto.avatarUrl),
    licenseNumber: normalizeString(dto.licenseNumber),
    ptrNumber: normalizeString(dto.ptrNumber),
    s2Number: normalizeString(dto.s2Number),
    consultationFee: dto.consultationFee ?? 0,
    slotDurationMinutes: dto.slotDurationMinutes ?? 30,
    slotCapacity: dto.slotCapacity ?? 1,
    dailyPatientLimit: dto.dailyPatientLimit ?? null,
    status: (dto.status as DoctorStatus) ?? 'Active',
    averageRating: dto.averageRating ?? undefined,
    reviewCount: dto.reviewCount ?? undefined
  };
}

function mapDoctorScheduleDto(dto: DoctorScheduleDto): DoctorSchedule {
  return {
    id: dto.id,
    doctorId: normalizeString(dto.doctorId) || '',
    dayOfWeek: (dto.dayOfWeek as DayOfWeek) ?? 'Monday',
    startTime: normalizeString(dto.startTime) || '00:00',
    endTime: normalizeString(dto.endTime) || '00:00'
  };
}

function mapDoctorBlockedDateDto(dto: DoctorBlockedDateDto): DoctorBlockedDate {
  return {
    id: dto.id,
    doctorId: normalizeString(dto.doctorId) || '',
    blockedDate: normalizeString(dto.blockedDate) || '',
    reason: normalizeString(dto.reason)
  };
}

function mapDoctorDayStatusDto(dto: DoctorDayStatusDto): DoctorDayStatus {
  return {
    id: dto.id,
    doctorId: normalizeString(dto.doctorId) || '',
    date: normalizeString(dto.date) || '',
    status: (dto.status as AvailabilityStatus) ?? 'Available',
    runningLateMinutes: dto.runningLateMinutes ?? undefined
  };
}

function resolveDoctorName(dto: DoctorDto): string {
  const explicitName = normalizeString(dto.fullName);
  if (explicitName) {
    return explicitName;
  }

  const parts = [dto.firstName, dto.middleName, dto.lastName]
    .map((value) => normalizeString(value))
    .filter((value): value is string => Boolean(value));

  return parts.length ? parts.join(' ') : 'Doctor';
}

function normalizeString(value: NullableString): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

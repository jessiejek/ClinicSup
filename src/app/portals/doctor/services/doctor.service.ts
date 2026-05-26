import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { SupabaseService } from '../../../core/services/supabase.service';
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

export interface UpdateScheduleSettingsDto {
  slotDurationMinutes: number;
  slotCapacity: number;
  dailyPatientLimit: number | null;
}

export interface SetDayStatusDto {
  date: string;
  status: AvailabilityStatus;
  runningLateMinutes: number | null;
}

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly authState = inject(AuthStateService);

  getMyProfile(): Observable<DoctorDetail> {
    const userId = this.authState.snapshot?.id;
    if (!userId) throw new Error('User not authenticated.');
    return from(this.fetchDoctorByUserId(userId));
  }

  updateMyProfile(dto: UpdateDoctorDto): Observable<DoctorDetail> {
    const userId = this.authState.snapshot?.id;
    if (!userId) throw new Error('User not authenticated.');
    return from(this.updateDoctorByUserId(userId, dto));
  }

  getMySchedule(): Observable<DoctorSchedule[]> {
    const userId = this.authState.snapshot?.id;
    if (!userId) return from(Promise.resolve([]));
    return from(this.fetchScheduleByUserId(userId));
  }

  getDayStatus(id: string): Observable<DoctorDayStatus> {
    return from(this.fetchDayStatus(id));
  }

  setDayStatus(id: string, dto: SetDayStatusDto): Observable<DoctorDayStatus> {
    return from(this.upsertDayStatus(id, dto));
  }

  getCurrentDoctor(userId: string): Observable<Doctor | undefined> {
    return from(this.fetchDoctorByUserId(userId)).pipe(
      map((doctor) => doctor ?? undefined)
    );
  }

  getDoctorSchedules(doctorId: string): Observable<DoctorSchedule[]> {
    return from(this.fetchSchedule(doctorId));
  }

  getDoctorBlockedDates(doctorId: string): Observable<DoctorBlockedDate[]> {
    return from(this.fetchBlockedDates(doctorId));
  }

  updateSchedule(doctorId: string, schedules: DoctorScheduleInput[]): Observable<DoctorSchedule[]> {
    return from(this.upsertSchedule(doctorId, schedules));
  }

  updateScheduleSettings(doctorId: string, dto: UpdateScheduleSettingsDto): Observable<DoctorDetail> {
    return from(this.updateDoctorScheduleSettings(doctorId, dto));
  }

  createBlockedDate(doctorId: string, payload: { blockedDate: string; reason?: string | null }): Observable<DoctorBlockedDate> {
    return from(this.insertBlockedDate(doctorId, payload));
  }

  deleteBlockedDate(doctorId: string, blockedDateId: string): Observable<void> {
    return from(this.removeBlockedDate(blockedDateId));
  }

  private async fetchDoctorByUserId(userId: string): Promise<DoctorDetail> {
    const { data, error } = await this.supabase
      .from('doctors')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Doctor profile not found.');

    return mapDoctorRow(data as Record<string, unknown>);
  }

  private async updateDoctorByUserId(userId: string, dto: UpdateDoctorDto): Promise<DoctorDetail> {
    const { data, error } = await this.supabase
      .from('doctors')
      .update({
        full_name: dto.fullName,
        specialization: dto.specialization,
        bio: dto.bio,
        license_number: dto.licenseNumber,
        ptr_number: dto.ptrNumber,
        s2_number: dto.s2Number,
        consultation_fee: dto.consultationFee,
        slot_duration_minutes: dto.slotDurationMinutes,
        slot_capacity: dto.slotCapacity,
        daily_patient_limit: dto.dailyPatientLimit,
        status: dto.status,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return mapDoctorRow(data as Record<string, unknown>);
  }

  private async fetchScheduleByUserId(userId: string): Promise<DoctorSchedule[]> {
    const doctor = await this.fetchDoctorByUserId(userId);
    return this.fetchSchedule(doctor.id);
  }

  private async fetchSchedule(doctorId: string): Promise<DoctorSchedule[]> {
    const { data, error } = await this.supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((row) => mapDoctorScheduleRow(row));
  }

  private async fetchDayStatus(doctorId: string): Promise<DoctorDayStatus> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await this.supabase
      .from('doctor_day_statuses')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('target_date', today)
      .maybeSingle();

    if (error) throw error;

    return data
      ? mapDoctorDayStatusRow(data as Record<string, unknown>)
      : { id: '', doctorId, date: today, status: 'Available' as AvailabilityStatus };
  }

  private async upsertDayStatus(doctorId: string, dto: SetDayStatusDto): Promise<DoctorDayStatus> {
    const { data, error } = await this.supabase
      .from('doctor_day_statuses')
      .upsert({
        doctor_id: doctorId,
        target_date: dto.date,
        status: dto.status,
        running_late_minutes: dto.runningLateMinutes,
      }, { onConflict: 'doctor_id,target_date' })
      .select()
      .single();

    if (error) throw error;
    return mapDoctorDayStatusRow(data as Record<string, unknown>);
  }

  private async fetchBlockedDates(doctorId: string): Promise<DoctorBlockedDate[]> {
    const { data, error } = await this.supabase
      .from('doctor_blocked_dates')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('blocked_date', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((row) => mapDoctorBlockedDateRow(row));
  }

  private async upsertSchedule(doctorId: string, schedules: DoctorScheduleInput[]): Promise<DoctorSchedule[]> {
    const { error: deleteError } = await this.supabase
      .from('doctor_schedules')
      .delete()
      .eq('doctor_id', doctorId);

    if (deleteError) throw deleteError;

    if (schedules.length === 0) return [];

    const rows = schedules.map((s) => ({
      doctor_id: doctorId,
      day_of_week: s.dayOfWeek,
      start_time: s.startTime,
      end_time: s.endTime,
    }));

    const { data, error } = await this.supabase
      .from('doctor_schedules')
      .insert(rows)
      .select()
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((row) => mapDoctorScheduleRow(row));
  }

  private async updateDoctorScheduleSettings(
    doctorId: string,
    dto: UpdateScheduleSettingsDto
  ): Promise<DoctorDetail> {
    const { data, error } = await this.supabase
      .from('doctors')
      .update({
        slot_duration_minutes: dto.slotDurationMinutes,
        slot_capacity: dto.slotCapacity,
        daily_patient_limit: dto.dailyPatientLimit,
      })
      .eq('id', doctorId)
      .select()
      .single();

    if (error) throw error;
    return mapDoctorRow(data as Record<string, unknown>);
  }

  private async insertBlockedDate(doctorId: string, payload: { blockedDate: string; reason?: string | null }): Promise<DoctorBlockedDate> {
    const { data, error } = await this.supabase
      .from('doctor_blocked_dates')
      .insert({
        doctor_id: doctorId,
        blocked_date: payload.blockedDate,
        reason: payload.reason ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return mapDoctorBlockedDateRow(data as Record<string, unknown>);
  }

  private async removeBlockedDate(blockedDateId: string): Promise<void> {
    const { error } = await this.supabase
      .from('doctor_blocked_dates')
      .delete()
      .eq('id', blockedDateId);

    if (error) throw error;
  }
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function mapDoctorRow(row: Record<string, unknown>): Doctor {
  return {
    id: trimString(row['id']) ?? '',
    userId: trimString(row['user_id']) ?? '',
    fullName: trimString(row['full_name']) ?? 'Doctor',
    specialization: trimString(row['specialization']) ?? '',
    bio: trimString(row['bio']),
    profilePhotoUrl: trimString(row['profile_photo_url']),
    licenseNumber: trimString(row['license_number']),
    ptrNumber: trimString(row['ptr_number']),
    s2Number: trimString(row['s2_number']),
    consultationFee: normalizeNum(row['consultation_fee']),
    slotDurationMinutes: normalizeNum(row['slot_duration_minutes']) ?? 30,
    slotCapacity: normalizeNum(row['slot_capacity']) ?? 1,
    dailyPatientLimit: normalizeNumOrNull(row['daily_patient_limit']),
    status: (trimString(row['status']) as DoctorStatus) ?? 'Active',
    averageRating: normalizeNum(row['average_rating']),
    reviewCount: normalizeNum(row['review_count']),
  };
}

function mapDoctorScheduleRow(row: Record<string, unknown>): DoctorSchedule {
  return {
    id: trimString(row['id']) ?? '',
    doctorId: trimString(row['doctor_id']) ?? '',
    dayOfWeek: normalizeDayOfWeek(row['day_of_week']),
    startTime: normalizeTime(row['start_time']),
    endTime: normalizeTime(row['end_time']),
  };
}

function mapDoctorBlockedDateRow(row: Record<string, unknown>): DoctorBlockedDate {
  return {
    id: trimString(row['id']) ?? '',
    doctorId: trimString(row['doctor_id']) ?? '',
    blockedDate: trimString(row['blocked_date']) ?? '',
    reason: trimString(row['reason']),
  };
}

function mapDoctorDayStatusRow(row: Record<string, unknown>): DoctorDayStatus {
  return {
    id: trimString(row['id']) ?? '',
    doctorId: trimString(row['doctor_id']) ?? '',
    date: trimString(row['target_date']) ?? '',
    status: (trimString(row['status']) as AvailabilityStatus) ?? 'Available',
    runningLateMinutes: normalizeNumOrNull(row['running_late_minutes']) ?? undefined,
  };
}

function normalizeDayOfWeek(value: unknown): DayOfWeek {
  if (typeof value !== 'string') return 'Monday';
  const v = value.trim().toLowerCase();
  return DAYS.find((d) => d.toLowerCase() === v) ?? 'Monday';
}

function normalizeTime(value: unknown): string {
  if (typeof value !== 'string') return '00:00';
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function trimString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t || undefined;
}

function normalizeNum(value: unknown): number {
  if (typeof value !== 'number') return 0;
  return Number.isFinite(value) ? value : 0;
}

function normalizeNumOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number') return null;
  return Number.isFinite(value) ? value : null;
}

import { Injectable, inject } from '@angular/core';
import { Observable, from, map, switchMap, take } from 'rxjs';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  DayOfWeek,
  Doctor,
  DoctorBlockedDate,
  DoctorSchedule,
  DoctorStatus
} from '../../../core/models';

type NullableString = string | null | undefined;

interface DoctorRow {
  id: string;
  user_id: NullableString;
  full_name: NullableString;
  specialization: NullableString;
  bio: NullableString;
  profile_photo_url: NullableString;
  license_number: NullableString;
  ptr_number: NullableString;
  s2_number: NullableString;
  consultation_fee: number | null;
  slot_duration_minutes: number | null;
  slot_capacity: number | null;
  daily_patient_limit: number | null;
  status: DoctorStatus | string | null;
  average_rating: number | null;
  review_count: number | null;
}

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

interface DoctorScheduleRow {
  id: string;
  doctor_id: string;
  day_of_week: DayOfWeek | string | null;
  start_time: NullableString;
  end_time: NullableString;
}

interface DoctorScheduleDto {
  id: string;
  doctorId?: NullableString;
  dayOfWeek?: DayOfWeek | string | null;
  startTime?: NullableString;
  endTime?: NullableString;
}

interface BlockedDateRow {
  id: string;
  doctor_id: string;
  blocked_date: NullableString;
  reason: NullableString;
}

interface BlockedDateDto {
  id: string;
  doctorId?: NullableString;
  blockedDate?: NullableString;
  reason?: NullableString;
}

export interface DoctorSummary extends Doctor {}

export type DoctorDetail = Doctor;

export interface CreateDoctorDto {
  fullName: string;
  specialization: string;
  bio?: string;
  licenseNumber?: string;
  ptrNumber?: string;
  s2Number?: string;
  consultationFee: number;
  slotDurationMinutes: number;
  slotCapacity: number;
  dailyPatientLimit: number | null;
  doctorEmail: string;
  tempPassword: string;
}

export type UpdateDoctorDto = Partial<CreateDoctorDto> & { status?: DoctorStatus };

export interface UpsertSchedulesDto {
  schedules: Array<Pick<DoctorSchedule, 'dayOfWeek' | 'startTime' | 'endTime'>>;
}

export interface BlockDateDto {
  blockedDate: string;
  reason?: string;
}

export type BlockedDate = DoctorBlockedDate;

export interface CreateDoctorInviteDto {
  fullName: string;
  email: string;
  specialization: string;
  bio?: string;
  licenseNumber?: string;
  ptrNumber?: string;
  s2Number?: string;
  consultationFee: number;
  slotDurationMinutes: number;
  slotCapacity: number;
  dailyPatientLimit: number | null;
  serviceIds: string[];
  schedule?: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class AdminDoctorsService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly authState = inject(AuthStateService);

  getAllDoctors(): Observable<DoctorSummary[]> {
    return from(this.fetchAllDoctors());
  }

  getDoctors(): Observable<DoctorSummary[]> {
    return this.getAllDoctors();
  }

  createDoctor(dto: CreateDoctorDto): Observable<DoctorDetail> {
    return from(this.createDoctorAsync(dto));
  }

  addDoctor(doctor: CreateDoctorDto): Observable<DoctorDetail> {
    return this.createDoctor(doctor);
  }

  createDoctorInvite(dto: CreateDoctorInviteDto): Observable<{ inviteId: string }> {
    return this.authState.currentUser$.pipe(
      take(1),
      switchMap((authUser) => {
        if (!authUser) {
          throw new Error('You must be logged in as admin to invite a doctor.');
        }
        return from(this.createDoctorInviteAsync(dto, authUser.id));
      })
    );
  }

  updateDoctor(id: string, dto: UpdateDoctorDto): Observable<DoctorDetail> {
    return from(this.updateDoctorAsync(id, dto));
  }

  updateDoctorLegacy(doctor: Doctor): Observable<DoctorDetail> {
    return from(this.updateDoctorAsync(doctor.id, doctor as unknown as UpdateDoctorDto));
  }

  deactivateDoctor(id: string): Observable<void> {
    return from(this.deactivateDoctorAsync(id));
  }

  getSchedule(id: string): Observable<DoctorSchedule[]> {
    return from(this.fetchSchedule(id));
  }

  updateSchedule(id: string, dto: UpsertSchedulesDto): Observable<DoctorSchedule[]> {
    return from(this.upsertScheduleAsync(id, dto));
  }

  getBlockedDates(id: string): Observable<BlockedDate[]> {
    return from(this.fetchBlockedDates(id));
  }

  addBlockedDate(id: string, dto: BlockDateDto): Observable<BlockedDate> {
    return from(this.addBlockedDateAsync(id, dto));
  }

  deleteBlockedDate(doctorId: string, bdId: string): Observable<void> {
    return from(this.removeBlockedDateAsync(bdId));
  }

  private async fetchAllDoctors(): Promise<DoctorSummary[]> {
    const { data, error } = await this.supabase
      .from('doctors')
      .select(
        'id, user_id, full_name, specialization, bio, profile_photo_url, license_number, ptr_number, s2_number, consultation_fee, slot_duration_minutes, slot_capacity, daily_patient_limit, status, average_rating, review_count'
      )
      .order('full_name', { ascending: true });

    if (error) {
      throw error;
    }

    return ((data ?? []) as DoctorRow[]).map((doctor) => mapDoctorRow(doctor));
  }

  private async fetchSchedule(id: string): Promise<DoctorSchedule[]> {
    const { data, error } = await this.supabase
      .from('doctor_schedules')
      .select('id, doctor_id, day_of_week, start_time, end_time')
      .eq('doctor_id', id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw error;
    }

    return ((data ?? []) as DoctorScheduleRow[]).map((schedule) => mapDoctorScheduleRow(schedule));
  }

  private async fetchBlockedDates(id: string): Promise<BlockedDate[]> {
    const { data, error } = await this.supabase
      .from('doctor_blocked_dates')
      .select('id, doctor_id, blocked_date, reason')
      .eq('doctor_id', id)
      .order('blocked_date', { ascending: true });

    if (error) {
      throw error;
    }

    return ((data ?? []) as BlockedDateRow[]).map((date) => mapBlockedDateRow(date));
  }

  private async deactivateDoctorAsync(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('doctors')
      .update({ status: 'Inactive' })
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  private async createDoctorInviteAsync(dto: CreateDoctorInviteDto, invitedBy: string): Promise<{ inviteId: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const payload: Record<string, unknown> = {
      email: normalizedEmail,
      full_name: dto.fullName.trim(),
      specialization: dto.specialization.trim(),
      bio: dto.bio?.trim() || null,
      license_number: dto.licenseNumber?.trim() || null,
      ptr_number: dto.ptrNumber?.trim() || null,
      s2_number: dto.s2Number?.trim() || null,
      consultation_fee: dto.consultationFee,
      slot_duration_minutes: dto.slotDurationMinutes,
      slot_capacity: dto.slotCapacity,
      daily_patient_limit: dto.dailyPatientLimit ?? null,
      service_ids: dto.serviceIds,
      schedule: dto.schedule ?? null,
      status: 'pending',
      invited_by: invitedBy,
      doctor_id: null,
    };

    const { data, error } = await this.supabase
      .from('doctor_invites')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      // If table doesn't exist, show a clear migration message
      if (error.code === '42P01') {
        throw new Error(
          'The doctor_invites table does not exist yet. ' +
          'Deploy SUPABASE_REQUIRED_DOCTOR_INVITES_SQL.md first, then try again.'
        );
      }
      throw error;
    }

    return { inviteId: (data as { id: string }).id };
  }

  private async createDoctorAsync(dto: CreateDoctorDto): Promise<DoctorSummary> {
    // Doctor creation requires a linked Supabase Auth user.
    // The user_id must be provided before inserting into the doctors table
    // because doctors.user_id has a NOT NULL constraint.
    throw new Error(
      'Doctor account creation requires a linked Supabase Auth user account. ' +
      'This must be done via a secure server-side Edge Function using service_role. ' +
      'The admin UI cannot create Auth users directly with the anon key. ' +
      'For now, create the Auth user first via Supabase Dashboard > Authentication > Users, ' +
      'then link the doctor profile here.'
    );
  }

  private async updateDoctorAsync(id: string, dto: UpdateDoctorDto): Promise<DoctorDetail> {
    const payload: Record<string, unknown> = {};
    if (dto.fullName !== undefined) payload['full_name'] = dto.fullName;
    if (dto.specialization !== undefined) payload['specialization'] = dto.specialization;
    if (dto.bio !== undefined) payload['bio'] = dto.bio;
    if (dto.licenseNumber !== undefined) payload['license_number'] = dto.licenseNumber;
    if (dto.ptrNumber !== undefined) payload['ptr_number'] = dto.ptrNumber;
    if (dto.s2Number !== undefined) payload['s2_number'] = dto.s2Number;
    if (dto.consultationFee !== undefined) payload['consultation_fee'] = dto.consultationFee;
    if (dto.slotDurationMinutes !== undefined) payload['slot_duration_minutes'] = dto.slotDurationMinutes;
    if (dto.slotCapacity !== undefined) payload['slot_capacity'] = dto.slotCapacity;
    if (dto.dailyPatientLimit !== undefined) payload['daily_patient_limit'] = dto.dailyPatientLimit;
    if (dto.status !== undefined) payload['status'] = dto.status;

    const { data, error } = await this.supabase
      .from('doctors')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapDoctorRow(data as DoctorRow);
  }

  private async upsertScheduleAsync(id: string, dto: UpsertSchedulesDto): Promise<DoctorSchedule[]> {
    const { error: deleteError } = await this.supabase
      .from('doctor_schedules')
      .delete()
      .eq('doctor_id', id);

    if (deleteError) throw deleteError;
    if (dto.schedules.length === 0) return [];

    const rows = dto.schedules.map((s) => ({
      doctor_id: id,
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
    return ((data ?? []) as DoctorScheduleRow[]).map((row) => mapDoctorScheduleRow(row));
  }

  private async addBlockedDateAsync(id: string, dto: BlockDateDto): Promise<BlockedDate> {
    const { data, error } = await this.supabase
      .from('doctor_blocked_dates')
      .insert({
        doctor_id: id,
        blocked_date: dto.blockedDate,
        reason: dto.reason ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return mapBlockedDateRow(data as BlockedDateRow);
  }

  private normalizeDoctorFromRow(row: DoctorRow): DoctorSummary {
    return mapDoctorRow(row);
  }

  private async removeBlockedDateAsync(bdId: string): Promise<void> {
    const { error } = await this.supabase
      .from('doctor_blocked_dates')
      .delete()
      .eq('id', bdId);

    if (error) throw error;
  }
}

const DOCTOR_STATUSES: DoctorStatus[] = ['Active', 'Inactive', 'OnLeave'];

function mapDoctorRow(row: DoctorRow): DoctorSummary {
  const status = normalizeDoctorStatus(row.status) ?? 'Active';

  return {
    id: row.id,
    userId: normalizeString(row.user_id) || row.id,
    fullName: normalizeString(row.full_name) || 'Doctor',
    specialization: normalizeString(row.specialization) || '',
    bio: normalizeString(row.bio),
    profilePhotoUrl: normalizeString(row.profile_photo_url),
    licenseNumber: normalizeString(row.license_number),
    ptrNumber: normalizeString(row.ptr_number),
    s2Number: normalizeString(row.s2_number),
    consultationFee: row.consultation_fee ?? 0,
    slotDurationMinutes: row.slot_duration_minutes ?? 30,
    slotCapacity: row.slot_capacity ?? 1,
    dailyPatientLimit: row.daily_patient_limit ?? null,
    status,
    averageRating: row.average_rating ?? undefined,
    reviewCount: row.review_count ?? undefined
  };
}

function mapDoctorDto(dto: DoctorDto): DoctorSummary {
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
    status: normalizeDoctorStatus(dto.status) ?? 'Active',
    averageRating: dto.averageRating ?? undefined,
    reviewCount: dto.reviewCount ?? undefined
  };
}

function mapDoctorScheduleRow(row: DoctorScheduleRow): DoctorSchedule {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    dayOfWeek: normalizeDayOfWeek(row.day_of_week),
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time)
  };
}

function mapDoctorScheduleDto(dto: DoctorScheduleDto): DoctorSchedule {
  return {
    id: dto.id,
    doctorId: normalizeString(dto.doctorId) || '',
    dayOfWeek: normalizeDayOfWeek(dto.dayOfWeek),
    startTime: normalizeTime(dto.startTime),
    endTime: normalizeTime(dto.endTime)
  };
}

function mapBlockedDateRow(row: BlockedDateRow): BlockedDate {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    blockedDate: normalizeString(row.blocked_date) || '',
    reason: normalizeString(row.reason)
  };
}

function mapBlockedDateDto(dto: BlockedDateDto): BlockedDate {
  return {
    id: dto.id,
    doctorId: normalizeString(dto.doctorId) || '',
    blockedDate: normalizeString(dto.blockedDate) || '',
    reason: normalizeString(dto.reason)
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

function normalizeDoctorStatus(value: unknown): DoctorStatus | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return DOCTOR_STATUSES.find((item) => item.toLowerCase() === normalized);
}

function normalizeDayOfWeek(value: unknown): DayOfWeek {
  const allowed: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  if (typeof value !== 'string') {
    return 'Monday';
  }

  const normalized = value.trim().toLowerCase();
  return allowed.find((item) => item.toLowerCase() === normalized) ?? 'Monday';
}

function normalizeTime(value: NullableString): string {
  const trimmed = normalizeString(value) || '00:00';
  return trimmed.length >= 5 ? trimmed.slice(0, 5) : trimmed;
}

import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, of, shareReplay, throwError } from 'rxjs';
import {
  Announcement,
  ClinicSettings,
  DayOfWeek,
  Doctor,
  DoctorSchedule,
  DoctorStatus,
  Review,
  Service,
  ServiceCategory
} from '../../../core/models';
import { ClinicSettingsService } from '../../../core/services/clinic-settings.service';
import { SupabaseService } from '../../../core/services/supabase.service';

type NullableString = string | null | undefined;

interface PublicDoctorViewRow {
  doctor_id: string;
  full_name: NullableString;
  specialization: NullableString;
  bio: NullableString;
  profile_photo_url: NullableString;
  consultation_fee: number | null;
  slot_duration_minutes: number | null;
  slot_capacity: number | null;
  daily_patient_limit: number | null;
  average_rating: number | null;
  review_count: number | null;
  status: DoctorStatus | string | null;
  services: unknown;
}

interface DoctorAvailableServiceViewRow {
  doctor_id: string;
  service_id: string;
  service_name: NullableString;
  service_description: NullableString;
  category: ServiceCategory | string | null;
  price: number | null;
  estimated_duration_minutes: number | null;
  is_active: boolean | null;
}

interface DoctorScheduleRow {
  id: string;
  doctor_id: string;
  day_of_week: DayOfWeek | string | null;
  start_time: NullableString;
  end_time: NullableString;
}

interface AvailableSlotRpcRow {
  slot_start_time: NullableString;
  slot_end_time: NullableString;
  is_available: boolean | null;
  booked_count: number | null;
  capacity: number | null;
}

interface PublicDoctorServiceJson {
  service_id?: string | null;
  name?: string | null;
  description?: string | null;
  category?: ServiceCategory | string | null;
  price?: number | null;
  estimated_duration_minutes?: number | null;
}

export interface DoctorSummary extends Doctor {}

export type DoctorDetail = (Doctor & { services?: Service[] }) | undefined;

export interface AvailableSlot {
  slotStartTime: string;
  slotEndTime: string;
  isAvailable: boolean;
  bookedCount: number;
  capacity: number;
  time: string;
  endTime: string;
  IsAvailable: boolean;
}

@Injectable({ providedIn: 'root' })
export class PublicService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly clinicSettingsService = inject(ClinicSettingsService);

  private doctorsCache$?: Observable<DoctorSummary[]>;
  private servicesCache$?: Observable<Service[]>;

  getDoctors(forceRefresh = false): Observable<DoctorSummary[]> {
    if (forceRefresh) {
      this.doctorsCache$ = undefined;
    }

    if (!this.doctorsCache$) {
      this.doctorsCache$ = from(this.fetchPublicDoctors()).pipe(
        catchError((error: unknown) => {
          this.doctorsCache$ = undefined;
          return throwError(() => normalizeSupabaseError(error, 'Failed to load doctors from Supabase.'));
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.doctorsCache$;
  }

  refreshDoctors(): Observable<DoctorSummary[]> {
    return this.getDoctors(true);
  }

  getDoctorById(id: string): Observable<DoctorDetail> {
    return this.refreshDoctorById(id).pipe(catchError(() => of(undefined)));
  }

  refreshDoctorById(id: string): Observable<DoctorDetail> {
    return from(this.fetchPublicDoctorById(id)).pipe(
      catchError((error: unknown) => throwError(() => normalizeSupabaseError(error, 'Failed to load doctor.')))
    );
  }

  getServices(): Observable<Service[]> {
    if (!this.servicesCache$) {
      this.servicesCache$ = from(this.fetchPublicServices()).pipe(
        catchError((error: unknown) => {
          this.servicesCache$ = undefined;
          return throwError(() => normalizeSupabaseError(error, 'Failed to load services from Supabase.'));
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.servicesCache$;
  }

  getAvailableSlots(doctorId: string, date: string): Observable<AvailableSlot[]> {
    return from(this.fetchAvailableSlots(doctorId, date)).pipe(
      catchError((error: unknown) =>
        throwError(() => normalizeSupabaseError(error, 'Failed to load available slots from Supabase.'))
      )
    );
  }

  getAnnouncements(): Observable<Announcement[]> {
    return from(this.fetchActiveAnnouncements());
  }

  getClinicSettings(): Observable<ClinicSettings> {
    return this.clinicSettingsService.settings$;
  }

  getDoctorReviews(doctorId: string): Observable<Review[]> {
    return from(this.fetchDoctorReviews(doctorId));
  }

  getDoctorServices(doctorId: string): Observable<Service[]> {
    return from(this.fetchDoctorServices(doctorId)).pipe(catchError(() => of([])));
  }

  getDoctorSchedules(doctorId: string): Observable<DoctorSchedule[]> {
    return from(this.fetchDoctorSchedules(doctorId)).pipe(catchError(() => of([])));
  }

  private async fetchPublicDoctors(): Promise<DoctorSummary[]> {
    const { data, error } = await this.supabase
      .from('public_doctors_view')
      .select(
        'doctor_id, full_name, specialization, bio, profile_photo_url, consultation_fee, slot_duration_minutes, slot_capacity, daily_patient_limit, average_rating, review_count, status, services'
      )
      .order('full_name', { ascending: true });

    if (error) {
      throw error;
    }

    return ((data ?? []) as PublicDoctorViewRow[]).map((row) => mapPublicDoctorRow(row));
  }

  private async fetchPublicDoctorById(id: string): Promise<DoctorDetail> {
    const { data, error } = await this.supabase
      .from('public_doctors_view')
      .select(
        'doctor_id, full_name, specialization, bio, profile_photo_url, consultation_fee, slot_duration_minutes, slot_capacity, daily_patient_limit, average_rating, review_count, status, services'
      )
      .eq('doctor_id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return undefined;
    }

    const row = data as PublicDoctorViewRow;
    return {
      ...mapPublicDoctorRow(row),
      services: parsePublicDoctorServices(row.services, row.doctor_id)
    };
  }

  private async fetchPublicServices(): Promise<Service[]> {
    const { data, error } = await this.supabase
      .from('doctor_available_services_view')
      .select(
        'doctor_id, service_id, service_name, service_description, category, price, estimated_duration_minutes, is_active'
      )
      .eq('is_active', true)
      .order('service_name', { ascending: true });

    if (error) {
      throw error;
    }

    return mapAvailableServiceRows((data ?? []) as DoctorAvailableServiceViewRow[]);
  }

  private async fetchDoctorServices(doctorId: string): Promise<Service[]> {
    const { data, error } = await this.supabase
      .from('doctor_available_services_view')
      .select(
        'doctor_id, service_id, service_name, service_description, category, price, estimated_duration_minutes, is_active'
      )
      .eq('doctor_id', doctorId)
      .eq('is_active', true)
      .order('service_name', { ascending: true });

    if (error) {
      throw error;
    }

    return mapAvailableServiceRows((data ?? []) as DoctorAvailableServiceViewRow[]);
  }

  private async fetchDoctorSchedules(doctorId: string): Promise<DoctorSchedule[]> {
    const { data, error } = await this.supabase
      .from('doctor_schedules')
      .select('id, doctor_id, day_of_week, start_time, end_time')
      .eq('doctor_id', doctorId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw error;
    }

    return ((data ?? []) as DoctorScheduleRow[]).map((row) => mapDoctorScheduleRow(row));
  }

  private async fetchAvailableSlots(doctorId: string, date: string): Promise<AvailableSlot[]> {
    const [rpcResponse, doctor, schedules] = await Promise.all([
      this.supabase.rpc('get_available_slots', {
        p_doctor_id: doctorId,
        p_appointment_date: date
      }),
      this.fetchPublicDoctorById(doctorId),
      this.fetchDoctorSchedules(doctorId)
    ]);

    const { data, error } = rpcResponse;
    if (error) {
      throw error;
    }

    const rpcRows = (data ?? []) as AvailableSlotRpcRow[];
    const slotTimes = buildScheduledSlotTimes(date, schedules, Math.max(5, doctor?.slotDurationMinutes ?? 30));
    const capacity = Math.max(1, doctor?.slotCapacity ?? 1);

    return slotTimes.map((slotTime, index) =>
      mapAvailableSlotRow(rpcRows.find((row) => normalizeString(row.slot_start_time) === slotTime.startTime) ?? rpcRows[index] ?? {
        slot_start_time: slotTime.startTime,
        slot_end_time: slotTime.endTime,
        is_available: true,
        booked_count: 0,
        capacity
      }, slotTime)
    );
  }

  private async fetchActiveAnnouncements(): Promise<Announcement[]> {
    const { data, error } = await this.supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[PublicService] announcements table not available yet:', error.message);
      return [];
    }

    return ((data ?? []) as Record<string, unknown>[]).map(mapAnnouncementRow);
  }

  private async fetchDoctorReviews(doctorId: string): Promise<Review[]> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[PublicService] reviews table not available yet:', error.message);
      return [];
    }

    return ((data ?? []) as Record<string, unknown>[]).map(mapReviewRow);
  }
}

const DOCTOR_STATUSES: DoctorStatus[] = ['Active', 'Inactive', 'OnLeave'];

function mapPublicDoctorRow(row: PublicDoctorViewRow): DoctorSummary {
  const status = normalizeDoctorStatus(row.status) ?? 'Active';

  return {
    id: row.doctor_id,
    userId: row.doctor_id,
    fullName: normalizeString(row.full_name) || 'Doctor',
    specialization: normalizeString(row.specialization) || '',
    bio: normalizeString(row.bio),
    profilePhotoUrl: normalizeString(row.profile_photo_url),
    consultationFee: row.consultation_fee ?? 0,
    slotDurationMinutes: row.slot_duration_minutes ?? 30,
    slotCapacity: row.slot_capacity ?? 1,
    dailyPatientLimit: row.daily_patient_limit ?? null,
    status,
    isActive: status === 'Active',
    averageRating: row.average_rating ?? undefined,
    reviewCount: row.review_count ?? undefined
  };
}

function parsePublicDoctorServices(value: unknown, doctorId: string): Service[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => mapPublicDoctorServiceJson(item as PublicDoctorServiceJson, doctorId))
    .filter((service): service is Service => Boolean(service));
}

function mapPublicDoctorServiceJson(item: PublicDoctorServiceJson, doctorId: string): Service | undefined {
  const id = normalizeString(item.service_id);
  const name = normalizeString(item.name);

  if (!id || !name) {
    return undefined;
  }

  return {
    id,
    name,
    description: normalizeString(item.description),
    estimatedDurationMinutes: item.estimated_duration_minutes ?? 0,
    price: item.price ?? 0,
    category: normalizeServiceCategory(item.category),
    doctorIds: [doctorId]
  };
}

function mapAvailableServiceRows(rows: DoctorAvailableServiceViewRow[]): Service[] {
  const servicesById = new Map<string, Service>();

  for (const row of rows) {
    const id = row.service_id;
    const existing = servicesById.get(id);

    if (existing) {
      if (!existing.doctorIds.includes(row.doctor_id)) {
        existing.doctorIds.push(row.doctor_id);
      }
      continue;
    }

    servicesById.set(id, {
      id,
      name: normalizeString(row.service_name) || '',
      description: normalizeString(row.service_description),
      estimatedDurationMinutes: row.estimated_duration_minutes ?? 0,
      price: row.price ?? 0,
      category: normalizeServiceCategory(row.category),
      doctorIds: [row.doctor_id]
    });
  }

  return [...servicesById.values()].sort((a, b) => a.name.localeCompare(b.name));
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

function mapAvailableSlotRow(
  row: AvailableSlotRpcRow,
  fallbackTime?: { startTime: string; endTime: string }
): AvailableSlot {
  const slotStartTime = fallbackTime?.startTime || normalizeString(row.slot_start_time) || '';
  const slotEndTime = fallbackTime?.endTime || normalizeString(row.slot_end_time) || '';
  const isAvailable = row.is_available ?? true;

  return {
    slotStartTime,
    slotEndTime,
    isAvailable,
    bookedCount: row.booked_count ?? 0,
    capacity: row.capacity ?? 0,
    time: slotStartTime,
    endTime: slotEndTime,
    IsAvailable: isAvailable
  };
}

function buildScheduledSlotTimes(
  appointmentDate: string,
  schedules: DoctorSchedule[],
  slotDurationMinutes: number
): Array<{ startTime: string; endTime: string }> {
  const previewDate = new Date(`${appointmentDate}T00:00:00`);
  if (Number.isNaN(previewDate.getTime())) {
    return [];
  }

  const duration = Math.max(5, Math.round(slotDurationMinutes || 30));
  const dayName = DAY_NAMES[previewDate.getDay()];
  const schedule = schedules.find((item) => normalizeDayOfWeek(item.dayOfWeek) === dayName);

  if (!schedule) {
    return [];
  }

  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return [];
  }

  const slots: Array<{ startTime: string; endTime: string }> = [];
  for (let current = startMinutes; current + duration <= endMinutes; current += duration) {
    slots.push({
      startTime: minutesToTime(current),
      endTime: minutesToTime(current + duration)
    });
  }

  return slots;
}

function timeToMinutes(value: NullableString): number | null {
  if (!value) {
    return null;
  }

  const [hourText, minuteText = '0'] = value.trim().slice(0, 5).split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

const DAY_NAMES: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

function normalizeServiceCategory(value: unknown): ServiceCategory {
  const allowed: ServiceCategory[] = ['Consultation', 'Procedure', 'Laboratory', 'Diagnostic'];
  if (typeof value !== 'string') {
    return 'Consultation';
  }

  const normalized = value.trim().toLowerCase();
  return allowed.find((item) => item.toLowerCase() === normalized) ?? 'Consultation';
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

function mapAnnouncementRow(row: Record<string, unknown>): Announcement {
  return {
    id: String(row['id'] ?? ''),
    title: String(row['title'] ?? ''),
    body: String(row['body'] ?? ''),
    imageUrl: row['image_url'] ? String(row['image_url']) : undefined,
    isActive: Boolean(row['is_active'] ?? true),
    createdAt: String(row['created_at'] ?? new Date().toISOString())
  };
}

function mapReviewRow(row: Record<string, unknown>): Review {
  return {
    id: String(row['id'] ?? ''),
    bookingId: String(row['booking_id'] ?? ''),
    doctorId: String(row['doctor_id'] ?? ''),
    patientId: String(row['patient_id'] ?? ''),
    rating: Number(row['rating']) || 0,
    comment: row['comment'] ? String(row['comment']) : undefined,
    patientName: String(row['patient_name'] ?? ''),
    createdAt: String(row['created_at'] ?? new Date().toISOString())
  };
}

function normalizeSupabaseError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return new Error(message);
    }
  }

  return new Error(fallback);
}

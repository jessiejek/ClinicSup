import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, map, catchError, of, forkJoin, from } from 'rxjs';
import {
  AvailabilityStatus,
  Doctor,
  DoctorBlockedDate,
  DoctorDayStatus,
  DoctorSchedule,
  DoctorStatus
} from '../models';
import { SupabaseService } from './supabase.service';

const toLocalIsoDate = (): string => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

@Injectable({ providedIn: 'root' })
export class DoctorStateService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly doctorsSubject = new BehaviorSubject<Doctor[]>([]);
  private readonly schedulesSubject = new BehaviorSubject<DoctorSchedule[]>([]);
  private readonly blockedDatesSubject = new BehaviorSubject<DoctorBlockedDate[]>([]);
  private readonly dayStatusesSubject = new BehaviorSubject<Record<string, DoctorDayStatus>>({});
  private readonly loadingSubject = new BehaviorSubject(false);

  readonly doctors$ = this.doctorsSubject.asObservable();
  readonly schedules$ = this.schedulesSubject.asObservable();
  readonly blockedDates$ = this.blockedDatesSubject.asObservable();
  readonly dayStatuses$ = this.dayStatusesSubject.asObservable();
  readonly isLoading$ = this.loadingSubject.asObservable();

  readonly doctors = toSignal(this.doctors$, { initialValue: [] });
  readonly isLoading = toSignal(this.isLoading$, { initialValue: false });

  refresh(): void {
    this.loadDoctorsFromSupabase();
  }

  getDoctors(): Observable<Doctor[]> {
    return this.doctors$;
  }

  getDoctorById(id: string): Observable<Doctor | undefined> {
    return this.doctors$.pipe(map((doctors) => doctors.find((doctor) => doctor.id === id)));
  }

  getDoctorByUserId(userId: string): Observable<Doctor | undefined> {
    return this.doctors$.pipe(map((doctors) => doctors.find((doctor) => doctor.userId === userId)));
  }

  getDoctorSchedules(doctorId: string): Observable<DoctorSchedule[]> {
    return this.schedules$.pipe(
      map((schedules) => schedules.filter((schedule) => schedule.doctorId === doctorId))
    );
  }

  getDoctorDayStatus(doctorId: string): Observable<DoctorDayStatus | undefined> {
    return this.dayStatuses$.pipe(map((statuses) => statuses[doctorId]));
  }

  getDoctorDayStatusSignal(doctorId: string) {
    return toSignal(this.getDoctorDayStatus(doctorId), { initialValue: undefined });
  }

  /** Load all doctors from Supabase (for staff pages). */
  loadDoctorsFromSupabase(): void {
    this.loadingSubject.next(true);
    from(this.fetchAllDoctors()).pipe(
      catchError(() => of([] as Doctor[]))
    ).subscribe((doctors) => {
      this.doctorsSubject.next(doctors);
      this.loadingSubject.next(false);
      if (doctors.length > 0) {
        forkJoin(doctors.map((d) => this.loadSingleDayStatus(d.id))).subscribe();
      }
    });
  }

  /** Load today's day status for a single doctor from Supabase. */
  loadSingleDayStatus(doctorId: string): Observable<void> {
    return from(this.fetchDayStatus(doctorId)).pipe(
      map((todayStatus) => {
        if (todayStatus) {
          this.dayStatusesSubject.next({
            ...this.dayStatusesSubject.value,
            [doctorId]: todayStatus,
          });
        }
      }),
      catchError(() => of(void 0))
    );
  }

  /** Update day status via Supabase, then refresh local state. */
  updateDayStatusViaApi(doctorId: string, status: AvailabilityStatus, runningLateMinutes?: number): Observable<any> {
    return from(this.upsertDayStatus(doctorId, status, runningLateMinutes)).pipe(
      map(() => {
        this.dayStatusesSubject.next({
          ...this.dayStatusesSubject.value,
          [doctorId]: { id: '', doctorId, date: toLocalIsoDate(), status, runningLateMinutes },
        });
      })
    );
  }

  addDoctor(doctor: Omit<Doctor, 'id'>): Doctor {
    const saved: Doctor = {
      ...doctor,
      id: `doc-${Date.now()}`,
      userId: doctor.userId || `user-doctor-${Date.now()}`,
    };
    this.doctorsSubject.next([
      ...this.doctorsSubject.value.filter((item) => item.id !== saved.id),
      saved,
    ]);
    return saved;
  }

  updateDoctor(doctor: Doctor): void {
    this.doctorsSubject.next(
      this.doctorsSubject.value.map((item) => (item.id === doctor.id ? { ...doctor } : item))
    );
  }

  setDoctorStatus(doctorId: string, status: DoctorStatus): void {
    this.doctorsSubject.next(
      this.doctorsSubject.value.map((doctor) =>
        doctor.id === doctorId ? { ...doctor, status } : doctor
      )
    );
  }

  setDoctorDayStatus(event: {
    doctorId: string;
    status: AvailabilityStatus;
    runningLateMinutes?: number;
  }): void {
    this.dayStatusesSubject.next({
      ...this.dayStatusesSubject.value,
      [event.doctorId]: {
        id: this.dayStatusesSubject.value[event.doctorId]?.id ?? `day-${event.doctorId}`,
        doctorId: event.doctorId,
        date: toLocalIsoDate(),
        status: event.status,
        runningLateMinutes: event.runningLateMinutes,
      },
    });
  }

  addBlockedDate(blockedDate: DoctorBlockedDate): void {
    this.blockedDatesSubject.next([
      ...this.blockedDatesSubject.value.filter((item) => item.id !== blockedDate.id),
      blockedDate,
    ]);
  }

  removeBlockedDate(id: string): void {
    this.blockedDatesSubject.next(
      this.blockedDatesSubject.value.filter((blockedDate) => blockedDate.id !== id)
    );
  }

  private async fetchAllDoctors(): Promise<Doctor[]> {
    const { data, error } = await this.supabase
      .from('doctors')
      .select('id, user_id, full_name, specialization, bio, profile_photo_url, consultation_fee, status, average_rating, review_count')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map(mapDoctorRow);
  }

  private async fetchDayStatus(doctorId: string): Promise<DoctorDayStatus | null> {
    const today = toLocalIsoDate();
    const { data, error } = await this.supabase
      .from('doctor_day_statuses')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('target_date', today)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      id: trimStr(row['id']) ?? '',
      doctorId: trimStr(row['doctor_id']) ?? '',
      date: trimStr(row['date']) ?? '',
      status: (trimStr(row['status']) as AvailabilityStatus) ?? 'Available',
      runningLateMinutes: normalizeNumOrUndefined(row['running_late_minutes']),
    };
  }

  private async upsertDayStatus(doctorId: string, status: AvailabilityStatus, runningLateMinutes?: number): Promise<void> {
    const { error } = await this.supabase
      .from('doctor_day_statuses')
      .upsert(
        {
          doctor_id: doctorId,
          target_date: toLocalIsoDate(),
          status,
          running_late_minutes: runningLateMinutes ?? null,
        },
        { onConflict: 'doctor_id,target_date' }
      );

    if (error) throw error;
  }
}

function mapDoctorRow(row: Record<string, unknown>): Doctor {
  return {
    id: trimStr(row['id']) ?? '',
    userId: trimStr(row['user_id']) ?? '',
    fullName: trimStr(row['full_name']) ?? 'Unnamed Doctor',
    specialization: trimStr(row['specialization']) ?? '',
    consultationFee: normalizeNum(row['consultation_fee']),
    slotDurationMinutes: 30,
    slotCapacity: 1,
    dailyPatientLimit: null,
    status: (trimStr(row['status']) as DoctorStatus) ?? 'Active',
    profilePhotoUrl: trimStr(row['profile_photo_url']),
    averageRating: normalizeNum(row['average_rating']),
    reviewCount: normalizeNum(row['review_count']),
  };
}

function trimStr(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t || undefined;
}

function normalizeNum(value: unknown): number {
  if (typeof value !== 'number') return 0;
  return Number.isFinite(value) ? value : 0;
}

function normalizeNumOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'number') return undefined;
  return Number.isFinite(value) ? value : undefined;
}

import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, map, catchError, of, forkJoin } from 'rxjs';
import {
  AvailabilityStatus,
  Doctor,
  DoctorBlockedDate,
  DoctorDayStatus,
  DoctorSchedule,
  DoctorStatus
} from '../models';
import { ApiService } from './api.service';
import { MockDataService } from './mock-data.service';

const toLocalIsoDate = (): string => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

/** Map API DoctorSummaryDto to frontend Doctor model. */
function mapDoctor(dto: any): Doctor {
  return {
    id: dto.id,
    userId: dto.userId ?? '',
    fullName: dto.fullName ?? 'Unnamed Doctor',
    specialization: dto.specialization ?? '',
    consultationFee: dto.consultationFee ?? 0,
    slotDurationMinutes: 30,
    slotCapacity: 1,
    dailyPatientLimit: null,
    status: dto.status ?? 'Active',
    profilePhotoUrl: dto.profilePhotoUrl,
    averageRating: dto.averageRating,
    reviewCount: dto.reviewCount ?? 0
  };
}

@Injectable({ providedIn: 'root' })
export class DoctorStateService {
  private readonly mockData = inject(MockDataService);
  private readonly api = inject(ApiService);
  private readonly doctorsSubject = new BehaviorSubject<Doctor[]>(this.mockData.getDoctors());
  private readonly schedulesSubject = new BehaviorSubject<DoctorSchedule[]>(
    this.mockData.getDoctorSchedules()
  );
  private readonly blockedDatesSubject = new BehaviorSubject<DoctorBlockedDate[]>(
    this.mockData.getDoctorBlockedDates()
  );
  private readonly dayStatusesSubject = new BehaviorSubject<Record<string, DoctorDayStatus>>({});
  private readonly loadingSubject = new BehaviorSubject(false);

  readonly doctors$ = this.doctorsSubject.asObservable();
  readonly schedules$ = this.schedulesSubject.asObservable();
  readonly blockedDates$ = this.blockedDatesSubject.asObservable();
  readonly dayStatuses$ = this.dayStatusesSubject.asObservable();
  readonly isLoading$ = this.loadingSubject.asObservable();

  readonly doctors = toSignal(this.doctors$, { initialValue: this.doctorsSubject.value });
  readonly isLoading = toSignal(this.isLoading$, { initialValue: false });

  refresh(): void {
    this.doctorsSubject.next(this.mockData.getDoctors());
    this.schedulesSubject.next(this.mockData.getDoctorSchedules());
    this.blockedDatesSubject.next(this.mockData.getDoctorBlockedDates());
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

  // ─── REAL API METHODS ──────────────────────────────

  /** Load all doctors from real API (for staff pages). */
  loadDoctorsFromApi(): void {
    this.loadingSubject.next(true);
    this.api.get<any[]>('/api/doctors/admin').pipe(
      map((items) => items.map(mapDoctor)),
      catchError(() => {
        this.loadingSubject.next(false);
        return of([]);
      })
    ).subscribe((doctors) => {
      this.doctorsSubject.next(doctors);
      this.loadingSubject.next(false);
      // Load day statuses for each doctor
      if (doctors.length > 0) {
        forkJoin(doctors.map((d) => this.loadSingleDayStatus(d.id))).subscribe();
      }
    });
  }

  /** Load today's day status for a single doctor from real API. */
  loadSingleDayStatus(doctorId: string): Observable<void> {
    return this.api.get<any[]>(`/api/doctors/${doctorId}/day-status`).pipe(
      map((statuses) => {
        const today = toLocalIsoDate();
        const todayStatus = statuses?.find((s: any) => s.date === today);
        if (todayStatus) {
          this.dayStatusesSubject.next({
            ...this.dayStatusesSubject.value,
            [doctorId]: {
              id: todayStatus.id ?? '',
              doctorId,
              date: today,
              status: todayStatus.status as AvailabilityStatus,
              runningLateMinutes: todayStatus.runningLateMinutes
            }
          });
        }
      }),
      catchError(() => of(void 0))
    );
  }

  /** Update day status via real API, then refresh local state. */
  updateDayStatusViaApi(doctorId: string, status: AvailabilityStatus, runningLateMinutes?: number): Observable<any> {
    const body: Record<string, any> = { date: toLocalIsoDate(), status };
    if (runningLateMinutes !== undefined) {
      body['runningLateMinutes'] = runningLateMinutes;
    }
    return this.api.post(`/api/doctors/${doctorId}/day-status`, body).pipe(
      map(() => {
        this.dayStatusesSubject.next({
          ...this.dayStatusesSubject.value,
          [doctorId]: { id: '', doctorId, date: toLocalIsoDate(), status, runningLateMinutes }
        });
      })
    );
  }

  addDoctor(doctor: Omit<Doctor, 'id'>): Doctor {
    const saved: Doctor = {
      ...doctor,
      id: `doc-${Date.now()}`,
      userId: doctor.userId || `user-doctor-${Date.now()}`
    };
    this.doctorsSubject.next([
      ...this.doctorsSubject.value.filter((item) => item.id !== saved.id),
      saved
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
        runningLateMinutes: event.runningLateMinutes
      }
    });
  }

  addBlockedDate(blockedDate: DoctorBlockedDate): void {
    this.blockedDatesSubject.next([
      ...this.blockedDatesSubject.value.filter((item) => item.id !== blockedDate.id),
      blockedDate
    ]);
  }

  removeBlockedDate(id: string): void {
    this.blockedDatesSubject.next(
      this.blockedDatesSubject.value.filter((blockedDate) => blockedDate.id !== id)
    );
  }
}

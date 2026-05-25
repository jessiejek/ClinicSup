import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Observable, Subject } from 'rxjs';
import { AuthStateService } from './auth-state.service';
import { SupabaseService } from './supabase.service';

// ── Event types — same interface consumers expect ──

export type ClinicDashboardEventName =
  | 'BookingCreated'
  | 'BookingCancelled'
  | 'PatientCheckedIn'
  | 'PatientCheckInUndone'
  | 'DoctorCompletedConsultation'
  | 'PaymentCompleted'
  | 'PaymentWaived'
  | 'DoctorScheduleUpdated'
  | 'DoctorServicesUpdated'
  | 'PatientProfileUpdated';

export interface ClinicDashboardEvent {
  eventName: ClinicDashboardEventName;
  bookingId?: string | null;
  patientId?: string | null;
  doctorId?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  finalAmount?: number | null;
  isProfessionalFeeWaived?: boolean | null;
  timestamp?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ClinicDashboardRealtimeService {
  private readonly authState = inject(AuthStateService);
  private readonly supabase = inject(SupabaseService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsSubject = new Subject<ClinicDashboardEvent>();

  private channels: RealtimeChannel[] = [];
  private subscribed = false;

  /** Public observable for dashboard events. */
  readonly events$: Observable<ClinicDashboardEvent> = this.eventsSubject.asObservable();

  /** Snapshot of the latest event (for debugging / reactive checks). */
  private lastEvent: ClinicDashboardEvent | null = null;

  constructor() {
    // Connect / disconnect when auth state changes
    this.authState.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (user) {
          this.ensureConnected();
        } else {
          this.disconnect();
        }
      });
  }

  // ── Lifecycle ─────────────────────────────────────

  /**
   * Subscribe to all relevant Postgres tables via Supabase Realtime.
   * Idempotent — safe to call multiple times.
   */
  ensureConnected(): void {
    if (this.subscribed) return;
    this.subscribed = true;

    // ── bookings table ────────────────────────────────
    this.channels.push(
      this.supabase.client
        .channel('realtime-bookings')
        .on(
          'postgres_changes' as any,
          { event: 'INSERT', schema: 'public', table: 'bookings' },
          (payload: any) => {
            const row = payload.new ?? {};
            this.emit('BookingCreated', {
              bookingId: row.id,
              patientId: row.patient_id,
              doctorId: row.doctor_id,
              status: row.status,
              paymentStatus: row.payment_status,
              timestamp: row.created_at ?? row.updated_at
            });
          }
        )
        .on(
          'postgres_changes' as any,
          { event: 'UPDATE', schema: 'public', table: 'bookings' },
          (payload: any) => {
            const row = payload.new ?? {};
            const prev = payload.old ?? {};

            // Status transitions
            if (row.status === 'Cancelled' && prev.status !== 'Cancelled') {
              this.emit('BookingCancelled', {
                bookingId: row.id, patientId: row.patient_id,
                doctorId: row.doctor_id, status: row.status, timestamp: row.updated_at
              });
            } else if (row.status === 'CheckedIn' && prev.status !== 'CheckedIn') {
              this.emit('PatientCheckedIn', {
                bookingId: row.id, patientId: row.patient_id,
                doctorId: row.doctor_id, status: row.status, timestamp: row.updated_at
              });
            } else if (row.status === 'Completed' && prev.status !== 'Completed') {
              this.emit('DoctorCompletedConsultation', {
                bookingId: row.id, patientId: row.patient_id,
                doctorId: row.doctor_id, status: row.status,
                finalAmount: row.final_amount,
                isProfessionalFeeWaived: row.is_professional_fee_waived,
                timestamp: row.updated_at
              });
            } else if (prev.status === 'CheckedIn' && row.status !== 'CheckedIn') {
              this.emit('PatientCheckInUndone', {
                bookingId: row.id, patientId: row.patient_id,
                doctorId: row.doctor_id, status: row.status, timestamp: row.updated_at
              });
            }

            // Payment status changes
            if (row.payment_status !== prev.payment_status) {
              if (row.payment_status === 'Paid') {
                this.emit('PaymentCompleted', {
                  bookingId: row.id, patientId: row.patient_id,
                  paymentStatus: row.payment_status, timestamp: row.updated_at
                });
              } else if (row.payment_status === 'Waived') {
                this.emit('PaymentWaived', {
                  bookingId: row.id, patientId: row.patient_id,
                  paymentStatus: row.payment_status, timestamp: row.updated_at
                });
              }
            }
          }
        )
        .subscribe()
    );

    // ── doctor_schedules table ────────────────────────
    this.channels.push(
      this.supabase.client
        .channel('realtime-doctor-schedules')
        .on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: 'doctor_schedules' },
          () => this.emit('DoctorScheduleUpdated', { timestamp: new Date().toISOString() })
        )
        .subscribe()
    );

    // ── doctor_services table ──────────────────────────
    this.channels.push(
      this.supabase.client
        .channel('realtime-doctor-services')
        .on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: 'doctor_services' },
          () => this.emit('DoctorServicesUpdated', { timestamp: new Date().toISOString() })
        )
        .subscribe()
    );

    // ── doctor_day_statuses table ──────────────────────
    this.channels.push(
      this.supabase.client
        .channel('realtime-doctor-day-statuses')
        .on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: 'doctor_day_statuses' },
          () => this.emit('DoctorScheduleUpdated', { timestamp: new Date().toISOString() })
        )
        .subscribe()
    );

    // ── patients table ─────────────────────────────────
    this.channels.push(
      this.supabase.client
        .channel('realtime-patients')
        .on(
          'postgres_changes' as any,
          { event: 'UPDATE', schema: 'public', table: 'patients' },
          (payload: any) => {
            const row = payload.new ?? {};
            this.emit('PatientProfileUpdated', {
              patientId: row.id, timestamp: row.updated_at
            });
          }
        )
        .subscribe()
    );
  }

  /**
   * Disconnect all Realtime channels.
   */
  disconnect(): void {
    this.subscribed = false;
    for (const channel of this.channels) {
      this.supabase.client.removeChannel(channel);
    }
    this.channels = [];
  }

  // ── Helpers ─────────────────────────────────────────

  private emit(eventName: ClinicDashboardEventName, partial?: Partial<ClinicDashboardEvent>): void {
    const event: ClinicDashboardEvent = { eventName, ...partial };
    this.lastEvent = event;
    this.eventsSubject.next(event);
  }
}

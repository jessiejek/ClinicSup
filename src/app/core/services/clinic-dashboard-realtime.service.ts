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

  /** Track booking status locally so we can detect transitions even when payload.old has no status. */
  private bookingStatuses = new Map<string, string>();
  private bookingPaymentStatuses = new Map<string, string>();

  /** Public observable for dashboard events. */
  readonly events$: Observable<ClinicDashboardEvent> = this.eventsSubject.asObservable();

  constructor() {
    this.authState.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (user) {
          console.log('[Realtime] User logged in — connecting channels');
          this.ensureConnected();
        } else {
          console.log('[Realtime] User logged out — disconnecting channels');
          this.disconnect();
        }
      });
  }

  ensureConnected(): void {
    if (this.subscribed) return;
    this.subscribed = true;
    console.log('[Realtime] Creating channels...');

    const subSink = (name: string, channel: RealtimeChannel) => {
      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] ✅ Channel "${name}" subscribed`);
        } else {
          console.warn(`[Realtime] ⚠️ Channel "${name}" status: ${status}`, err ?? '');
        }
      });
      return channel;
    };

    // ── bookings table ────────────────────────────────
    this.channels.push(
      subSink(
        'realtime-bookings',
        this.supabase.client
          .channel('realtime-bookings')
          .on(
            'postgres_changes' as any,
            { event: 'INSERT', schema: 'public', table: 'bookings' },
            (payload: any) => {
              const row = payload.new ?? {};
              console.log('[Realtime] 🔵 Booking INSERT', row.id, row.status);
              if (row.id && row.status) {
                this.bookingStatuses.set(row.id, row.status);
              }
              if (row.id && row.payment_status) {
                this.bookingPaymentStatuses.set(row.id, row.payment_status);
              }
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
              const prevStatus = this.bookingStatuses.get(row.id);
              console.log('[Realtime] 🟡 Booking UPDATE', row.id, row.status, 'was', prevStatus);

              // ── Status transitions (use tracked prevStatus, not payload.old) ──
              if (row.status === 'Cancelled' && prevStatus !== 'Cancelled') {
                this.emit('BookingCancelled', {
                  bookingId: row.id, patientId: row.patient_id,
                  doctorId: row.doctor_id, status: row.status, timestamp: row.updated_at
                });
              } else if (row.status === 'CheckedIn' && prevStatus !== 'CheckedIn') {
                this.emit('PatientCheckedIn', {
                  bookingId: row.id, patientId: row.patient_id,
                  doctorId: row.doctor_id, status: row.status, timestamp: row.updated_at
                });
              } else if (row.status === 'Completed' && prevStatus !== 'Completed') {
                this.emit('DoctorCompletedConsultation', {
                  bookingId: row.id, patientId: row.patient_id,
                  doctorId: row.doctor_id, status: row.status,
                  finalAmount: row.final_amount,
                  isProfessionalFeeWaived: row.is_professional_fee_waived,
                  timestamp: row.updated_at
                });
              } else if (prevStatus === 'CheckedIn' && row.status !== 'CheckedIn') {
                this.emit('PatientCheckInUndone', {
                  bookingId: row.id, patientId: row.patient_id,
                  doctorId: row.doctor_id, status: row.status, timestamp: row.updated_at
                });
              }

              // ── Payment status changes ──
              const prevPaymentStatus = this.bookingPaymentStatuses.get(row.id);
              if (row.payment_status && row.payment_status !== prevPaymentStatus) {
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

              // ── Update tracked state ──
              if (row.id) {
                this.bookingStatuses.set(row.id, row.status);
                if (row.payment_status) {
                  this.bookingPaymentStatuses.set(row.id, row.payment_status);
                }
              }
            }
          )
      )
    );

    // ── doctor tables ─────────────────────────────────
    this.channels.push(
      subSink(
        'realtime-doctor-schedules',
        this.supabase.client
          .channel('realtime-doctor-schedules')
          .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'doctor_schedules' },
            () => this.emit('DoctorScheduleUpdated', { timestamp: new Date().toISOString() }))
      )
    );

    this.channels.push(
      subSink(
        'realtime-doctor-services',
        this.supabase.client
          .channel('realtime-doctor-services')
          .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'doctor_services' },
            () => this.emit('DoctorServicesUpdated', { timestamp: new Date().toISOString() }))
      )
    );

    this.channels.push(
      subSink(
        'realtime-doctor-day-statuses',
        this.supabase.client
          .channel('realtime-doctor-day-statuses')
          .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'doctor_day_statuses' },
            () => this.emit('DoctorScheduleUpdated', { timestamp: new Date().toISOString() }))
      )
    );

    // ── patients table ─────────────────────────────────
    this.channels.push(
      subSink(
        'realtime-patients',
        this.supabase.client
          .channel('realtime-patients')
          .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'patients' },
            (payload: any) => {
              const row = payload.new ?? {};
              this.emit('PatientProfileUpdated', {
                patientId: row.id, timestamp: row.updated_at
              });
            })
      )
    );

    console.log('[Realtime] All channels created');
  }

  disconnect(): void {
    this.subscribed = false;
    for (const channel of this.channels) {
      this.supabase.client.removeChannel(channel);
    }
    this.channels = [];
    this.bookingStatuses.clear();
    this.bookingPaymentStatuses.clear();
    console.log('[Realtime] All channels disconnected');
  }

  private emit(eventName: ClinicDashboardEventName, partial?: Partial<ClinicDashboardEvent>): void {
    const event: ClinicDashboardEvent = { eventName, ...partial };
    console.log('[Realtime] 🔔 Emit event:', eventName, event.bookingId ?? '');
    this.eventsSubject.next(event);
  }
}

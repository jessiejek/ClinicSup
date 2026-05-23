import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStateService } from './auth-state.service';
import { TokenService } from './token.service';

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

const EVENT_NAMES: ClinicDashboardEventName[] = [
  'BookingCreated',
  'BookingCancelled',
  'PatientCheckedIn',
  'PatientCheckInUndone',
  'DoctorCompletedConsultation',
  'PaymentCompleted',
  'PaymentWaived',
  'DoctorScheduleUpdated',
  'DoctorServicesUpdated',
  'PatientProfileUpdated'
];

@Injectable({ providedIn: 'root' })
export class ClinicDashboardRealtimeService {
  private readonly authState = inject(AuthStateService);
  private readonly tokenService = inject(TokenService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsSubject = new Subject<ClinicDashboardEvent>();

  private connection?: HubConnection;
  private manualDisconnect = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  readonly events$: Observable<ClinicDashboardEvent> = this.eventsSubject.asObservable();

  constructor() {
    this.authState.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (user) {
          void this.ensureConnected();
        } else {
          void this.disconnect();
        }
      });
  }

  async ensureConnected(): Promise<void> {
    if (!this.authState.snapshot) {
      return;
    }

    this.manualDisconnect = false;
    this.clearReconnectTimer();

    if (!this.connection) {
      this.connection = this.createConnection();
    }

    if (
      this.connection.state === HubConnectionState.Connected ||
      this.connection.state === HubConnectionState.Connecting ||
      this.connection.state === HubConnectionState.Reconnecting
    ) {
      return;
    }

    try {
      await this.connection.start();
    } catch (error) {
      console.warn('Failed to connect to clinic dashboard hub.', error);
      this.scheduleReconnect();
    }
  }

  async disconnect(): Promise<void> {
    this.manualDisconnect = true;
    this.clearReconnectTimer();

    if (!this.connection) {
      return;
    }

    const current = this.connection;
    this.connection = undefined;

    try {
      await current.stop();
    } catch (error) {
      console.warn('Failed to stop clinic dashboard hub connection.', error);
    }
  }

  private createConnection(): HubConnection {
    const connection = new HubConnectionBuilder()
      .withUrl(buildClinicDashboardHubUrl(), {
        accessTokenFactory: () => this.tokenService.getAccessToken() ?? ''
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    EVENT_NAMES.forEach((eventName) => {
      connection.on(eventName, (payload: unknown) => {
        this.eventsSubject.next(normalizeRealtimeEvent(eventName, payload));
      });
    });

    connection.onclose(() => {
      if (!this.manualDisconnect && this.authState.snapshot) {
        this.scheduleReconnect();
      }
    });

    return connection;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.authState.snapshot) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.ensureConnected();
    }, 5000);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}

function buildClinicDashboardHubUrl(): string {
  const url = new URL(environment.apiBaseUrl);
  const basePath = url.pathname.replace(/\/api(?:\/v\d+)?\/?$/i, '');
  url.pathname = `${basePath}/hubs/clinic-dashboard`.replace(/\/{2,}/g, '/');
  url.search = '';
  url.hash = '';
  return url.toString();
}

function normalizeRealtimeEvent(eventName: ClinicDashboardEventName, payload: unknown): ClinicDashboardEvent {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { eventName };
  }

  const source = payload as Record<string, unknown>;

  return {
    eventName,
    bookingId: normalizeNullableString(source['bookingId']),
    patientId: normalizeNullableString(source['patientId']),
    doctorId: normalizeNullableString(source['doctorId']),
    status: normalizeNullableString(source['status']),
    paymentStatus: normalizeNullableString(source['paymentStatus']),
    finalAmount: normalizeNullableNumber(source['finalAmount']),
    isProfessionalFeeWaived: normalizeNullableBoolean(source['isProfessionalFeeWaived']),
    timestamp: normalizeNullableString(source['timestamp'])
  };
}

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeNullableNumber(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function normalizeNullableBoolean(value: unknown): boolean | null | undefined {
  if (value === null) {
    return null;
  }

  return typeof value === 'boolean' ? value : undefined;
}

import { Injectable, inject } from '@angular/core';
import { ClinicDashboardRealtimeService } from './clinic-dashboard-realtime.service';
import { PushNotificationService } from './push-notification.service';

/**
 * Bootstraps all Supabase Realtime features at the app-shell level.
 *
 * Inject this once in each portal layout component. The side effect of
 * injecting the dependencies is that their constructors start the
 * auth-synced lifecycle (connect on login, disconnect on logout).
 *
 * Services activated:
 *   - **ClinicDashboardRealtimeService** — subscribes to `bookings`,
 *     `doctor_schedules`, `doctor_services`, `doctor_day_statuses`,
 *     `patients` tables for live dashboard events.
 *   - **PushNotificationService** — subscribes to `notifications` table
 *     for in-app delivery + registers browser for web push.
 *
 * Usage:
 * ```ts
 * // In your layout component:
 * private readonly realtimeInit = inject(RealtimeInitService);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class RealtimeInitService {
  readonly clinicRealtime = inject(ClinicDashboardRealtimeService);
  readonly pushNotifications = inject(PushNotificationService);
}

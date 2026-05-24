import { Injectable, inject } from '@angular/core';
import { Observable, catchError, combineLatest, from, map, of, switchMap } from 'rxjs';
import { DoctorSchedule, DayOfWeek } from '../../../core/models';
import { SupabaseService } from '../../../core/services/supabase.service';
import { PublicService, AvailableSlot } from './public.service';

export interface WorkingDay {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

const DAY_NAMES: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Shared booking availability service used by Patient Booking (Step 2 + 3),
 * Staff Walk-in, and Admin Walk-in.
 *
 * All date logic uses Asia/Manila timezone because that is the clinic's
 * operating timezone. The `get_available_slots` and `create_booking` RPCs
 * also use `CURRENT_DATE` (server timezone, typically UTC), so the frontend
 * must send dates that match what the server considers "today."
 *
 * This service normalizes to Asia/Manila via Intl.DateTimeFormat to stay
 * consistent with the rest of the app (e.g. step-slot-select.component.ts).
 */
@Injectable({ providedIn: 'root' })
export class BookingAvailabilityService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly publicService = inject(PublicService);

  // ── Date Helpers ─────────────────────────────────

  /** Today's date in Asia/Manila as YYYY-MM-DD. */
  getManilaTodayIso(): string {
    return getManilaDateStr(new Date());
  }

  /** Convert a YYYY-MM-DD string to a normalized DayOfWeek name in Manila timezone. */
  getManilaDayOfWeek(dateStr: string): DayOfWeek {
    const dow = getManilaDayIndex(dateStr);
    return DAY_NAMES[dow] ?? 'Monday';
  }

  /**
   * Check if `dateStr` (YYYY-MM-DD) is today in Asia/Manila.
   * This is used instead of `isDateTodayInManila` in step-slot-select.
   */
  isManilaToday(dateStr: string): boolean {
    return dateStr === this.getManilaTodayIso();
  }

  /**
   * Check if `dateStr` is in the past relative to Asia/Manila.
   * Treats today as NOT past.
   */
  isManilaPast(dateStr: string): boolean {
    return dateStr < this.getManilaTodayIso();
  }

  /**
   * Get the date string for `offsetDays` from today in Asia/Manila.
   * offsetDays=0 → today, offsetDays=1 → tomorrow, etc.
   */
  getManilaDateOffset(offsetDays: number): string {
    const manilaNow = getManilaNow();
    const target = new Date(manilaNow.getTime() + offsetDays * 86400000);
    return getManilaDateStr(target);
  }

  // ── Doctor Schedule ──────────────────────────────

  /**
   * Get a doctor's working days from doctor_schedules.
   * Returns empty array on error (logged to console).
   */
  getDoctorWorkingDays(doctorId: string): Observable<WorkingDay[]> {
    return from(this.fetchDoctorSchedules(doctorId)).pipe(
      map((rows) =>
        rows.map((row) => ({
          dayOfWeek: normalizeScheduleDayOfWeek(row.day_of_week),
          startTime: normalizeTime(row.start_time),
          endTime: normalizeTime(row.end_time),
        }))
      ),
      catchError((error: unknown) => {
        console.error('[BookingAvailabilityService] Failed to load doctor schedules:', error);
        return of([]);
      })
    );
  }

  /**
   * Check if a doctor works on a specific YYYY-MM-DD date.
   * The date is evaluated in Asia/Manila timezone for day-of-week matching.
   */
  isDoctorAvailableOnDate(doctorId: string, dateStr: string): Observable<boolean> {
    return this.getDoctorWorkingDays(doctorId).pipe(
      map((workingDays) => {
        const dayOfWeek = this.getManilaDayOfWeek(dateStr);
        return workingDays.some((wd) => wd.dayOfWeek === dayOfWeek);
      })
    );
  }

  /**
   * Get available slots for a doctor + date from the `get_available_slots` RPC.
   */
  getAvailableSlots(doctorId: string, dateStr: string): Observable<AvailableSlot[]> {
    return this.publicService.getAvailableSlots(doctorId, dateStr);
  }

  /**
   * Check if a doctor+date+time slot is bookable:
   * - Doctor must have a schedule on that day of week (Manila timezone)
   * - Date must not be in the past (Manila timezone)
   * - Slots must exist via RPC
   */
  canBookOnDate(doctorId: string, dateStr: string): Observable<boolean> {
    if (this.isManilaPast(dateStr)) {
      return of(false);
    }
    return this.isDoctorAvailableOnDate(doctorId, dateStr);
  }

  // ── Private ──────────────────────────────────────

  private async fetchDoctorSchedules(doctorId: string): Promise<DoctorScheduleRow[]> {
    const { data, error } = await this.supabase
      .from('doctor_schedules')
      .select('id, doctor_id, day_of_week, start_time, end_time')
      .eq('doctor_id', doctorId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as DoctorScheduleRow[];
  }
}

// ── Typed interfaces for the raw DB row ─────────────────

interface DoctorScheduleRow {
  id: string;
  doctor_id: string;
  day_of_week: string;
  start_time: string | null;
  end_time: string | null;
}

// ── Pure helper functions ────────────────────────────────

const ALLOWED_DAY_NAMES: DayOfWeek[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

function normalizeScheduleDayOfWeek(value: unknown): DayOfWeek {
  if (typeof value !== 'string') return 'Monday';
  const normalized = value.trim().toLowerCase();
  return ALLOWED_DAY_NAMES.find((d) => d.toLowerCase() === normalized) ?? 'Monday';
}

function normalizeTime(value: string | null | undefined): string {
  if (!value) return '00:00';
  const trimmed = value.trim();
  return trimmed.length >= 5 ? trimmed.slice(0, 5) : trimmed;
}

function getManilaNow(): Date {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '0';
  return new Date(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')),
    Number(get('minute')),
    Number(get('second')),
  );
}

function getManilaDateStr(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '0';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  return `${year}-${month}-${day}`;
}

function getManilaDayIndex(dateStr: string): number {
  // Parse YYYY-MM-DD into Asia/Manila timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create a date-like object to ask the formatter for the day-of-week
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  // Use Intl to get the Manila-local day-of-week
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
  }).formatToParts(date);

  const dayName = parts.find((p) => p.type === 'weekday')?.value ?? 'Monday';
  const idx = DAY_NAMES.findIndex((d) => d.toLowerCase() === dayName.toLowerCase());
  return idx >= 0 ? idx : 1; // fallback to Monday (index 1)
}

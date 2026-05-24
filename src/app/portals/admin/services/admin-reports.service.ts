import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface UnpaidCompletedVisitReportRow {
  bookingId: string;
  patient: string;
  doctor: string;
  service: string;
  visitDate: string;
  amount: number;
  paymentStatus: string;
}

export interface PendingFollowUpReportRow {
  patient: string;
  doctor: string;
  followUpDate: string;
  reason: string;
  status: string;
}

export interface DailyBookingSummaryRow {
  date: string;
  totalBookings: number;
  completed: number;
  cancelled: number;
  noShow: number;
  revenue: number;
}

@Injectable({ providedIn: 'root' })
export class AdminReportsService {
  private readonly supabase = inject(SupabaseService).client;

  getUnpaidCompletedVisits(): Observable<UnpaidCompletedVisitReportRow[]> {
    return from(
      this.supabase
        .from('patient_bookings_view')
        .select('*')
        .eq('booking_status', 'Completed')
        .eq('payment_status', 'Unpaid')
        .order('appointment_date', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('[AdminReportsService] Failed to fetch unpaid completed visits:', error.message);
          return [];
        }
        return ((data ?? []) as Record<string, unknown>[]).map(mapVisitRow);
      })
    );
  }

  getPendingFollowUps(): Observable<PendingFollowUpReportRow[]> {
    return from(
      this.supabase
        .from('consultation_record_view')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('[AdminReportsService] Failed to fetch pending follow-ups:', error.message);
          return [];
        }
        const rows: PendingFollowUpReportRow[] = [];
        const records = (data ?? []) as Record<string, unknown>[];
        for (const record of records) {
          const followUps = extractFollowUpArray(record['follow_ups']);
          for (const fu of followUps) {
            const followUpDate = trimOrNull(fu['follow_up_date']);
            if (!followUpDate) {
              continue;
            }
            rows.push({
              patient: trimOrNull(record['patient_name']) ?? trimOrNull(record['patient_id']) ?? 'Patient',
              doctor: trimOrNull(record['doctor_name']) ?? trimOrNull(record['doctor_id']) ?? 'Doctor',
              followUpDate,
              reason: trimOrNull(fu['reason']) ?? trimOrNull(fu['instructions']) ?? 'Follow-up',
              status: 'Pending',
            });
          }
        }
        rows.sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));
        return rows;
      })
    );
  }

  getDailyBookingSummary(): Observable<DailyBookingSummaryRow[]> {
    return from(
      this.supabase
        .from('patient_bookings_view')
        .select('*')
        .order('appointment_date', { ascending: true })
        .limit(1000)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('[AdminReportsService] Failed to fetch booking summary:', error.message);
          return [];
        }
        return buildDailySummaryFromRows((data ?? []) as Record<string, unknown>[]);
      })
    );
  }
}

function mapVisitRow(row: Record<string, unknown>): UnpaidCompletedVisitReportRow {
  const services = extractServiceNames(row['services']);
  return {
    bookingId: trimOrNull(row['booking_id']) ?? '',
    patient: trimOrNull(row['patient_name']) ?? 'Patient',
    doctor: trimOrNull(row['doctor_name']) ?? 'Doctor',
    service: services[0] ?? trimOrNull(row['primary_service_name']) ?? 'Consultation',
    visitDate: normalizeDateOnly(row['appointment_date']),
    amount: normalizeNumber(row['final_amount']) || normalizeNumber(row['total_fee'], 0),
    paymentStatus: normalizePaymentStatusLabel(row['payment_status']),
  };
}

function buildDailySummaryFromRows(rows: Record<string, unknown>[]): DailyBookingSummaryRow[] {
  const dayMap = new Map<string, {
    total: number; completed: number; cancelled: number; noShow: number; revenue: number;
  }>();

  for (const row of rows) {
    const date = normalizeDateOnly(row['appointment_date']);
    if (!date) { continue; }
    let entry = dayMap.get(date);
    if (!entry) {
      entry = { total: 0, completed: 0, cancelled: 0, noShow: 0, revenue: 0 };
      dayMap.set(date, entry);
    }
    entry.total++;
    const status = trimOrNull(row['booking_status']);
    if (status === 'Completed') {
      entry.completed++;
      entry.revenue += normalizeNumber(row['final_amount']) || normalizeNumber(row['total_fee'], 0);
    } else if (status === 'Cancelled') {
      entry.cancelled++;
    } else if (status === 'NoShow') {
      entry.noShow++;
    }
  }

  return Array.from(dayMap.entries())
    .map(([date, counts]): DailyBookingSummaryRow => ({
      date,
      totalBookings: counts.total,
      completed: counts.completed,
      cancelled: counts.cancelled,
      noShow: counts.noShow,
      revenue: counts.revenue,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function extractFollowUpArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v));
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'object' && v !== null) : [];
    } catch { return []; }
  }
  return [];
}

function extractServiceNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((s) => {
      if (typeof s === 'object' && s !== null) {
        return trimOrNull((s as Record<string, unknown>)['service_name']) ?? trimOrNull((s as Record<string, unknown>)['name']) ?? '';
      }
      return '';
    }).filter(Boolean);
  }
  return [];
}

function normalizeDateOnly(value: unknown): string {
  const raw = trimOrNull(value);
  if (!raw) { return ''; }
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) { return value; }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) { return parsed; }
  }
  return fallback;
}

function normalizePaymentStatusLabel(value: unknown): string {
  const raw = trimOrNull(value);
  if (!raw) { return 'Unpaid'; }
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function trimOrNull(value: unknown): string | undefined {
  if (typeof value !== 'string') { return undefined; }
  const trimmed = value.trim();
  return trimmed || undefined;
}

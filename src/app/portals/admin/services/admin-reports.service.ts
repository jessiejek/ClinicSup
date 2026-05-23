import { Injectable, inject } from '@angular/core';
import { Observable, map, timer } from 'rxjs';
import { MockDataService } from '../../../core/services/mock-data.service';

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
  private readonly mockData = inject(MockDataService);

  getUnpaidCompletedVisits(): Observable<UnpaidCompletedVisitReportRow[]> {
    return timer(400).pipe(map(() => this.mockData.getUnpaidCompletedVisitReportRows()));
  }

  getPendingFollowUps(): Observable<PendingFollowUpReportRow[]> {
    return timer(400).pipe(map(() => this.mockData.getPendingFollowUpReportRows()));
  }

  getDailyBookingSummary(): Observable<DailyBookingSummaryRow[]> {
    return timer(400).pipe(map(() => this.mockData.getDailyBookingSummaryRows()));
  }
}

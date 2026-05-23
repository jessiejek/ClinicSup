import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { MockDataService } from '../../../core/services/mock-data.service';
import {
  AdminReportsService,
  DailyBookingSummaryRow,
  PendingFollowUpReportRow,
  UnpaidCompletedVisitReportRow
} from '../services/admin-reports.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-admin-reports-page',
  standalone: true,
  imports: [DatePipe, FormsModule, NgFor, NgIf, EmptyStateComponent, SkeletonComponent],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Reports</h2>
          <p class="page-subtitle">Review clinic collections, follow-ups, and daily booking trends.</p>
        </div>
        <button class="btn-outline" type="button" (click)="exportCsv()">Export CSV</button>
      </div>

      <div class="clinic-card filters-card">
        <label class="field">
          <span>Date From</span>
          <input type="date" class="filter-input" [(ngModel)]="dateFrom" (ngModelChange)="applyFilters()" />
        </label>
        <label class="field">
          <span>Date To</span>
          <input type="date" class="filter-input" [(ngModel)]="dateTo" (ngModelChange)="applyFilters()" />
        </label>
      </div>

      <app-skeleton *ngIf="isLoading" variant="card" [count]="3"></app-skeleton>

      <ng-container *ngIf="!isLoading">
        <div class="clinic-card report-block">
          <div class="section-heading">Unpaid Completed Visits</div>
          <table class="clinic-table" *ngIf="filteredUnpaidVisits.length > 0; else unpaidEmpty">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Service</th>
                <th>Visit Date</th>
                <th>Amount</th>
                <th>Payment Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of filteredUnpaidVisits">
                <td class="data-mono">{{ row.bookingId }}</td>
                <td>{{ row.patient }}</td>
                <td>{{ row.doctor }}</td>
                <td>{{ row.service }}</td>
                <td>{{ row.visitDate }}</td>
                <td>PHP {{ row.amount }}</td>
                <td><span class="status-pill status-pill--warning">{{ row.paymentStatus }}</span></td>
                <td>
                  <button class="btn-ghost" type="button" (click)="viewBooking(row.bookingId)">View booking</button>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #unpaidEmpty>
            <app-empty-state
              icon="cash-outline"
              title="No unpaid completed visits"
              description="All completed visits are fully settled for the selected range."
            ></app-empty-state>
          </ng-template>
        </div>

        <div class="clinic-card report-block">
          <div class="section-heading">Pending Follow-Ups</div>
          <table class="clinic-table" *ngIf="filteredFollowUps.length > 0; else followUpEmpty">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Follow-up Date</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of filteredFollowUps">
                <td>{{ row.patient }}</td>
                <td>{{ row.doctor }}</td>
                <td>{{ row.followUpDate }}</td>
                <td>{{ row.reason }}</td>
                <td><span class="status-pill status-pill--info">{{ row.status }}</span></td>
                <td>
                  <button class="btn-ghost" type="button" (click)="sendReminder(row)">Send reminder</button>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #followUpEmpty>
            <app-empty-state
              icon="refresh-outline"
              title="No pending follow-ups"
              description="There are no follow-up items in the selected range."
            ></app-empty-state>
          </ng-template>
        </div>

        <div class="clinic-card report-block">
          <div class="section-heading">Daily Booking Summary</div>
          <table class="clinic-table" *ngIf="filteredDailySummary.length > 0; else summaryEmpty">
            <thead>
              <tr>
                <th>Date</th>
                <th>Total Bookings</th>
                <th>Completed</th>
                <th>Cancelled</th>
                <th>No-show</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of filteredDailySummary">
                <td>{{ row.date }}</td>
                <td>{{ row.totalBookings }}</td>
                <td>{{ row.completed }}</td>
                <td>{{ row.cancelled }}</td>
                <td>{{ row.noShow }}</td>
                <td>PHP {{ row.revenue }}</td>
              </tr>
            </tbody>
          </table>
          <ng-template #summaryEmpty>
            <app-empty-state
              icon="stats-chart-outline"
              title="No booking summaries"
              description="The selected date range does not return any summary rows."
            ></app-empty-state>
          </ng-template>
        </div>
      </ng-container>
    </section>
  `,
  styleUrl: './reports.page.scss'
})
export class ReportsPage implements OnInit {
  private readonly reportsService = inject(AdminReportsService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly mockData = inject(MockDataService);

  isLoading = true;
  dateFrom = this.daysAgoIso(7);
  dateTo = this.daysAheadIso(30);
  unpaidVisits: UnpaidCompletedVisitReportRow[] = [];
  followUps: PendingFollowUpReportRow[] = [];
  dailySummary: DailyBookingSummaryRow[] = [];
  filteredUnpaidVisits: UnpaidCompletedVisitReportRow[] = [];
  filteredFollowUps: PendingFollowUpReportRow[] = [];
  filteredDailySummary: DailyBookingSummaryRow[] = [];
  private loadedSections = 0;

  ngOnInit(): void {
    this.reportsService.getUnpaidCompletedVisits().subscribe((rows) => {
      this.unpaidVisits = rows;
      this.applyFilters();
      this.markSectionLoaded();
    });
    this.reportsService.getPendingFollowUps().subscribe((rows) => {
      this.followUps = rows;
      this.applyFilters();
      this.markSectionLoaded();
    });
    this.reportsService.getDailyBookingSummary().subscribe((rows) => {
      this.dailySummary = rows;
      this.applyFilters();
      this.markSectionLoaded();
    });
  }

  applyFilters(): void {
    this.filteredUnpaidVisits = this.unpaidVisits.filter((row) => this.isWithinRange(row.visitDate));
    this.filteredFollowUps = this.followUps.filter((row) => this.isWithinRange(row.followUpDate));
    this.filteredDailySummary = this.dailySummary.filter((row) => this.isWithinRange(row.date));
  }

  viewBooking(bookingId: string): void {
    if (this.mockData.getBookingById(bookingId)) {
      void this.router.navigate(['/admin/bookings', bookingId]);
      return;
    }
    void this.presentToast('View booking is mocked for this report row.');
  }

  sendReminder(row: PendingFollowUpReportRow): void {
    void row;
    void this.presentToast('Reminder sent successfully.');
  }

  exportCsv(): void {
    void this.presentToast('CSV export coming soon.');
  }

  private isWithinRange(date: string): boolean {
    return (!this.dateFrom || date >= this.dateFrom) && (!this.dateTo || date <= this.dateTo);
  }

  private markSectionLoaded(): void {
    this.loadedSections += 1;
    if (this.loadedSections >= 3) {
      this.isLoading = false;
    }
  }

  private todayIso(): string {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - offset).toISOString().slice(0, 10);
  }

  private daysAgoIso(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }

  private daysAheadIso(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1800,
      color: 'primary',
      position: 'top'
    });
    await toast.present();
  }
}

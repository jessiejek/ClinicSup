import { AsyncPipe, CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { ApiService } from '../../../core/services/api.service';
import { MockDataService } from '../../../core/services/mock-data.service';
import { TodayAppointmentsTableComponent } from '../components/today-appointments-table/today-appointments-table.component';
import { StatCardComponent } from '../components/stat-card/stat-card.component';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [
    AsyncPipe,
    CurrencyPipe,
    DatePipe,
    NgFor,
    NgIf,
    StatCardComponent,
    TodayAppointmentsTableComponent
  ],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Dashboard</h2>
          <p class="page-subtitle">Live admin overview for bookings, patients, and payments.</p>
        </div>
      </div>

      <div class="stats-grid">
        <app-stat-card color="green" icon="calendar-outline" label="Today's Appointments" [value]="todayAppointmentsCount"></app-stat-card>
        <app-stat-card color="blue" icon="stats-chart-outline" label="Monthly Appointments" [value]="monthlyAppointmentsCount"></app-stat-card>
        <app-stat-card color="amber" icon="cash-outline" label="Revenue Today" [value]="(revenueToday | currency:'PHP':'symbol-narrow':'1.0-0') || 'PHP 0'"></app-stat-card>
        <app-stat-card color="red" icon="alert-circle-outline" label="Pending Verifications" [value]="pendingVerificationCount" badgeLabel="Action Required"></app-stat-card>
        <app-stat-card color="blue" icon="time-outline" label="On Hold Bookings" [value]="onHoldCount"></app-stat-card>
        <app-stat-card color="red" icon="warning-outline" label="Unpaid Completed" [value]="unpaidCompletedCount" badgeLabel="Collect Payment"></app-stat-card>
        <app-stat-card color="gray" icon="person-remove-outline" label="No Shows Today" [value]="noShowCount"></app-stat-card>
        <app-stat-card color="amber" icon="calendar-outline" label="Follow-Ups (7 days)" [value]="followUpsCount"></app-stat-card>
      </div>

      <div class="chart-grid">
        <div class="clinic-card">
          <div class="section-heading">Most Booked Doctors</div>
          <div class="chart-card chart-card--bar">
            <div class="bar-row" *ngFor="let item of topDoctorStats">
              <div class="bar-row__label">{{ item.label }}</div>
              <div class="bar-row__track">
                <div class="bar-row__fill" [style.width.%]="item.max ? (item.value / item.max) * 100 : 0"></div>
              </div>
              <div class="bar-row__value">{{ item.value }}</div>
            </div>
          </div>
        </div>

        <div class="clinic-card">
          <div class="section-heading">Revenue This Month</div>
          <div class="chart-card chart-card--area">
            <svg viewBox="0 0 600 220" class="area-chart" aria-label="Revenue chart">
              <defs>
                <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" [attr.stop-color]="primaryColor" stop-opacity="0.42"></stop>
                  <stop offset="100%" [attr.stop-color]="primaryColor" stop-opacity="0.06"></stop>
                </linearGradient>
              </defs>
              <path [attr.d]="areaFillPath" fill="url(#revenueGradient)"></path>
              <path [attr.d]="areaLinePath" fill="none" [attr.stroke]="primaryColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
            <div class="area-chart__legend">
              <span *ngFor="let point of revenueLegend">{{ point }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="clinic-card">
        <div class="section-heading">Today's Appointments</div>
        <app-today-appointments-table
          [bookings]="todaysBookings"
          [doctors]="doctors"
          [patients]="patients"
          [services]="services"
          [isLoading]="isLoading"
          (rowClicked)="openBooking($event.id)"
          (action)="handleTableAction($event)"
        ></app-today-appointments-table>
      </div>
    </section>
  `,
  styleUrl: './dashboard.page.scss'
})
export class DashboardPage implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly mockData = inject(MockDataService);
  private readonly toastCtrl = inject(ToastController);
  private readonly router = inject(Router);

  bookings: any[] = [];
  doctors: any[] = [];
  patients: any[] = [];
  services: any[] = [];
  todaysBookings: any[] = [];
  isLoading = false;

  todayAppointmentsCount = 0;
  monthlyAppointmentsCount = 0;
  revenueToday = 0;
  pendingVerificationCount = 0;
  onHoldCount = 0;
  unpaidCompletedCount = 0;
  noShowCount = 0;
  followUpsCount = 0;
  topDoctorStats: Array<{ label: string; value: number; max: number }> = [];
  revenueLegend: string[] = [];
  primaryColor = '#5D3E8E';
  areaLinePath = '';
  areaFillPath = '';
  revenueData: number[] = [500, 800, 1200, 900, 1500, 1100, 1800];

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.isLoading = true;
    this.apiService.get<any>('/admin/dashboard/summary').subscribe({
      next: (data) => {
        this.isLoading = false;
        if (!data) return;

        this.todayAppointmentsCount = data.totalAppointmentsToday ?? 0;
        this.monthlyAppointmentsCount = (data.todaysAppointments ?? []).length;
        this.revenueToday = data.revenueThisMonth ?? 0;
        this.pendingVerificationCount = data.pendingAppointments ?? 0;
        this.onHoldCount = 0;
        this.unpaidCompletedCount = data.unpaidCount ?? 0;
        this.noShowCount = 0;
        this.followUpsCount = 0;

        if (data.revenueTrend?.length) {
          this.revenueData = data.revenueTrend.map((r: any) => r.amount);
          this.revenueLegend = data.revenueTrend.map((r: any) => r.label);
        }
        this.buildChartPaths();

        if (data.mostBookedDoctors?.length) {
          const max = Math.max(...data.mostBookedDoctors.map((d: any) => d.bookingCount), 1);
          this.topDoctorStats = data.mostBookedDoctors.map((d: any) => ({
            label: d.doctorName,
            value: d.bookingCount,
            max
          }));
        }

        if (data.todaysAppointments?.length) {
          const patientMap = new Map<string, string>();
          const doctorMap = new Map<string, string>();
          const serviceMap = new Map<string, string>();

          this.todaysBookings = data.todaysAppointments.map((a: any) => {
            if (a.patientName) patientMap.set(a.patientId, a.patientName);
            if (a.doctorName) doctorMap.set(a.doctorId, a.doctorName);
            if (a.serviceName) serviceMap.set(a.serviceId || 'svc-' + a.serviceName, a.serviceName);
            return {
              id: a.bookingId,
              patientId: a.patientId,
              doctorId: a.doctorId,
              serviceId: a.serviceId || ('svc-' + a.serviceName),
              patientName: a.patientName,
              doctorName: a.doctorName,
              serviceName: a.serviceName,
              serviceNames: a.serviceNames || [],
              appointmentDate: '',
              slotStartTime: a.slotStartTime || '',
              slotEndTime: a.slotEndTime || '',
              status: a.status,
              paymentStatus: a.paymentStatus,
              paymentMode: a.paymentMode || '',
              queueNumber: a.queueNumber,
              totalFee: a.totalFee ?? 0
            };
          });

          this.patients = Array.from(patientMap.entries()).map(([id, name]) => {
            const parts = name.split(' ');
            return { id, firstName: parts[0] || name, lastName: parts.slice(1).join(' ') || '' };
          });
          this.doctors = Array.from(doctorMap.entries()).map(([id, fn]) => ({ id, fullName: fn }));
          this.services = Array.from(serviceMap.entries()).map(([id, n]) => ({ id, name: n }));
        }
      },
      error: () => {
        this.isLoading = false;
        this.showToast('Could not load dashboard from server. Using local data.', 'warning');
        this.useMockFallback();
      }
    });
  }

  private useMockFallback(): void {
    const m = this.mockData;
    this.doctors = m.getDoctors();
    this.patients = m.getPatients();
    this.services = m.getServices();
    this.todaysBookings = [];
    this.todayAppointmentsCount = 0;
    this.monthlyAppointmentsCount = 0;
    this.revenueToday = 0;
    this.pendingVerificationCount = 0;
    this.onHoldCount = 0;
    this.unpaidCompletedCount = 0;
    this.noShowCount = 0;
    this.followUpsCount = 0;
    this.topDoctorStats = [];
    this.revenueData = [500, 800, 1200, 900, 1500, 1100, 1800];
    this.revenueLegend = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    this.buildChartPaths();
  }

  private async showToast(message: string, color: string): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 3000, color, position: 'top' });
    await t.present();
  }

  handleTableAction(event: { action: string; id: string }): void {
    if (event.action === 'view') {
      void this.openBooking(event.id);
    }
  }

  openBooking(id: string): void {
    if (!id) {
      return;
    }
    void this.router.navigate(['/admin/bookings', id]);
  }

  private buildChartPaths(): void {
    if (!this.revenueData.length) return;
    const points = this.revenueData.map((value, index) => {
      const x = (index / (this.revenueData.length - 1)) * 560 + 20;
      const y = 190 - ((value - 500) / 3000) * 150;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    this.areaLinePath = `M ${points.join(' L ')}`;
    this.areaFillPath = `${this.areaLinePath} L 580,200 L 20,200 Z`;
  }
}

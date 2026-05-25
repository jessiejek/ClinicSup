import { AsyncPipe, CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ClinicDashboardRealtimeService } from '../../../core/services/clinic-dashboard-realtime.service';
import { TodayAppointmentsTableComponent } from '../components/today-appointments-table/today-appointments-table.component';
import { StatCardComponent } from '../components/stat-card/stat-card.component';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [
    AsyncPipe, CurrencyPipe, DatePipe, NgFor, NgIf,
    StatCardComponent, TodayAppointmentsTableComponent,
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
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly realtime = inject(ClinicDashboardRealtimeService);
  private readonly destroyRef = inject(DestroyRef);

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
  revenueLegend: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  primaryColor = '#5D3E8E';
  areaLinePath = '';
  areaFillPath = '';
  revenueData: number[] = [500, 800, 1200, 900, 1500, 1100, 1800];

  ngOnInit(): void {
    this.loadDashboard();

    this.realtime.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        const name = event.eventName;
        if (
          name === 'BookingCreated' ||
          name === 'BookingCancelled' ||
          name === 'PatientCheckedIn' ||
          name === 'DoctorCompletedConsultation' ||
          name === 'PaymentCompleted' ||
          name === 'PaymentWaived'
        ) {
          this.loadDashboard();
        }
      });
  }

  private async loadDashboard(): Promise<void> {
    this.isLoading = true;
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + '-01';

    try {
      const [
        { data: staffToday },
        { data: monthBookings },
        { data: doctorsList },
        { data: patientsList },
        { data: servicesList },
      ] = await Promise.all([
        this.supabase.client.from('staff_today_queue_view').select('*'),
        this.supabase.client.from('patient_bookings_view').select('*').gte('appointment_date', monthStart).lte('appointment_date', today),
        this.supabase.client.from('doctors').select('id, full_name').eq('status', 'Active'),
        this.supabase.client.from('patients').select('id, first_name, last_name'),
        this.supabase.client.from('services').select('id, name').eq('is_active', true),
      ]);

      const todayRows = staffToday || [];
      const monthRows = monthBookings || [];

      this.doctors = (doctorsList || []).map((d: any) => ({ id: d.id, fullName: d.full_name }));
      this.patients = (patientsList || []).map((p: any) => ({ id: p.id, firstName: p.first_name, lastName: p.last_name }));
      this.services = (servicesList || []).map((s: any) => ({ id: s.id, name: s.name }));

      this.todayAppointmentsCount = todayRows.length;
      this.monthlyAppointmentsCount = monthRows.length;

      const todayStr = new Date().toISOString().slice(0, 10);
      this.todaysBookings = todayRows.map((r: any) => ({
        id: r.booking_id || r.id,
        patientId: r.patient_id,
        doctorId: r.doctor_id,
        serviceId: r.service_id,
        patientName: r.patient_name,
        doctorName: r.doctor_name,
        serviceName: r.service_name,
        serviceNames: r.service_names || [],
        appointmentDate: r.appointment_date || todayStr,
        slotStartTime: r.slot_start_time || '',
        slotEndTime: r.slot_end_time || '',
        status: r.booking_status || r.status,
        paymentStatus: r.payment_status || 'Unpaid',
        paymentMode: r.payment_mode || 'PayAtClinic',
        queueNumber: r.queue_number,
        totalFee: r.total_fee || 0,
      }));

      this.pendingVerificationCount = todayRows.filter((r: any) => r.booking_status === 'ProofSubmitted').length;
      this.onHoldCount = monthRows.filter((r: any) => r.booking_status === 'OnHold').length;
      this.unpaidCompletedCount = monthRows.filter((r: any) => r.booking_status === 'Completed' && r.payment_status === 'Unpaid').length;
      this.noShowCount = todayRows.filter((r: any) => r.booking_status === 'NoShow').length;

      // Revenue from today's completed bookings
      this.revenueToday = todayRows
        .filter((r: any) => r.booking_status === 'Completed')
        .reduce((sum: number, r: any) => sum + (r.total_fee || 0), 0);

      // Most booked doctors from monthly data
      const docCounts = new Map<string, { name: string; count: number }>();
      for (const r of monthRows) {
        const id = r.doctor_id;
        if (!id) continue;
        const entry = docCounts.get(id) || { name: r.doctor_name || 'Unknown', count: 0 };
        entry.count++;
        docCounts.set(id, entry);
      }
      const sortedDocs = [...docCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
      const maxCount = sortedDocs.length ? Math.max(...sortedDocs.map((d) => d.count), 1) : 1;
      this.topDoctorStats = sortedDocs.map((d) => ({ label: d.name, value: d.count, max: maxCount }));

    } catch {
      // Empty state on error — no mock fallback
      this.todaysBookings = [];
    }

    this.buildChartPaths();
    this.isLoading = false;
  }

  handleTableAction(event: { action: string; id: string }): void {
    if (event.action === 'view') {
      void this.openBooking(event.id);
    }
  }

  openBooking(id: string): void {
    if (!id) return;
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

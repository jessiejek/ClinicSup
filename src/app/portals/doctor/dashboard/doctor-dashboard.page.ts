import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonSpinner, ToastController } from '@ionic/angular/standalone';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { AvailabilityStatus, Booking, Doctor, DoctorDayStatus, DoctorSchedule } from '../../../core/models';
import { BookingService } from '../../../core/services/booking.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DoctorService } from '../services/doctor.service';

@Component({
  standalone: true,
  selector: 'app-doctor-dashboard-page',
  imports: [
    DatePipe, NgFor, NgIf, FormsModule, RouterLink,
    IonSpinner, PageHeaderComponent, EmptyStateComponent, StatusBadgeComponent
  ],
  template: `
    <div class="page-loading" *ngIf="isLoading">
      <ion-spinner name="crescent"></ion-spinner>
    </div>

    <ng-container *ngIf="!isLoading">
      <ng-container *ngIf="doctor; else errorState">
          <div class="dash">
          <div class="dh">
            <div>
              <h1 class="dt">{{ greeting }}, Dr. {{ doctor.fullName.split(' ')[0] || 'Doctor' }}</h1>
              <p class="ds">Here's your clinic overview for today.</p>
            </div>
            <span class="sp" [class.sa]="todayStatus === 'Available'" [class.sl]="todayStatus === 'RunningLate'" [class.su]="todayStatus === 'UnavailableToday'">
              {{ todayStatus === 'RunningLate' ? 'Running Late' : todayStatus === 'UnavailableToday' ? 'Unavailable Today' : 'Available' }}
            </span>
          </div>

          <div class="kpi">
            <div class="kc k1"><div class="ka"></div><div class="kb"><span class="kl">Booked Today</span><strong class="kv">{{ summary?.bookedToday ?? 0 }}</strong></div></div>
            <div class="kc k2"><div class="ka"></div><div class="kb"><span class="kl">Waiting</span><strong class="kv">{{ summary?.waiting ?? 0 }}</strong></div></div>
            <div class="kc k3"><div class="ka"></div><div class="kb"><span class="kl">Checked In</span><strong class="kv">{{ summary?.checkedIn ?? 0 }}</strong></div></div>
            <div class="kc k4"><div class="ka"></div><div class="kb"><span class="kl">Completed</span><strong class="kv">{{ summary?.completed ?? 0 }}</strong></div></div>
          </div>

          <div class="m">
            <div class="qs">
              <div class="sh">
                <h2>Today's Queue</h2>
                <span class="sc">{{ queueItems.length }} patient(s)</span>
              </div>

              <ng-container *ngIf="queueItems.length > 0; else noQueue">
                <div class="ql">
                  <div class="qi" *ngFor="let b of queueItems" (click)="openAppointment(b.id)">
                    <div class="qih">
                      <div class="qii">
                        <span class="qn">{{ b.patientName || 'Patient' }}</span>
                        <span class="qt">{{ b.slotStartTime ? (b.slotStartTime.substring(0,5)) : '--' }}</span>
                      </div>
                      <div class="qib">
                        <app-status-badge portal="doctor" [status]="b.status"></app-status-badge>
                        <span class="qp" *ngIf="b.queueNumber != null">#{{ b.queueNumber }}</span>
                      </div>
                    </div>
                    <div class="qs2">{{ b.serviceNames?.join(', ') || b.serviceName || 'Service' }}</div>
                  </div>
                </div>
              </ng-container>
              <ng-template #noQueue>
                <div class="qe">No appointments scheduled for today.</div>
              </ng-template>
            </div>

            <div class="ss">
              <div class="clinic-card">
                <div class="sh"><h2>Availability</h2></div>
                <div class="aa">
                  <button class="ab" [class.active]="todayStatus === 'Available'" (click)="updateStatus('Available')">Mark Available</button>
                  <div class="rr">
                    <input class="fi2" type="number" min="5" [(ngModel)]="runningLateMinutes" />
                    <button class="ab" [class.active]="todayStatus === 'RunningLate'" [disabled]="runningLateMinutes < 5" (click)="updateStatus('RunningLate')">Running Late</button>
                  </div>
                  <button class="ab" [class.active]="todayStatus === 'UnavailableToday'" (click)="updateStatus('UnavailableToday')">Unavailable Today</button>
                </div>
              </div>

              <div class="clinic-card">
                <div class="sh"><h2>Working Schedule</h2></div>
                <div class="sl2" *ngIf="schedule.length > 0">
                  <div class="sr2" *ngFor="let s of schedule">
                    <span class="sd">{{ s.dayOfWeek.substring(0,3) }}</span>
                    <span class="st2">{{ (s.startTime).substring(0,5) }} - {{ (s.endTime).substring(0,5) }}</span>
                  </div>
                </div>
                <div class="se2" *ngIf="schedule.length === 0">No schedule configured.</div>
                <a class="cl" routerLink="/doctor/schedule">Manage Schedule &rarr;</a>
              </div>

              <div class="clinic-card">
                <div class="sh"><h2>Profile</h2></div>
                <div class="pi">
                  <div class="pr"><span class="pl2">Specialization</span><span>{{ doctor.specialization || '--' }}</span></div>
                  <div class="pr"><span class="pl2">Fee</span><span>PHP {{ doctor.consultationFee }}</span></div>
                  <div class="pr"><span class="pl2">Status</span><app-status-badge [status]="doctor.status"></app-status-badge></div>
                </div>
                <a class="cl" routerLink="/doctor/profile">Edit Profile &rarr;</a>
              </div>
            </div>
          </div>
        </div>
      </ng-container>
    </ng-container>

    <ng-template #errorState>
      <app-empty-state icon="medical-outline" title="Unable to load dashboard" description="We could not load your doctor profile." ctaLabel="Retry" (ctaClick)="loadDashboard()"></app-empty-state>
    </ng-template>
  `,
  styleUrl: './doctor-dashboard.page.scss'
})
export class DoctorDashboardPage implements OnInit {
  private readonly doctorService = inject(DoctorService);
  private readonly bookingService = inject(BookingService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  isLoading = true;
  doctor: Doctor | null = null;
  summary: { bookedToday: number; waiting: number; checkedIn: number; completed: number } | null = null;
  queueItems: Booking[] = [];
  schedule: DoctorSchedule[] = [];
  todayStatus: AvailabilityStatus = 'Available';
  greeting = '';
  runningLateMinutes = 15;

  ngOnInit(): void {
    this.setGreeting();
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.doctorService.getMyProfile().pipe(
      switchMap((doc) => {
        if (!doc) return of(null);
        this.doctor = doc;
        return forkJoin({
          summary: this.bookingService.getDoctorTodaySummary().pipe(catchError(() => of(null))),
          schedule: this.doctorService.getDoctorSchedules(doc.id).pipe(catchError(() => of([] as DoctorSchedule[]))),
          dayStatus: this.doctorService.getDayStatus(doc.id).pipe(catchError(() => of(null as DoctorDayStatus | null)))
        });
      }),
      catchError(() => of(null)),
      finalize(() => (this.isLoading = false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((result) => {
      if (!result || !this.doctor) return;
      this.summary = result.summary ? { bookedToday: result.summary.bookedToday, waiting: result.summary.waiting, checkedIn: result.summary.checkedIn, completed: result.summary.completed } : null;
      this.queueItems = (result.summary?.items ?? []).sort((a, b) => (a.queueNumber ?? 999) - (b.queueNumber ?? 999));
      this.schedule = result.schedule;
      this.todayStatus = result.dayStatus?.status ?? 'Available';
    });
  }

  updateStatus(status: AvailabilityStatus): void {
    if (!this.doctor) return;
    this.doctorService.setDayStatus(this.doctor.id, {
      date: this.todayStr(),
      status,
      runningLateMinutes: status === 'RunningLate' ? this.runningLateMinutes : null
    }).pipe(catchError(() => { this.showToast('Failed to update status.', 'danger'); return of(null); }))
      .subscribe((res) => {
        if (!res) return;
        this.todayStatus = res.status as AvailabilityStatus;
        this.showToast(`Status: ${this.label(status)}`, 'success');
      });
  }

  openAppointment(id: string): void {
    this.router.navigate(['/doctor/appointments', id]);
  }

  private setGreeting(): void {
    const h = new Date().getHours();
    this.greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }

  private label(s: AvailabilityStatus): string {
    return s === 'RunningLate' ? 'Running Late' : s === 'UnavailableToday' ? 'Unavailable Today' : 'Available';
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private async showToast(msg: string, color: string = 'success'): Promise<void> {
    const t = await this.toastCtrl.create({ message: msg, duration: 1800, color, position: 'top' });
    await t.present();
  }
}

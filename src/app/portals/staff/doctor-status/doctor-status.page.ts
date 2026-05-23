import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastController } from '@ionic/angular/standalone';
import { AvailabilityStatus, Doctor, DoctorDayStatus } from '../../../core/models';
import { DoctorStateService } from '../../../core/services/doctor-state.service';
import { DoctorStatusCardComponent } from '../components/doctor-status-card/doctor-status-card.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-staff-doctor-status-page',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    DoctorStatusCardComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    SkeletonComponent
  ],
  template: `
    <div class="ps">
      <app-page-header
        title="Doctor Availability"
        subtitle="Set running late or unavailable status for today"
      ></app-page-header>

      <div class="sg" *ngIf="!isLoading && doctors.length > 0">
        <article class="sc sa1">
          <div class="sa"></div>
          <div class="sb"><span class="l">Available</span><strong class="v">{{ availableCount }}</strong></div>
        </article>
        <article class="sc sa2">
          <div class="sa"></div>
          <div class="sb"><span class="l">Running Late</span><strong class="v">{{ runningLateCount }}</strong></div>
        </article>
        <article class="sc sa3">
          <div class="sa"></div>
          <div class="sb"><span class="l">Unavailable</span><strong class="v">{{ unavailableCount }}</strong></div>
        </article>
      </div>

      <div class="dg" *ngIf="!isLoading && doctors.length > 0">
        <app-doctor-status-card
          *ngFor="let doctor of doctors"
          [doctor]="doctor"
          [dayStatus]="getDayStatus(doctor.id)"
          (statusChanged)="onStatusChanged($event)"
        ></app-doctor-status-card>
      </div>

      <app-skeleton *ngIf="isLoading" variant="card" [count]="3"></app-skeleton>

      <div *ngIf="error" class="er">
        <p>Unable to load doctors. Please try again.</p>
        <button type="button" class="btn-primary" (click)="loadDoctors()">Retry</button>
      </div>

      <app-empty-state
        *ngIf="!isLoading && !error && doctors.length === 0"
        icon="medical-outline"
        title="No doctors found"
        description="Load doctor records to manage availability."
      ></app-empty-state>
    </div>
  `,
  styleUrl: './doctor-status.page.scss'
})
export class DoctorStatusPage implements OnInit {
  private readonly doctorState = inject(DoctorStateService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  doctors: Doctor[] = [];
  isLoading = false;
  error = false;
  private dayStatuses: Record<string, DoctorDayStatus> = {};

  ngOnInit(): void {
    this.loadDoctors();
  }

  loadDoctors(): void {
    this.error = false;
    this.isLoading = true;
    this.doctorState.loadDoctorsFromSupabase();
    this.doctorState.doctors$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((doctors) => {
        this.doctors = doctors.filter((d) => d.status === 'Active');
        this.isLoading = false;
      });
    this.doctorState.isLoading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((loading) => (this.isLoading = loading));
    this.doctorState.dayStatuses$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((statuses) => (this.dayStatuses = statuses));
  }

  get availableCount(): number {
    return this.countByStatus('Available');
  }

  get runningLateCount(): number {
    return this.countByStatus('RunningLate');
  }

  get unavailableCount(): number {
    return this.countByStatus('UnavailableToday');
  }

  getDayStatus(doctorId: string): DoctorDayStatus | null {
    return this.dayStatuses[doctorId] ?? null;
  }

  onStatusChanged(event: {
    doctorId: string;
    status: AvailabilityStatus;
    runningLateMinutes?: number;
  }): void {
    this.doctorState.updateDayStatusViaApi(event.doctorId, event.status, event.runningLateMinutes).subscribe({
      next: () => {
        const doctor = this.doctors.find((item) => item.id === event.doctorId);
        void this.presentToast(
          `${doctor?.fullName ?? 'Doctor'} status updated to ${this.labelForStatus(event.status)}`,
          'success'
        );
      },
      error: () => {
        void this.presentToast('Failed to update doctor status.', 'danger');
      }
    });
  }

  private async presentToast(message: string, color: string = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2200,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private countByStatus(status: AvailabilityStatus): number {
    return this.doctors.filter(
      (doctor) => (this.dayStatuses[doctor.id]?.status ?? 'Available') === status
    ).length;
  }

  private labelForStatus(status: AvailabilityStatus): string {
    switch (status) {
      case 'RunningLate':
        return 'Running Late';
      case 'UnavailableToday':
        return 'Unavailable Today';
      default:
        return 'Available';
    }
  }
}

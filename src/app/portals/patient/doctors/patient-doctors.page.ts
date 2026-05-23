import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Doctor } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { DoctorCardComponent } from '../../public/components/doctor-card/doctor-card.component';
import { PublicService } from '../../public/services/public.service';
import { formatDoctorScheduleLines } from '../../public/utils/time-format';

@Component({
  selector: 'app-patient-doctors-page',
  standalone: true,
  imports: [NgFor, NgIf, DoctorCardComponent, EmptyStateComponent, SkeletonComponent],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Doctors</h2>
          <p class="page-subtitle">Browse active doctors and choose who to book with.</p>
        </div>
      </div>

      <div class="page-loading" *ngIf="isLoading">
        <app-skeleton variant="card" [count]="3"></app-skeleton>
      </div>

      <ng-container *ngIf="!isLoading">
        <div class="clinic-card" *ngIf="doctors.length > 0; else emptyState">
          <div class="doctors-grid">
            <div class="doctor-tile" *ngFor="let doctor of doctors">
              <app-doctor-card [doctor]="doctor"></app-doctor-card>

              <div class="doctor-tile__schedule" *ngIf="doctorScheduleSummary(doctor) as schedule">
                <span>Working Schedule</span>
                <strong>{{ schedule }}</strong>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #emptyState>
        <app-empty-state
          icon="medical-outline"
          [title]="emptyTitle"
          [description]="emptyDescription"
          [ctaLabel]="loadError ? 'Retry' : undefined"
          (ctaClick)="retry()"
        ></app-empty-state>
      </ng-template>
    </section>
  `,
  styleUrl: './patient-doctors.page.scss'
})
export class PatientDoctorsPage implements OnInit {
  private readonly publicService = inject(PublicService);
  private readonly destroyRef = inject(DestroyRef);

  doctors: Doctor[] = [];
  isLoading = true;
  loadError = '';
  private hasLoadedOnce = false;

  ngOnInit(): void {
    this.loadDoctors();
  }

  ionViewWillEnter(): void {
    if (this.hasLoadedOnce) {
      this.loadDoctors();
      return;
    }

    this.hasLoadedOnce = true;
  }

  get emptyTitle(): string {
    return this.loadError ? 'Unable to load doctors' : 'No active doctors available';
  }

  get emptyDescription(): string {
    return this.loadError || 'There are no active doctors available right now.';
  }

  retry(): void {
    this.loadDoctors();
  }

  doctorScheduleSummary(doctor: Doctor): string | null {
    if (doctor.workingDays?.length) {
      return doctor.workingDays.join(', ');
    }

    if (doctor.schedule?.length) {
      return formatDoctorScheduleLines(doctor.schedule).join(' • ');
    }

    return null;
  }

  private loadDoctors(): void {
    this.isLoading = true;
    this.loadError = '';

    this.publicService
      .refreshDoctors()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (doctors) => {
          this.doctors = doctors
            .filter((doctor) => isVisibleDoctor(doctor))
            .sort((a, b) => a.fullName.localeCompare(b.fullName));
        },
        error: (error: unknown) => {
          this.doctors = [];
          this.loadError = extractApiErrorMessage(error, 'We could not load doctors right now.');
        }
      });
  }
}

function isVisibleDoctor(doctor: Doctor): boolean {
  if (doctor.isActive === false) {
    return false;
  }

  return !['Inactive', 'OnLeave'].includes(doctor.status);
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const body = (error as { error?: unknown }).error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

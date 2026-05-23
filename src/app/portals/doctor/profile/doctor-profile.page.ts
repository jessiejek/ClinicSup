import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastController, IonSpinner } from '@ionic/angular/standalone';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';
import { Doctor } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DoctorService } from '../services/doctor.service';

interface SummaryItem {
  label: string;
  value: string;
}

@Component({
  standalone: true,
  selector: 'app-doctor-profile-page',
  imports: [
    NgFor,
    NgIf,
    ReactiveFormsModule,
    IonSpinner,
    PageHeaderComponent,
    EmptyStateComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="page-loading" *ngIf="isLoading" aria-live="polite" aria-busy="true">
      <ion-spinner name="crescent"></ion-spinner>
      <p>Loading your profile...</p>
    </div>

    <ng-container *ngIf="!isLoading">
      <ng-container *ngIf="doctor; else unavailableState">
        <app-page-header title="My Profile" subtitle="Manage your professional details"></app-page-header>

        <section class="profile-grid">
          <form class="clinic-card profile-form" [formGroup]="profileForm" (ngSubmit)="save()">
            <p class="section-label">Edit Profile</p>
            <h3>Professional Profile</h3>
            <p class="form-hint">Keep the details below in sync with your doctor record.</p>

            <label class="profile-field">
              <span>Full Name</span>
              <input class="profile-input" type="text" formControlName="fullName" />
            </label>

            <label class="profile-field">
              <span>Specialization</span>
              <input class="profile-input" type="text" formControlName="specialization" />
            </label>

            <label class="profile-field">
              <span>Bio</span>
              <textarea class="profile-textarea" rows="4" formControlName="bio"></textarea>
            </label>

            <div class="grid-2">
              <label class="profile-field">
                <span>Consultation Fee</span>
                <input class="profile-input" type="number" min="0" formControlName="consultationFee" />
              </label>

              <label class="profile-field">
                <span>License Number</span>
                <input class="profile-input" type="text" formControlName="licenseNumber" />
              </label>

              <label class="profile-field">
                <span>PTR Number</span>
                <input class="profile-input" type="text" formControlName="ptrNumber" />
              </label>

              <label class="profile-field">
                <span>S2 Number</span>
                <input class="profile-input" type="text" formControlName="s2Number" />
              </label>
            </div>

            <div class="actions">
              <button type="submit" class="btn-primary" [disabled]="profileForm.invalid || isSaving">
                {{ isSaving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>

          <aside class="profile-summary">
            <article class="clinic-card preview-card">
              <p class="section-label">Profile Summary</p>

              <div class="profile-summary__header">
                <div>
                  <h3>{{ doctor.fullName }}</h3>
                  <p class="summary-subtitle">{{ doctor.specialization || 'Specialization not set' }}</p>
                </div>
                <app-status-badge [status]="doctor.status"></app-status-badge>
              </div>

              <p class="bio">{{ doctor.bio || 'No bio provided.' }}</p>

              <div class="summary-items">
                <div class="summary-item" *ngFor="let item of summaryItems">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </article>
          </aside>
        </section>
      </ng-container>
    </ng-container>

    <ng-template #unavailableState>
      <app-empty-state
        icon="person-outline"
        title="Profile unavailable"
        [description]="loadError ?? 'The doctor profile could not be loaded.'"
        ctaLabel="Retry"
        (ctaClick)="reload()"
      ></app-empty-state>
    </ng-template>
  `,
  styleUrl: './doctor-profile.page.scss'
})
export class DoctorProfilePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly doctorService = inject(DoctorService);
  private readonly toastController = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  isLoading = true;
  isSaving = false;
  loadError: string | null = null;
  doctor: Doctor | null = null;

  profileForm = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    specialization: ['', Validators.required],
    bio: [''],
    consultationFee: [0, [Validators.required, Validators.min(0)]],
    licenseNumber: [''],
    ptrNumber: [''],
    s2Number: ['']
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  get summaryItems(): SummaryItem[] {
    if (!this.doctor) {
      return [];
    }

    return [
      { label: 'Consultation Fee', value: `PHP ${this.doctor.consultationFee.toLocaleString('en-PH')}` },
      { label: 'License Number', value: this.doctor.licenseNumber || 'N/A' },
      { label: 'PTR Number', value: this.doctor.ptrNumber || 'N/A' },
      { label: 'S2 Number', value: this.doctor.s2Number || 'N/A' },
      { label: 'Slot Duration', value: `${this.doctor.slotDurationMinutes} minutes` },
      {
        label: 'Slot Capacity',
        value: `${this.doctor.slotCapacity} ${this.doctor.slotCapacity === 1 ? 'slot' : 'slots'}`
      },
      {
        label: 'Daily Patient Limit',
        value:
          this.doctor.dailyPatientLimit === null
            ? 'No limit'
            : `${this.doctor.dailyPatientLimit} ${
                this.doctor.dailyPatientLimit === 1 ? 'patient' : 'patients'
              }`
      }
    ];
  }

  reload(): void {
    this.loadProfile();
  }

  save(): void {
    if (!this.doctor) {
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const values = this.profileForm.getRawValue();
    if (this.doctor.slotDurationMinutes <= 0 || this.doctor.slotCapacity <= 0) {
      void this.presentToast('Slot duration and slot capacity must be greater than zero.');
      return;
    }

    const payload = {
      fullName: values.fullName.trim(),
      specialization: values.specialization.trim(),
      bio: values.bio.trim() || this.doctor.bio || '',
      licenseNumber: values.licenseNumber.trim() || this.doctor.licenseNumber || '',
      ptrNumber: values.ptrNumber.trim() || this.doctor.ptrNumber || '',
      s2Number: values.s2Number.trim() || this.doctor.s2Number || '',
      consultationFee: values.consultationFee,
      slotDurationMinutes: this.doctor.slotDurationMinutes,
      slotCapacity: this.doctor.slotCapacity,
      dailyPatientLimit: this.doctor.dailyPatientLimit ?? null,
      status: this.doctor.status
    };

    this.isSaving = true;

    this.doctorService
      .updateMyProfile(payload)
      .pipe(
        catchError((error: unknown) => {
          void this.presentToast(extractApiErrorMessage(error, 'Failed to update profile.'));
          return of(null);
        }),
        finalize(() => {
          this.isSaving = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((updated) => {
        if (!updated) {
          return;
        }

        this.doctor = { ...this.doctor, ...updated };
        this.patchForm(this.doctor);
        void this.presentToast('Profile updated successfully.', 'success');
      });
  }

  private loadProfile(): void {
    this.isLoading = true;
    this.loadError = null;
    this.doctor = null;

    this.doctorService
      .getMyProfile()
      .pipe(
        catchError((error: unknown) => {
          this.loadError = extractApiErrorMessage(error, 'The doctor profile could not be loaded.');
          void this.presentToast(this.loadError);
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((doctor) => {
        if (!doctor) {
          return;
        }

        this.doctor = { ...doctor };
        this.patchForm(this.doctor);
      });
  }

  private patchForm(doctor: Doctor): void {
    this.profileForm.patchValue({
      fullName: doctor.fullName,
      specialization: doctor.specialization,
      bio: doctor.bio ?? '',
      consultationFee: doctor.consultationFee,
      licenseNumber: doctor.licenseNumber ?? '',
      ptrNumber: doctor.ptrNumber ?? '',
      s2Number: doctor.s2Number ?? ''
    });
  }

  private async presentToast(message: string, color: 'danger' | 'success' = 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const body = (error as { error?: unknown }).error;
    const message = extractFirstMessage(body);
    if (message) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function extractFirstMessage(body: unknown): string | null {
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const record = body as Record<string, unknown>;
  for (const key of ['message', 'detail', 'error', 'title']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const errors = record['errors'];
  if (Array.isArray(errors)) {
    for (const entry of errors) {
      const nested = extractFirstMessage(entry);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

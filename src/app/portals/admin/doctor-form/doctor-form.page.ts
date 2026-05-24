import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonSpinner, ToastController } from '@ionic/angular/standalone';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Doctor, DoctorSchedule, DayOfWeek } from '../../../core/models';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import {
  DoctorScheduleDraft,
  DoctorScheduleFormComponent
} from '../components/doctor-schedule-form/doctor-schedule-form.component';
import {
  AdminDoctorsService,
  CreateDoctorInviteDto,
  CreateDoctorDto,
  DoctorSummary,
  UpsertSchedulesDto
} from '../services/admin-doctors.service';
import { AdminServicesService, ManagedService } from '../services/admin-services.service';

const DAY_NAMES: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

@Component({
  selector: 'app-admin-doctor-form-page',
  standalone: true,
  imports: [NgFor, NgIf, ReactiveFormsModule, IonSpinner, AvatarComponent, EmptyStateComponent, DoctorScheduleFormComponent],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <button type="button" class="btn-ghost" (click)="cancel()">Back to Doctors</button>
          <h2 class="page-title">{{ isEditMode ? 'Edit Doctor' : 'Add Doctor' }}</h2>
          <p class="page-subtitle">Update profile, schedule, and consultation settings.</p>
        </div>
      </div>

      <div class="page-loading" *ngIf="isLoading">
        <ion-spinner name="crescent"></ion-spinner>
      </div>

      <ng-container *ngIf="!isLoading">
        <ng-container *ngIf="!doctorNotFound; else notFoundState">
          <form class="doctor-form clinic-card" [formGroup]="form" (ngSubmit)="submit()">
            <div class="doctor-form__hero">
              <app-avatar [name]="form.value.fullName || 'Doctor'" size="xl"></app-avatar>
              <div>
                <label class="file-input">
                  <input type="file" accept="image/*" />
                  <span>Choose profile photo</span>
                </label>
                <p class="page-subtitle">Photo upload is mock only for this phase.</p>
              </div>
            </div>

            <div class="form-grid">
              <label class="form-field">
                <span class="form-field__label">Full Name</span>
                <input class="filter-input" formControlName="fullName" placeholder="Full Name" />
              </label>
              <label class="form-field" *ngIf="!isEditMode">
                <span class="form-field__label">Doctor Email</span>
                <input
                  class="filter-input"
                  type="email"
                  formControlName="doctorEmail"
                  placeholder="Doctor email for social login invite"
                  autocomplete="email"
                />
                <div class="form-error-message" *ngIf="form.get('doctorEmail')?.touched && form.get('doctorEmail')?.invalid">
                  <span *ngIf="form.get('doctorEmail')?.hasError('required')">Doctor email is required.</span>
                  <span *ngIf="form.get('doctorEmail')?.hasError('email')">Enter a valid doctor email.</span>
                </div>
                <p class="form-field__hint" *ngIf="!isEditMode">
                  The doctor will use this email to sign in with Google or Facebook.
                  No password needed.
                </p>
              </label>
              <label class="form-field">
                <span class="form-field__label">Specialty</span>
                <input class="filter-input" formControlName="specialization" placeholder="Specialization" />
              </label>
              <label class="form-field">
                <span class="form-field__label">PRC Number</span>
                <input class="filter-input" formControlName="licenseNumber" placeholder="License Number" />
              </label>
              <label class="form-field">
                <span class="form-field__label">PTR Number</span>
                <input class="filter-input" formControlName="ptrNumber" placeholder="PTR Number" />
              </label>
              <label class="form-field">
                <span class="form-field__label">S2 Number</span>
                <input class="filter-input" formControlName="s2Number" placeholder="S2 Number" />
              </label>
              <label class="form-field">
                <span class="form-field__label">Consultation Fee</span>
                <input class="filter-input" type="number" formControlName="consultationFee" placeholder="Consultation Fee" />
              </label>
              <label class="form-field">
                <span class="form-field__label">Status</span>
                <select class="filter-input" formControlName="status">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="OnLeave">On Leave</option>
                </select>
              </label>
              <label class="form-field">
                <span class="form-field__label">Slot Duration</span>
                <input class="filter-input" type="number" formControlName="slotDurationMinutes" placeholder="Slot Duration" />
              </label>
              <label class="form-field">
                <span class="form-field__label">Slot Capacity</span>
                <input class="filter-input" type="number" formControlName="slotCapacity" placeholder="Slot Capacity" />
              </label>
              <label class="form-field">
                <span class="form-field__label">Daily Patient Limit</span>
                <input class="filter-input" type="number" formControlName="dailyPatientLimit" placeholder="Daily Patient Limit" />
              </label>
            </div>

            <textarea class="textarea" formControlName="bio" placeholder="Doctor bio"></textarea>

                        <!-- Services (create mode only) -->
            <ng-container *ngIf="!isEditMode">
              <div class="section-heading">Services</div>
              <div class="doctor-form__services">
                <p class="form-field__hint">Select the services this doctor will offer.</p>
                <div class="services-list">
                  <label
                    *ngFor="let service of availableServices"
                    class="service-checkbox"
                    [class.service-checkbox--selected]="selectedServiceIds.has(service.id)"
                  >
                    <input
                      type="checkbox"
                      [checked]="selectedServiceIds.has(service.id)"
                      (change)="toggleService(service.id)"
                    />
                    <div class="service-checkbox__content">
                      <span class="service-checkbox__name">{{ service.name }}</span>
                      <span class="service-checkbox__desc">{{ service.description || service.category }}</span>
                      <span class="service-checkbox__fee">\u20B1{{ service.price }}</span>
                    </div>
                  </label>
                </div>
                <p *ngIf="availableServices.length === 0" class="form-field__hint">No active services. Create services first in the Services page.</p>
              </div>
            </ng-container>

            <div class="section-heading">Working Days</div>
            <app-doctor-schedule-form [(value)]="scheduleDraft"></app-doctor-schedule-form>

            <div class="form-actions">
              <button type="button" class="btn-ghost" (click)="cancel()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="form.invalid || isSaving">
                {{ isSaving ? 'Saving...' : 'Save Doctor' }}
              </button>
            </div>
          </form>
        </ng-container>
      </ng-container>

      <ng-template #notFoundState>
        <app-empty-state
          icon="medical-outline"
          title="Doctor not found"
          description="The requested doctor profile could not be loaded."
        ></app-empty-state>
      </ng-template>
    </section>
  `,
  styleUrl: './doctor-form.page.scss'
})
export class DoctorFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminDoctorsService = inject(AdminDoctorsService);
  private readonly adminServicesService = inject(AdminServicesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  isEditMode = false;
  isLoading = false;
  isSaving = false;
  doctorNotFound = false;
  doctorId: string | null = null;
  currentDoctor: DoctorSummary | null = null;
  scheduleDraft: DoctorScheduleDraft[] = this.defaultScheduleDraft();
  availableServices: ManagedService[] = [];
  selectedServiceIds: Set<string> = new Set();

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    doctorEmail: ['', [Validators.required, Validators.email]],
    specialization: ['', Validators.required],
    bio: [''],
    licenseNumber: [''],
    ptrNumber: [''],
    s2Number: [''],
    consultationFee: [0, [Validators.required, Validators.min(0)]],
    status: ['Active'],
    slotDurationMinutes: [30],
    slotCapacity: [1],
    dailyPatientLimit: [null as number | null]
  });

  ngOnInit(): void {
    this.doctorId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.doctorId;

    if (this.isEditMode) {
      this.form.controls.doctorEmail.clearValidators();
      this.form.controls.doctorEmail.updateValueAndValidity({ emitEvent: false });
    } else {
      this.form.controls.doctorEmail.setValidators([Validators.required, Validators.email]);
      this.form.controls.doctorEmail.updateValueAndValidity({ emitEvent: false });
    }

    if (!this.doctorId) {
      this.scheduleDraft = this.defaultScheduleDraft();
      return;
    }

    this.isLoading = true;
    forkJoin({
      doctors: this.adminDoctorsService.getAllDoctors().pipe(
        catchError((error: unknown) => {
          void this.presentToast(extractApiErrorMessage(error, 'Failed to load doctors.'));
          return of([] as DoctorSummary[]);
        })
      ),
      schedules: this.adminDoctorsService.getSchedule(this.doctorId).pipe(
        catchError((error: unknown) => {
          void this.presentToast(extractApiErrorMessage(error, 'Failed to load doctor schedule.'));
          return of([] as DoctorSchedule[]);
        })
      )
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ doctors, schedules }) => {
        const doctor = doctors.find((item) => item.id === this.doctorId);
        if (!doctor) {
          this.doctorNotFound = true;
          return;
        }

        this.currentDoctor = doctor;
        this.scheduleDraft = schedules.length ? this.buildScheduleDrafts(schedules) : this.defaultScheduleDraft();
        this.form.patchValue({
          fullName: doctor.fullName,
          doctorEmail: '',
          specialization: doctor.specialization,
          bio: doctor.bio ?? '',
          licenseNumber: doctor.licenseNumber ?? '',
          ptrNumber: doctor.ptrNumber ?? '',
          s2Number: doctor.s2Number ?? '',
          consultationFee: doctor.consultationFee,
          status: doctor.status,
          slotDurationMinutes: doctor.slotDurationMinutes,
          slotCapacity: doctor.slotCapacity,
          dailyPatientLimit: doctor.dailyPatientLimit
        });
      });
  }

  submit(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const value = this.form.getRawValue();

    const schedulesPayload: UpsertSchedulesDto = {
      schedules: this.scheduleDraft
        .filter((row) => row.enabled)
        .map((row) => ({
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime
        }))
    };

    if (this.isEditMode && this.doctorId) {
      // Edit mode: update existing doctor + schedule
      const updatePayload: Partial<Doctor> = {
        fullName: value.fullName ?? '',
        specialization: value.specialization ?? '',
        bio: value.bio ?? '',
        licenseNumber: value.licenseNumber ?? '',
        ptrNumber: value.ptrNumber ?? '',
        s2Number: value.s2Number ?? '',
        consultationFee: Number(value.consultationFee ?? 0),
        status: (value.status as Doctor['status']) ?? 'Active',
        slotDurationMinutes: Number(value.slotDurationMinutes ?? 30),
        slotCapacity: Number(value.slotCapacity ?? 1),
        dailyPatientLimit: value.dailyPatientLimit ?? null
      };

      this.adminDoctorsService.updateDoctor(this.doctorId, updatePayload)
        .pipe(
          switchMap((savedDoctor) =>
            this.adminDoctorsService.updateSchedule(savedDoctor.id, schedulesPayload).pipe(map(() => savedDoctor))
          ),
          finalize(() => {
            this.isSaving = false;
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: async () => {
            await this.presentToast('Doctor updated successfully.', 'success');
            void this.router.navigate(['/admin/doctors']);
          },
          error: (error: unknown) => {
            void this.presentToast(extractApiErrorMessage(error, 'Failed to update doctor.'));
          }
        });
    } else {
      // Create mode: create a doctor invite (no password needed)
      const invitePayload: CreateDoctorInviteDto = {
        fullName: value.fullName ?? '',
        email: String(value.doctorEmail ?? '').trim(),
        specialization: value.specialization ?? '',
        bio: value.bio ?? '',
        licenseNumber: value.licenseNumber ?? '',
        ptrNumber: value.ptrNumber ?? '',
        s2Number: value.s2Number ?? '',
        consultationFee: Number(value.consultationFee ?? 0),
        slotDurationMinutes: Number(value.slotDurationMinutes ?? 30),
        slotCapacity: Number(value.slotCapacity ?? 1),
        dailyPatientLimit: value.dailyPatientLimit ?? null,
        schedule: this.scheduleDraft
          .filter((row) => row.enabled)
          .map((row) => ({
            dayOfWeek: row.dayOfWeek,
            startTime: row.startTime,
            endTime: row.endTime
          })),
        serviceIds: Array.from(this.selectedServiceIds)
      };

      this.adminDoctorsService.createDoctorInvite(invitePayload)
        .pipe(
          finalize(() => {
            this.isSaving = false;
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: async () => {
            const toast = await this.toastController.create({
              message: 'Doctor invite created. The doctor must sign in with Google or Facebook using this email to activate the account.',
              duration: 5000,
              color: 'success',
              position: 'top'
            });
            await toast.present();
            void this.router.navigate(['/admin/doctors']);
          },
          error: (error: unknown) => {
            void this.presentToast(extractApiErrorMessage(error, 'Failed to create doctor invite.'));
          }
        });
    }
  }

  toggleService(serviceId: string): void {
    if (this.selectedServiceIds.has(serviceId)) {
      this.selectedServiceIds.delete(serviceId);
    } else {
      this.selectedServiceIds.add(serviceId);
    }
  }

    cancel(): void {
    void this.router.navigate(['/admin/doctors']);
  }

  private buildScheduleDrafts(schedules: DoctorSchedule[]): DoctorScheduleDraft[] {
    return DAY_NAMES.map((dayOfWeek) => {
      const schedule = schedules.find((item) => item.dayOfWeek === dayOfWeek);
      return {
        dayOfWeek,
        enabled: !!schedule,
        startTime: schedule?.startTime ?? '08:00',
        endTime: schedule?.endTime ?? '17:00'
      };
    });
  }

  private defaultScheduleDraft(): DoctorScheduleDraft[] {
    return [
      { dayOfWeek: 'Monday', enabled: true, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 'Tuesday', enabled: true, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 'Wednesday', enabled: true, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 'Thursday', enabled: true, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 'Friday', enabled: true, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 'Saturday', enabled: false, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: 'Sunday', enabled: false, startTime: '08:00', endTime: '12:00' }
    ];
  }

  private async presentToast(message: string, color: 'success' | 'danger' = 'danger'): Promise<void> {
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
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
    if (typeof body === 'object' && body !== null && 'errors' in body) {
      const errors = (body as { errors?: Record<string, unknown> }).errors;
      if (errors) {
        for (const value of Object.values(errors)) {
          const values = Array.isArray(value) ? value : [value];
          const firstMessage = values.find((item) => typeof item === 'string' && item.trim().length > 0);
          if (typeof firstMessage === 'string') {
            return firstMessage;
          }
        }
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

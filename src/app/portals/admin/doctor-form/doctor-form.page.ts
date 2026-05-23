import { NgIf } from '@angular/common';
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
  CreateDoctorDto,
  DoctorSummary,
  UpsertSchedulesDto
} from '../services/admin-doctors.service';

const DAY_NAMES: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

@Component({
  selector: 'app-admin-doctor-form-page',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, IonSpinner, AvatarComponent, EmptyStateComponent, DoctorScheduleFormComponent],
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
                  placeholder="Doctor Email"
                  autocomplete="email"
                />
                <div class="form-error-message" *ngIf="form.get('doctorEmail')?.touched && form.get('doctorEmail')?.invalid">
                  <span *ngIf="form.get('doctorEmail')?.hasError('required')">Doctor email is required.</span>
                  <span *ngIf="form.get('doctorEmail')?.hasError('email')">Enter a valid doctor email.</span>
                </div>
              </label>
              <label class="form-field" *ngIf="!isEditMode">
                <span class="form-field__label">Temporary Password</span>
                <input
                  class="filter-input"
                  type="password"
                  formControlName="tempPassword"
                  placeholder="Temporary Password"
                  autocomplete="new-password"
                />
                <div class="form-error-message" *ngIf="form.get('tempPassword')?.touched && form.get('tempPassword')?.invalid">
                  <span *ngIf="form.get('tempPassword')?.hasError('required')">Temporary password is required.</span>
                  <span *ngIf="form.get('tempPassword')?.hasError('minlength')">Temporary password must be at least 8 characters.</span>
                </div>
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

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    doctorEmail: ['', [Validators.required, Validators.email]],
    tempPassword: ['', [Validators.required, Validators.minLength(8)]],
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
      this.form.controls.tempPassword.clearValidators();
      this.form.controls.tempPassword.updateValueAndValidity({ emitEvent: false });
    } else {
      this.form.controls.doctorEmail.setValidators([Validators.required, Validators.email]);
      this.form.controls.doctorEmail.updateValueAndValidity({ emitEvent: false });
      this.form.controls.tempPassword.setValidators([Validators.required, Validators.minLength(8)]);
      this.form.controls.tempPassword.updateValueAndValidity({ emitEvent: false });
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
          tempPassword: '',
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
    const updatePayload: Omit<Doctor, 'id'> = {
      userId: this.currentDoctor?.userId ?? `user-doctor-${Date.now()}`,
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

    const createPayload: CreateDoctorDto = {
      fullName: value.fullName ?? '',
      specialization: value.specialization ?? '',
      bio: value.bio ?? '',
      licenseNumber: value.licenseNumber ?? '',
      ptrNumber: value.ptrNumber ?? '',
      s2Number: value.s2Number ?? '',
      consultationFee: Number(value.consultationFee ?? 0),
      slotDurationMinutes: Number(value.slotDurationMinutes ?? 30),
      slotCapacity: Number(value.slotCapacity ?? 1),
      dailyPatientLimit: value.dailyPatientLimit ?? null,
      doctorEmail: String(value.doctorEmail ?? '').trim(),
      tempPassword: String(value.tempPassword ?? '')
    };

    const schedulesPayload: UpsertSchedulesDto = {
      schedules: this.scheduleDraft
        .filter((row) => row.enabled)
        .map((row) => ({
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime
        }))
    };

    const save$ = this.isEditMode && this.doctorId
      ? this.adminDoctorsService.updateDoctor(this.doctorId, updatePayload)
      : this.adminDoctorsService.createDoctor(createPayload);

    save$
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
          const message = this.isEditMode ? 'Doctor updated successfully.' : 'Doctor created successfully.';
          await this.presentToast(message, 'success');
          void this.router.navigate(['/admin/doctors']);
        },
        error: (error: unknown) => {
          void this.presentToast(extractApiErrorMessage(error, 'Failed to save doctor.'));
        }
      });
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

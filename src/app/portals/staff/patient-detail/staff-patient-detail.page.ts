import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import { IonLabel, ToastController, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { Booking, PatientDetail } from '../../../core/models';
import { BookingService } from '../../../core/services/booking.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PatientMediaPanelComponent } from '../../../shared/components/patient-media-panel/patient-media-panel.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { StaffService } from '../services/staff.service';
import { passwordStrengthValidator } from '../../../shared/validators/password-strength.validator';

@Component({
  selector: 'app-staff-patient-detail-page',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    ReactiveFormsModule,
    AvatarComponent,
    EmptyStateComponent,
    PatientMediaPanelComponent,
    SkeletonComponent,
    StatusBadgeComponent,
    IonLabel,
    IonSegment,
    IonSegmentButton
  ],
  templateUrl: './staff-patient-detail.page.html',
  styleUrl: './staff-patient-detail.page.scss'
})
export class StaffPatientDetailPage implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly staffService = inject(StaffService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly toastCtrl = inject(ToastController);

  patient: PatientDetail | null = null;
  bookings: Booking[] = [];
  selectedTab: 'overview' | 'bookings' | 'records' = 'overview';
  isLoading = true;
  errorMessage = '';
  isCreatingPortalAccount = false;
  portalAccountForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    temporaryPassword: ['', [Validators.required, passwordStrengthValidator]],
    confirmTemporaryPassword: ['', Validators.required]
  }, { validators: [portalAccountPasswordsMatchValidator] });

  private patientId = '';
  private requestVersion = 0;

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id') ?? '';

    if (!this.patientId) {
      this.isLoading = false;
      this.errorMessage = 'Missing patient ID.';
      return;
    }

    this.loadPatient();
  }

  back(): void {
    void this.router.navigate(['/staff/patients']);
  }

  retry(): void {
    if (!this.patientId) {
      return;
    }

    this.loadPatient();
  }

  setSelectedTab(value: string | number | null | undefined): void {
    if (value === 'overview' || value === 'bookings' || value === 'records') {
      this.selectedTab = value;
    }
  }

  patientDisplayName(): string {
    if (!this.patient) {
      return 'Patient';
    }

    const parts = [this.patient.firstName, this.patient.middleName, this.patient.lastName]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part));

    return parts.length > 0 ? parts.join(' ') : 'Patient';
  }

  get patientStatusLabel(): 'LinkedAccount' | 'NoAccount' | 'AccountUnknown' {
    if (this.patient?.hasAccount === true || Boolean(this.patient?.userId?.trim())) {
      return 'LinkedAccount';
    }

    if (this.patient?.hasAccount === false) {
      return 'NoAccount';
    }

    return 'AccountUnknown';
  }

  get patientStatusLabelText(): string {
    switch (this.patientStatusLabel) {
      case 'LinkedAccount':
        return 'Account Linked';
      case 'NoAccount':
        return 'No Account';
      default:
        return 'Account Unknown';
    }
  }

  private loadPatient(): void {
    const version = ++this.requestVersion;
    this.isLoading = true;
    this.errorMessage = '';
    this.patient = null;
    this.bookings = [];
    this.selectedTab = 'overview';

    this.staffService
      .getPatientById(this.patientId)
      .pipe(
        finalize(() => {
          if (version === this.requestVersion) {
            this.isLoading = false;
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (patient) => {
          if (version !== this.requestVersion) {
            return;
          }

          if (!patient) {
            this.patient = null;
            this.errorMessage = 'No patient data was returned.';
            return;
          }

          this.patient = patient;
          this.portalAccountForm.patchValue({
            email: patient.email ?? '',
            temporaryPassword: '',
            confirmTemporaryPassword: ''
          });
          this.loadBookings();
        },
        error: () => {
          if (version !== this.requestVersion) {
            return;
          }

          this.patient = null;
          this.bookings = [];
          this.errorMessage = 'We could not load this patient record.';
          this.portalAccountForm.reset({
            email: '',
            temporaryPassword: '',
            confirmTemporaryPassword: ''
          });
        }
      });
  }

  async createPortalAccount(): Promise<void> {
    if (!this.patient || this.portalAccountForm.invalid) {
      this.portalAccountForm.markAllAsTouched();
      return;
    }

    const values = this.portalAccountForm.getRawValue();
    this.isCreatingPortalAccount = true;

    try {
      await firstValueFrom(
        this.staffService.createPatientPortalAccount(this.patient.id, {
          email: values.email,
          temporaryPassword: values.temporaryPassword
        })
      );

      await this.presentToast('Portal account created successfully.');
      this.loadPatient();
    } catch (error) {
      await this.presentToast(extractApiErrorMessage(error, 'Failed to create portal account.'), 'danger');
    } finally {
      this.isCreatingPortalAccount = false;
    }
  }

  showPortalAccountError(controlName: 'email' | 'temporaryPassword' | 'confirmTemporaryPassword'): boolean {
    const control = this.portalAccountForm.get(controlName);
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  get portalAccountPasswordMismatch(): boolean {
    return Boolean(this.portalAccountForm.hasError('passwordMismatch'));
  }

  private loadBookings(): void {
    if (!this.patientId) {
      return;
    }

    this.bookingService
      .getBookingsByPatientId(this.patientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (bookings) => {
          this.bookings = bookings;
        },
        error: () => {
          this.bookings = [];
        }
      });
  }

  private async presentToast(message: string, color: 'success' | 'danger' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === 'object') {
    const response = error as {
      error?: { message?: string; detail?: string; title?: string };
      message?: string;
      detail?: string;
      title?: string;
    };

    const message = response.error?.message || response.error?.detail || response.error?.title || response.message || response.detail || response.title;
    if (message && message.trim()) {
      return message.trim();
    }
  }

  return fallback;
}

function portalAccountPasswordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const temporaryPassword = control.get('temporaryPassword')?.value;
  const confirmTemporaryPassword = control.get('confirmTemporaryPassword')?.value;

  if (!temporaryPassword || !confirmTemporaryPassword) {
    return null;
  }

  return temporaryPassword === confirmTemporaryPassword ? null : { passwordMismatch: true };
}

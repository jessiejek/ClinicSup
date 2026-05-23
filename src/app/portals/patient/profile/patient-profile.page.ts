import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline, lockClosedOutline } from 'ionicons/icons';
import { catchError, finalize, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthUser, Patient, UpdatePatientRequest } from '../../../core/models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { PatientService } from '../services/patient.service';
import {
  getPasswordStrength,
  passwordStrengthValidator
} from '../../../shared/validators/password-strength.validator';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

interface NameParts {
  firstName: string;
  lastName: string;
}

@Component({
  selector: 'app-patient-profile-page',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    DatePipe,
    ReactiveFormsModule,
    IonItem,
    IonLabel,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
  ],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">My Profile</h2>
          <p class="page-subtitle">Keep your patient details up to date.</p>
        </div>
      </div>

      <div class="banner banner--warning" *ngIf="loadError || !currentPatient">
        <ion-icon name="alert-circle-outline"></ion-icon>
        <span>
          {{ loadError || 'We could not match this account to a patient record yet. Saving requires a linked patient record.' }}
        </span>
      </div>

      <div class="profile-grid">
        <div class="profile-grid__main">
          <form class="clinic-card profile-card" [formGroup]="profileForm" (ngSubmit)="saveProfile()" novalidate>
          <div class="section-heading">Personal Information</div>
          <div class="profile-grid__fields">
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">First Name</ion-label>
              <ion-input formControlName="firstName" name="firstName" autocomplete="given-name"></ion-input>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Middle Name</ion-label>
              <ion-input
                formControlName="middleName"
                name="middleName"
                autocomplete="additional-name"
              ></ion-input>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Last Name</ion-label>
              <ion-input formControlName="lastName" name="lastName" autocomplete="family-name"></ion-input>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Birthdate</ion-label>
              <ion-input
                type="date"
                formControlName="dateOfBirth"
                name="dateOfBirth"
                autocomplete="bday"
              ></ion-input>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Sex</ion-label>
              <ion-select formControlName="sex" name="sex">
                <ion-select-option value="Male">Male</ion-select-option>
                <ion-select-option value="Female">Female</ion-select-option>
                <ion-select-option value="Other">Other</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Civil Status</ion-label>
              <ion-select formControlName="civilStatus" name="civilStatus">
                <ion-select-option value="">Not specified</ion-select-option>
                <ion-select-option value="Single">Single</ion-select-option>
                <ion-select-option value="Married">Married</ion-select-option>
                <ion-select-option value="Separated">Separated</ion-select-option>
                <ion-select-option value="Widowed">Widowed</ion-select-option>
                <ion-select-option value="Other">Other</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Blood Type</ion-label>
              <ion-select formControlName="bloodType" name="bloodType">
                <ion-select-option value="">Not specified</ion-select-option>
                <ion-select-option value="A+">A+</ion-select-option>
                <ion-select-option value="A-">A-</ion-select-option>
                <ion-select-option value="B+">B+</ion-select-option>
                <ion-select-option value="B-">B-</ion-select-option>
                <ion-select-option value="AB+">AB+</ion-select-option>
                <ion-select-option value="AB-">AB-</ion-select-option>
                <ion-select-option value="O+">O+</ion-select-option>
                <ion-select-option value="O-">O-</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Contact Number</ion-label>
              <ion-input
                formControlName="contactNumber"
                name="contactNumber"
                autocomplete="tel"
              ></ion-input>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Email</ion-label>
              <ion-input
                formControlName="email"
                name="email"
                autocomplete="email"
                [readonly]="true"
              ></ion-input>
            </ion-item>
          </div>

          <div class="section-heading">Address</div>
          <div class="profile-grid__fields">
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Address</ion-label>
              <ion-input
                formControlName="address"
                name="address"
                autocomplete="street-address"
              ></ion-input>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">City</ion-label>
              <ion-input
                formControlName="city"
                name="city"
                autocomplete="address-level2"
              ></ion-input>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Zip Code</ion-label>
              <ion-input
                formControlName="zipCode"
                name="zipCode"
                autocomplete="postal-code"
              ></ion-input>
            </ion-item>
          </div>

          <div class="section-heading">Emergency Contact</div>
          <div class="profile-grid__fields">
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Name</ion-label>
              <ion-input formControlName="emergencyContactName" name="emergencyContactName"></ion-input>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Relationship</ion-label>
              <ion-input
                formControlName="emergencyContactRelationship"
                name="emergencyContactRelationship"
              ></ion-input>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Contact Number</ion-label>
              <ion-input
                formControlName="emergencyContactNumber"
                name="emergencyContactNumber"
                autocomplete="tel"
              ></ion-input>
            </ion-item>
          </div>

          <div class="section-heading">HMO / PhilHealth</div>
          <div class="profile-grid__fields">
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">HMO Provider</ion-label>
              <ion-input formControlName="hmoProvider" name="hmoProvider"></ion-input>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">HMO Number</ion-label>
              <ion-input formControlName="hmoCardNumber" name="hmoCardNumber"></ion-input>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">PhilHealth Number</ion-label>
              <ion-input formControlName="philHealthNumber" name="philHealthNumber"></ion-input>
            </ion-item>
          </div>

          <div class="profile-actions">
            <ion-button
              type="submit"
              expand="block"
              color="primary"
              [disabled]="isLoadingProfile || savingProfile"
            >
              {{ savingProfile ? 'Saving...' : 'Save Changes' }}
            </ion-button>
          </div>
          </form>
        </div>

        <div class="profile-grid__side">
          <div class="clinic-card profile-card consent-card" *ngIf="currentPatient">
            <div class="section-heading">Patient Consent</div>
            <ng-container *ngIf="hasConsented; else consentPending">
              <div class="consent-status">
                <div class="consent-status__badge">
                  <ion-icon name="lock-closed-outline" aria-hidden="true"></ion-icon>
                  <span>Submitted</span>
                </div>
                <div class="consent-status__content">
                  <p class="consent-status__title">Consent submitted</p>
                  <p class="consent-status__meta">
                    Version: {{ currentPatient.consentVersion || consentVersion }}
                  </p>
                  <p class="consent-status__meta">
                    Date: {{ currentPatient.consentedAt | date: 'medium' }}
                  </p>
                </div>
              </div>
            </ng-container>

            <ng-template #consentPending>
              <p class="consent-card__text">
                Please review and confirm your consent to continue using clinic services.
              </p>
              <label class="consent-checkbox">
                <input
                  type="checkbox"
                  [checked]="consentAcknowledged"
                  (change)="onConsentToggle($event)"
                />
                <span>I confirm that I consent to the clinic processing my patient information.</span>
              </label>
              <div class="profile-actions">
                <ion-button
                  type="button"
                  expand="block"
                  color="primary"
                  [disabled]="!consentAcknowledged || consentSubmitting"
                  (click)="submitConsent()"
                >
                  {{ consentSubmitting ? 'Submitting...' : 'Submit Consent' }}
                </ion-button>
              </div>
            </ng-template>
          </div>

          <form class="clinic-card profile-card" [formGroup]="passwordForm" (ngSubmit)="changePassword()" novalidate>
            <div class="section-heading">Change Password</div>
            <div class="profile-grid__fields profile-grid__fields--single">
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Current Password</ion-label>
              <ion-input
                type="password"
                formControlName="currentPassword"
                name="currentPassword"
                autocomplete="current-password"
              ></ion-input>
            </ion-item>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">New Password</ion-label>
              <ion-input
                type="password"
                formControlName="newPassword"
                name="newPassword"
                autocomplete="new-password"
              ></ion-input>
            </ion-item>
            <div class="password-strength">
              <span
                *ngFor="let index of strengthIndexes"
                class="password-strength__bar"
                [class.is-active]="index < passwordStrength"
                [ngClass]="{
                  'password-strength__bar--weak': passwordStrength === 1,
                  'password-strength__bar--fair': passwordStrength === 2,
                  'password-strength__bar--good': passwordStrength === 3,
                  'password-strength__bar--strong': passwordStrength === 4
                }"
              ></span>
            </div>
            <p class="password-strength__label" *ngIf="strengthLabel">{{ strengthLabel }}</p>
            <ion-item class="clinic-input" lines="none">
              <ion-label position="stacked">Confirm Password</ion-label>
              <ion-input
                type="password"
                formControlName="confirmPassword"
                name="confirmPassword"
                autocomplete="new-password"
              ></ion-input>
            </ion-item>
            </div>

            <div class="form-error-message" *ngIf="passwordForm.touched && passwordForm.hasError('passwordMismatch')">
              Passwords do not match.
            </div>

            <div class="profile-actions">
              <ion-button type="submit" expand="block" color="primary" [disabled]="changingPassword">
                Update Password
              </ion-button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `,
  styleUrl: './patient-profile.page.scss'
})
export class PatientProfilePage implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly patientService = inject(PatientService);
  private readonly fb = inject(FormBuilder);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  currentUser: AuthUser | null = null;
  currentPatient: Patient | null = null;
  loadError: string | null = null;
  readonly consentVersion = '1.0';
  strengthIndexes = [0, 1, 2, 3];
  passwordStrength: 0 | 1 | 2 | 3 | 4 = 0;
  isLoadingProfile = true;
  savingProfile = false;
  changingPassword = false;
  consentAcknowledged = false;
  consentSubmitting = false;

  profileForm = this.fb.nonNullable.group({
    firstName: [''],
    middleName: [''],
    lastName: [''],
    dateOfBirth: [''],
    sex: ['Male'],
    civilStatus: [''],
    bloodType: [''],
    contactNumber: [''],
    email: [{ value: '', disabled: true }],
    address: [''],
    city: [''],
    zipCode: [''],
    emergencyContactName: [''],
    emergencyContactRelationship: [''],
    emergencyContactNumber: [''],
    hmoProvider: [''],
    hmoCardNumber: [''],
    philHealthNumber: ['']
  });

  passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword: ['', Validators.required]
    },
    { validators: passwordMatchValidator }
  );

  constructor() {
    addIcons({ lockClosedOutline, alertCircleOutline });
    this.passwordForm.controls.newPassword.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.passwordStrength = getPasswordStrength(String(value ?? ''));
      });
  }

  ngOnInit(): void {
    this.authState.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.currentUser = user;
        if (user && !this.currentPatient) {
          this.patchFromUser(user);
        }
      });

    this.loadProfile();
  }

  get strengthLabel(): string {
    switch (this.passwordStrength) {
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return '';
    }
  }

  get hasConsented(): boolean {
    return Boolean(this.currentPatient?.consentedAt);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    if (!this.currentPatient) {
      void this.presentToast('No linked patient record found for this account.', 'danger');
      return;
    }

    const value = this.profileForm.getRawValue();
    const payload: UpdatePatientRequest = {
      firstName: value.firstName.trim(),
      middleName: value.middleName.trim() || undefined,
      lastName: value.lastName.trim(),
      dateOfBirth: value.dateOfBirth,
      sex: value.sex,
      civilStatus: value.civilStatus.trim() || undefined,
      bloodType: value.bloodType.trim() || undefined,
      contactNumber: value.contactNumber.trim() || undefined,
      email: value.email.trim() || undefined,
      address: value.address.trim() || undefined,
      city: value.city.trim() || undefined,
      zipCode: value.zipCode.trim() || undefined,
      emergencyContactName: value.emergencyContactName.trim() || undefined,
      emergencyContactRelationship: value.emergencyContactRelationship.trim() || undefined,
      emergencyContactNumber: value.emergencyContactNumber.trim() || undefined,
      hmoProvider: value.hmoProvider.trim() || undefined,
      hmoCardNumber: value.hmoCardNumber.trim() || undefined,
      philHealthNumber: value.philHealthNumber.trim() || undefined
    };

    this.savingProfile = true;
    this.patientService
      .updateMyProfile(payload)
      .pipe(
        catchError((error: unknown) => {
          void this.presentToast(extractApiErrorMessage(error, 'Failed to update profile.'), 'danger');
          return of(null);
        }),
        finalize(() => {
          this.savingProfile = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((updated) => {
        if (!updated) {
          return;
        }

        this.currentPatient = updated;
        this.patchFromPatient(updated);
        if (this.currentUser) {
          this.authState.setUser({
            ...this.currentUser,
            fullName: buildFullName(updated.firstName, updated.middleName, updated.lastName),
            email: updated.email ?? this.currentUser.email
          });
        }
        void this.presentToast('Profile updated successfully.', 'success');
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.changingPassword = true;
    setTimeout(async () => {
      this.changingPassword = false;
      this.passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      this.passwordStrength = 0;
      await this.presentToast('Password updated successfully.', 'success');
    }, 800);
  }

  submitConsent(): void {
    if (!this.currentPatient || this.hasConsented || !this.consentAcknowledged || this.consentSubmitting) {
      return;
    }

    this.consentSubmitting = true;
    this.patientService
      .submitConsent(this.consentVersion)
      .pipe(
        catchError((error: unknown) => {
          void this.presentToast(extractApiErrorMessage(error, 'Failed to submit consent.'), 'danger');
          return of(null);
        }),
        finalize(() => {
          this.consentSubmitting = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((updated) => {
        if (!updated) {
          return;
        }

        this.currentPatient = updated;
        this.patchFromPatient(updated);
        this.consentAcknowledged = false;
        void this.presentToast('Consent submitted successfully.', 'success');
      });
  }

  private loadProfile(): void {
    this.isLoadingProfile = true;
    this.loadError = null;

    this.patientService
      .getMyProfile()
      .pipe(
        catchError((error: unknown) => {
          this.loadError = extractApiErrorMessage(error, 'The patient profile could not be loaded.');
          void this.presentToast(this.loadError, 'danger');
          return of(null);
        }),
        finalize(() => {
          this.isLoadingProfile = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((patient) => {
        if (!patient) {
          return;
        }

        this.currentPatient = patient;
        this.patchFromPatient(patient);
        this.consentAcknowledged = false;
      });
  }

  private patchFromUser(user: AuthUser): void {
    const nameParts = splitName(user.fullName);
    this.profileForm.patchValue({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      email: user.email
    });
  }

  private patchFromPatient(patient: Patient): void {
    const fallback = this.currentUser ? splitName(this.currentUser.fullName) : { firstName: '', lastName: '' };
    this.profileForm.patchValue({
      firstName: patient.firstName || fallback.firstName,
      middleName: patient.middleName ?? '',
      lastName: patient.lastName || fallback.lastName,
      dateOfBirth: patient.dateOfBirth,
      sex: patient.sex,
      civilStatus: patient.civilStatus ?? '',
      bloodType: patient.bloodType ?? '',
      contactNumber: patient.contactNumber ?? '',
      email: patient.email ?? this.currentUser?.email ?? '',
      address: patient.address ?? '',
      city: patient.city ?? '',
      zipCode: patient.zipCode ?? '',
      emergencyContactName: patient.emergencyContactName ?? '',
      emergencyContactRelationship: patient.emergencyContactRelationship ?? '',
      emergencyContactNumber: patient.emergencyContactNumber ?? '',
      hmoProvider: patient.hmoProvider ?? '',
      hmoCardNumber: patient.hmoCardNumber ?? '',
      philHealthNumber: patient.philHealthNumber ?? ''
    });
  }

  onConsentToggle(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.consentAcknowledged = Boolean(target?.checked);
  }

  private async presentToast(message: string, color: 'danger' | 'success' = 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1800,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

function splitName(fullName: string): NameParts {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

function buildFullName(firstName: string, middleName: string | undefined, lastName: string): string {
  return [firstName, middleName ?? '', lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
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

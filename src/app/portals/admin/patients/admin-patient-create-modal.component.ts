import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { closeOutline } from 'ionicons/icons';
import { CreatePatientRequest } from '../../../core/models';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { passwordStrengthValidator } from '../../../shared/validators/password-strength.validator';
import { AdminPatientsService } from '../services/admin-patients.service';

type PatientCreateFormValue = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  civilStatus: string;
  address: string;
  city: string;
  zipCode: string;
  contactNumber: string;
  email: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  emergencyContactRelationship: string;
  bloodType: string;
  philHealthNumber: string;
  hmoProvider: string;
  hmoCardNumber: string;
  createAccount: boolean;
  accountPassword: string;
  accountAvatarUrl: string;
};

@Component({
  selector: 'app-admin-patient-create-modal',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    ReactiveFormsModule,
    IonButton,
    IonCheckbox,
    IonContent,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    StatusBadgeComponent
  ],
  template: `
    <div class="patient-create-modal">
      <header class="patient-create-modal__header">
        <div class="patient-create-modal__title">
          <h3>Add Patient</h3>
          <p>Register a new patient record.</p>
        </div>
        <ion-button class="patient-create-modal__close" fill="clear" type="button" [disabled]="isSaving" (click)="cancel()">
          <ion-icon slot="icon-only" [icon]="closeOutline"></ion-icon>
        </ion-button>
      </header>

      <ion-content class="patient-create-modal__body" [scrollY]="true">
        <form class="patient-create-modal__form" [formGroup]="form" novalidate (ngSubmit)="submit()">
          <section class="patient-create-modal__section">
            <div class="section-heading">Personal Information</div>
            <div class="patient-create-modal__grid patient-create-modal__grid--two">
              <div class="modal-field" [class.is-invalid]="showError('firstName')">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">First Name *</ion-label>
                  <ion-input formControlName="firstName" autocomplete="given-name" placeholder="First name"></ion-input>
                </ion-item>
                <small *ngIf="showError('firstName')">First name is required.</small>
              </div>

              <div class="modal-field">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Middle Name</ion-label>
                  <ion-input formControlName="middleName" autocomplete="additional-name" placeholder="Middle name"></ion-input>
                </ion-item>
              </div>

              <div class="modal-field" [class.is-invalid]="showError('lastName')">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Last Name *</ion-label>
                  <ion-input formControlName="lastName" autocomplete="family-name" placeholder="Last name"></ion-input>
                </ion-item>
                <small *ngIf="showError('lastName')">Last name is required.</small>
              </div>

              <div class="modal-field" [class.is-invalid]="showError('dateOfBirth')">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Date of Birth *</ion-label>
                  <ion-input type="date" formControlName="dateOfBirth"></ion-input>
                </ion-item>
                <small *ngIf="showError('dateOfBirth')">Date of birth is required.</small>
              </div>

              <div class="modal-field" [class.is-invalid]="showError('sex')">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Sex *</ion-label>
                  <ion-select formControlName="sex" interface="popover" placeholder="Select sex">
                    <ion-select-option value="Male">Male</ion-select-option>
                    <ion-select-option value="Female">Female</ion-select-option>
                  </ion-select>
                </ion-item>
                <small *ngIf="showError('sex')">Sex is required.</small>
              </div>

              <div class="modal-field">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Civil Status</ion-label>
                  <ion-select formControlName="civilStatus" interface="popover" placeholder="Not specified">
                    <ion-select-option value="">Not specified</ion-select-option>
                    <ion-select-option *ngFor="let option of civilStatusOptions" [value]="option">{{ option }}</ion-select-option>
                  </ion-select>
                </ion-item>
              </div>
            </div>
          </section>

          <section class="patient-create-modal__section">
            <div class="section-heading">Contact & Address</div>
            <div class="patient-create-modal__grid patient-create-modal__grid--two">
              <div class="modal-field">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Contact Number</ion-label>
                  <ion-input formControlName="contactNumber" autocomplete="tel" placeholder="Contact number"></ion-input>
                </ion-item>
              </div>

              <div class="modal-field">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Email</ion-label>
                  <ion-input type="email" formControlName="email" autocomplete="email" placeholder="Email"></ion-input>
                </ion-item>
                <small *ngIf="showError('email')">
                  {{ form.controls.createAccount.value ? 'A valid email is required to create the login account.' : 'Enter a valid email address.' }}
                </small>
              </div>

              <div class="modal-field">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Zip Code</ion-label>
                  <ion-input formControlName="zipCode" autocomplete="postal-code" placeholder="Zip code"></ion-input>
                </ion-item>
              </div>

              <div class="modal-field modal-field--full">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Address</ion-label>
                  <ion-input formControlName="address" autocomplete="street-address" placeholder="Address"></ion-input>
                </ion-item>
              </div>

              <div class="modal-field">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">City</ion-label>
                  <ion-input formControlName="city" autocomplete="address-level2" placeholder="City"></ion-input>
                </ion-item>
              </div>
            </div>
          </section>

          <section class="patient-create-modal__section patient-account-panel">
            <div class="section-heading">Login Account (Optional)</div>

            <div class="patient-account-toggle">
              <ion-checkbox formControlName="createAccount" (ionChange)="onCreateAccountToggle()"></ion-checkbox>
              <div>
                <strong>Create login account for this patient</strong>
                <p>The email above will be used for the login account.</p>
              </div>
            </div>

            <div class="patient-account-status" *ngIf="pendingAccountUserId">
              <app-status-badge status="LinkedAccount"></app-status-badge>
              <p>Login account created. Save the patient profile to finish linking it.</p>
              <p class="data-mono">User ID: {{ pendingAccountUserId }}</p>
            </div>

            <p class="patient-account-note" *ngIf="accountFieldsVisible && !pendingAccountUserId">
              The email above will be used for the login account.
            </p>

            <div *ngIf="accountFieldsVisible && !pendingAccountUserId" class="patient-create-modal__grid patient-create-modal__grid--two">
              <div class="modal-field" [class.is-invalid]="showError('accountPassword')">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Password *</ion-label>
                  <ion-input
                    type="password"
                    formControlName="accountPassword"
                    autocomplete="new-password"
                    placeholder="Create a strong password"
                  ></ion-input>
                </ion-item>
                <small *ngIf="showError('accountPassword')">Password is required and must be strong enough.</small>
              </div>

              <div class="modal-field">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Avatar URL</ion-label>
                  <ion-input formControlName="accountAvatarUrl" placeholder="Optional avatar URL"></ion-input>
                </ion-item>
              </div>
            </div>
          </section>

          <section class="patient-create-modal__section">
            <div class="section-heading">Emergency Contact</div>
            <div class="patient-create-modal__grid patient-create-modal__grid--two">
              <div class="modal-field">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Emergency Contact Name</ion-label>
                  <ion-input formControlName="emergencyContactName" placeholder="Name"></ion-input>
                </ion-item>
              </div>

              <div class="modal-field">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Emergency Contact Number</ion-label>
                  <ion-input formControlName="emergencyContactNumber" placeholder="Contact number"></ion-input>
                </ion-item>
              </div>

              <div class="modal-field">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Relationship</ion-label>
                  <ion-input formControlName="emergencyContactRelationship" placeholder="Relationship"></ion-input>
                </ion-item>
              </div>
            </div>
          </section>

          <section class="patient-create-modal__section">
            <div class="section-heading">Insurance</div>
            <div class="patient-create-modal__grid patient-create-modal__grid--two">
              <div class="modal-field">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">Blood Type</ion-label>
                  <ion-select formControlName="bloodType" interface="popover" placeholder="Not specified">
                    <ion-select-option value="">Not specified</ion-select-option>
                    <ion-select-option *ngFor="let option of bloodTypeOptions" [value]="option">{{ option }}</ion-select-option>
                  </ion-select>
                </ion-item>
              </div>

              <div class="modal-field">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">PhilHealth Number</ion-label>
                  <ion-input formControlName="philHealthNumber" placeholder="PhilHealth number"></ion-input>
                </ion-item>
              </div>

              <div class="modal-field">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">HMO Provider</ion-label>
                  <ion-input formControlName="hmoProvider" placeholder="HMO provider"></ion-input>
                </ion-item>
              </div>

              <div class="modal-field modal-field--full">
                <ion-item class="clinic-input" lines="none">
                  <ion-label position="stacked">HMO Card Number</ion-label>
                  <ion-input formControlName="hmoCardNumber" placeholder="HMO card number"></ion-input>
                </ion-item>
              </div>
            </div>
          </section>
        </form>
      </ion-content>

      <footer class="patient-create-modal__footer">
        <ion-button fill="outline" type="button" [disabled]="isSaving" (click)="cancel()">Cancel</ion-button>
        <ion-button type="button" [disabled]="isSaving || form.invalid" (click)="submit()">
          {{ isSaving ? 'Saving...' : 'Save Patient' }}
        </ion-button>
      </footer>
    </div>
  `,
  styleUrl: './admin-patient-create-modal.component.scss'
})
export class AdminPatientCreateModalComponent {
  private readonly adminPatientsService = inject(AdminPatientsService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly fb = inject(FormBuilder);
  readonly closeOutline = closeOutline;

  readonly sexOptions = ['Male', 'Female'];
  readonly civilStatusOptions = ['Single', 'Married', 'Separated', 'Widowed', 'Other'];
  readonly bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  isSaving = false;
  pendingAccountUserId: string | null = null;

  form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    middleName: [''],
    lastName: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
    sex: ['', Validators.required],
    civilStatus: [''],
    address: [''],
    city: [''],
    zipCode: [''],
    contactNumber: [''],
    email: ['', [Validators.email]],
    emergencyContactName: [''],
    emergencyContactNumber: [''],
    emergencyContactRelationship: [''],
    bloodType: [''],
    philHealthNumber: [''],
    hmoProvider: [''],
    hmoCardNumber: [''],
    createAccount: [false],
    accountPassword: [''],
    accountAvatarUrl: ['']
  });

  get accountFieldsVisible(): boolean {
    return this.form.controls.createAccount.value || !!this.pendingAccountUserId;
  }

  showError(controlName: keyof PatientCreateFormValue): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  async cancel(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    this.resetForm();
    await this.modalCtrl.dismiss(undefined, 'cancel');
  }

  onCreateAccountToggle(): void {
    this.syncAccountState();
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue() as PatientCreateFormValue;
    const wantsAccount = values.createAccount || !!this.pendingAccountUserId;

    this.isSaving = true;

    try {
      const accountUserId = wantsAccount ? await this.ensureAccountUserId(values) : null;
      const dto = this.buildPatientRequest(values, accountUserId);
      await firstValueFrom(this.adminPatientsService.createPatient(dto));

      await this.presentToast(wantsAccount ? 'Patient and login account created successfully.' : 'Patient created successfully.');
      this.resetForm();
      await this.modalCtrl.dismiss({ created: true }, 'saved');
    } catch (error) {
      if (wantsAccount && this.pendingAccountUserId) {
        await this.presentToast(
          'Login account was created, but the patient profile was not saved yet. Please save the patient record again.',
          'danger'
        );
      } else {
        await this.presentToast(extractApiErrorMessage(error, 'Failed to create patient.'), 'danger');
      }
    } finally {
      this.isSaving = false;
    }
  }

  private syncAccountState(): void {
    const createAccountControl = this.form.controls.createAccount;
    const emailControl = this.form.controls.email;
    const passwordControl = this.form.controls.accountPassword;
    const avatarControl = this.form.controls.accountAvatarUrl;

    if (this.pendingAccountUserId) {
      createAccountControl.setValue(true, { emitEvent: false });
      createAccountControl.disable({ emitEvent: false });
      emailControl.disable({ emitEvent: false });
      passwordControl.disable({ emitEvent: false });
      avatarControl.disable({ emitEvent: false });
      emailControl.setValidators([Validators.required, Validators.email]);
      passwordControl.clearValidators();
      passwordControl.setValue('', { emitEvent: false });
      avatarControl.setValue('', { emitEvent: false });
    } else {
      createAccountControl.enable({ emitEvent: false });
      emailControl.enable({ emitEvent: false });
      passwordControl.enable({ emitEvent: false });
      avatarControl.enable({ emitEvent: false });

      if (createAccountControl.value) {
        emailControl.setValidators([Validators.required, Validators.email]);
        passwordControl.setValidators([Validators.required, passwordStrengthValidator]);
      } else {
        emailControl.setValidators([Validators.email]);
        passwordControl.clearValidators();
        passwordControl.setValue('', { emitEvent: false });
        avatarControl.setValue('', { emitEvent: false });
      }
    }

    emailControl.updateValueAndValidity({ emitEvent: false });
    passwordControl.updateValueAndValidity({ emitEvent: false });
    avatarControl.updateValueAndValidity({ emitEvent: false });
  }

  private async ensureAccountUserId(values: PatientCreateFormValue): Promise<string | null> {
    if (this.pendingAccountUserId) {
      return this.pendingAccountUserId;
    }

    const accountPayload = {
      firstName: this.requiredValue(values.firstName),
      middleName: this.optionalValue(values.middleName),
      lastName: this.requiredValue(values.lastName),
      email: this.requiredValue(values.email),
      password: values.accountPassword,
      avatarUrl: this.optionalValue(values.accountAvatarUrl)
    };

    const userId = await firstValueFrom(this.adminPatientsService.registerPatientAccount(accountPayload));
    this.pendingAccountUserId = userId;
    this.syncAccountState();
    return userId;
  }

  private buildPatientRequest(values: PatientCreateFormValue, userId: string | null): CreatePatientRequest {
    return {
      firstName: this.requiredValue(values.firstName),
      middleName: this.optionalValue(values.middleName),
      lastName: this.requiredValue(values.lastName),
      dateOfBirth: this.requiredValue(values.dateOfBirth),
      sex: this.requiredValue(values.sex),
      civilStatus: this.optionalValue(values.civilStatus),
      address: this.optionalValue(values.address),
      city: this.optionalValue(values.city),
      zipCode: this.optionalValue(values.zipCode),
      contactNumber: this.optionalValue(values.contactNumber),
      email: this.optionalValue(values.email),
      emergencyContactName: this.optionalValue(values.emergencyContactName),
      emergencyContactNumber: this.optionalValue(values.emergencyContactNumber),
      emergencyContactRelationship: this.optionalValue(values.emergencyContactRelationship),
      bloodType: this.optionalValue(values.bloodType),
      philHealthNumber: this.optionalValue(values.philHealthNumber),
      hmoProvider: this.optionalValue(values.hmoProvider),
      hmoCardNumber: this.optionalValue(values.hmoCardNumber),
      userId
    };
  }

  private resetForm(): void {
    this.pendingAccountUserId = null;
    this.form.reset({
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      sex: '',
      civilStatus: '',
      address: '',
      city: '',
      zipCode: '',
      contactNumber: '',
      email: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      emergencyContactRelationship: '',
      bloodType: '',
      philHealthNumber: '',
      hmoProvider: '',
      hmoCardNumber: '',
      createAccount: false,
      accountPassword: '',
      accountAvatarUrl: ''
    });
    this.syncAccountState();
  }

  private requiredValue(value: string | null | undefined): string {
    return (value ?? '').trim();
  }

  private optionalValue(value: string | null | undefined): string | undefined {
    const trimmed = (value ?? '').trim();
    return trimmed ? trimmed : undefined;
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

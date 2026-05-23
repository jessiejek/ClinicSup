import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonCheckbox,
  IonInput,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import {
  debounceTime,
  distinctUntilChanged,
  finalize,
  firstValueFrom,
  map,
  of,
  switchMap,
} from 'rxjs';
import { BookingService, CreateWalkInRequest } from '../../../core/services/booking.service';
import { AdminPatientsService } from '../../admin/services/admin-patients.service';
import { AvailableSlot, PublicService } from '../../public/services/public.service';
import { StaffService } from '../services/staff.service';
import { CreatePatientRequest, Doctor, PatientDetail, PatientSummary, Service, TimeSlot } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SlotGridComponent } from '../../../shared/components/slot-grid/slot-grid.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

interface WalkInPatient {
  id: string;
  patientCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  sex: string;
  contactNumber?: string;
  email?: string;
  userId?: string;
  hasAccount?: boolean;
  isGuest: boolean;
}

type WalkInStep = 1 | 2 | 3;
type QuickRegisterControl = 'firstName' | 'middleName' | 'lastName' | 'dateOfBirth' | 'sex' | 'contactNumber' | 'email' | 'address';
type BookingControl = 'doctorId' | 'serviceId' | 'appointmentDate';

@Component({
  selector: 'app-staff-walk-in-page',
  standalone: true,
  imports: [
    NgClass,
    NgFor,
    NgIf,
    ReactiveFormsModule,
    IonCheckbox,
    IonInput,
    IonItem,
    IonLabel,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    EmptyStateComponent,
    SlotGridComponent,
    StatusBadgeComponent
  ],
  template: `
    <section class="page-shell walk-in-page">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Walk-In Booking</h2>
          <p class="page-subtitle">Create a same-day appointment in three quick steps.</p>
        </div>
      </div>

      <div class="walk-in-layout">
        <div class="walk-in-layout__main">
          <nav class="stepper" aria-label="Walk-in booking steps">
            <button
              type="button"
              class="stepper__step"
              [class.is-active]="currentWalkInStep === 1"
              [class.is-complete]="isStepComplete(1)"
              [disabled]="!canAccessStep(1)"
              (click)="goToStep(1)"
            >
              <span class="stepper__number">1</span>
              <span class="stepper__content">
                <span class="stepper__label">Patient</span>
                <span class="stepper__hint">Search or register</span>
              </span>
            </button>

            <button
              type="button"
              class="stepper__step"
              [class.is-active]="currentWalkInStep === 2"
              [class.is-complete]="isStepComplete(2)"
              [disabled]="!canAccessStep(2)"
              (click)="goToStep(2)"
            >
              <span class="stepper__number">2</span>
              <span class="stepper__content">
                <span class="stepper__label">Slot</span>
                <span class="stepper__hint">Doctor and schedule</span>
              </span>
            </button>

            <button
              type="button"
              class="stepper__step"
              [class.is-active]="currentWalkInStep === 3"
              [class.is-complete]="isStepComplete(3)"
              [disabled]="!canAccessStep(3)"
              (click)="goToStep(3)"
            >
              <span class="stepper__number">3</span>
              <span class="stepper__content">
                <span class="stepper__label">Payment</span>
                <span class="stepper__hint">Review and confirm</span>
              </span>
            </button>
          </nav>

          <section class="clinic-card walk-in-panel" *ngIf="currentWalkInStep === 1">
            <div class="walk-in-panel__head">
              <div>
                <div class="section-heading">Patient Search</div>
                <p class="panel-hint">Search by patient name, code, phone, or email.</p>
              </div>
              <span class="panel-meta" *ngIf="isSearchingPatients">
                <ion-spinner name="dots"></ion-spinner>
                Searching
              </span>
            </div>

            <ion-searchbar
              class="walk-in-searchbar"
              [formControl]="searchControl"
              placeholder="Search by patient name, code, phone, or email"
              showClearButton="focus"
              aria-label="Search patients"
            ></ion-searchbar>

            <div class="search-summary" *ngIf="hasLoadedPatients && !isSearchingPatients && !searchErrorMessage && searchResults.length > 0">
              Showing {{ searchResults.length }} of {{ patientTotalCount || searchResults.length }} patients
            </div>

            <ng-container *ngIf="!searchErrorMessage">
              <div class="search-tip" *ngIf="showSearchPrompt">
                Search for an existing patient to continue.
              </div>

              <div class="patient-results" *ngIf="!isSearchingPatients && searchResults.length > 0">
                <button type="button" class="mobile-card patient-result" *ngFor="let patient of searchResults; trackBy: trackById" [attr.aria-label]="'Select patient ' + patientDisplayName(patient)" (click)="selectPatient(patient)">
                  <div class="mobile-card__header">
                    <div>
                      <div class="mobile-card__name">{{ patientDisplayName(patient) }}</div>
                      <div class="mobile-card__code data-mono">{{ patient.patientCode }}</div>
                    </div>
                    <app-status-badge [status]="patientAccountStatus(patient)" [labelOverride]="patientAccountLabel(patient)"></app-status-badge>
                  </div>

                  <div class="mobile-card__row">
                    <span class="mobile-card__label">Contact</span>
                    <span>{{ patient.contactNumber || 'No contact provided' }}</span>
                  </div>

                  <div class="mobile-card__row">
                    <span class="mobile-card__label">Email</span>
                    <span>{{ patient.email || 'No email provided' }}</span>
                  </div>

                  <span class="data-mono">Select patient</span>
                </button>
              </div>

              <app-empty-state
                *ngIf="showInitialEmpty"
                icon="people-outline"
                title="No patients found"
                description="Register a new patient quickly to continue."
                ctaLabel="Quick Register"
                (ctaClick)="openQuickRegister()"
              ></app-empty-state>

              <app-empty-state
                *ngIf="showSearchEmpty"
                icon="person-add-outline"
                title="Patient not found"
                description="Register a new patient quickly to continue."
                ctaLabel="Quick Register"
                (ctaClick)="openQuickRegister()"
              ></app-empty-state>

              <form class="quick-register" *ngIf="showQuickRegister" [formGroup]="quickRegisterForm" novalidate (ngSubmit)="createPatient()">
                <div class="quick-register__grid">
                  <div class="form-field">
                    <div class="form-field__label">First Name *</div>
                    <ion-item class="clinic-input" lines="none" [class.is-invalid]="showQuickRegisterError('firstName')">
                      <ion-label position="stacked">First Name *</ion-label>
                      <ion-input formControlName="firstName" autocomplete="given-name" placeholder="First name"></ion-input>
                    </ion-item>
                    <div class="form-error-message" *ngIf="showQuickRegisterError('firstName')">First name is required.</div>
                  </div>

                  <div class="form-field">
                    <div class="form-field__label">Middle Name</div>
                    <ion-item class="clinic-input" lines="none">
                      <ion-label position="stacked">Middle Name</ion-label>
                      <ion-input formControlName="middleName" autocomplete="additional-name" placeholder="Middle name"></ion-input>
                    </ion-item>
                  </div>

                  <div class="form-field">
                    <div class="form-field__label">Last Name *</div>
                    <ion-item class="clinic-input" lines="none" [class.is-invalid]="showQuickRegisterError('lastName')">
                      <ion-label position="stacked">Last Name *</ion-label>
                      <ion-input formControlName="lastName" autocomplete="family-name" placeholder="Last name"></ion-input>
                    </ion-item>
                    <div class="form-error-message" *ngIf="showQuickRegisterError('lastName')">Last name is required.</div>
                  </div>

                  <div class="form-field">
                    <div class="form-field__label">Date of Birth *</div>
                    <ion-item class="clinic-input" lines="none" [class.is-invalid]="showQuickRegisterError('dateOfBirth')">
                      <ion-label position="stacked">Date of Birth *</ion-label>
                      <ion-input type="date" formControlName="dateOfBirth"></ion-input>
                    </ion-item>
                    <div class="form-error-message" *ngIf="showQuickRegisterError('dateOfBirth')">Date of birth is required.</div>
                  </div>

                  <div class="form-field">
                    <div class="form-field__label">Sex *</div>
                    <ion-item class="clinic-input" lines="none" [class.is-invalid]="showQuickRegisterError('sex')">
                      <ion-label position="stacked">Sex *</ion-label>
                      <ion-select formControlName="sex" interface="popover" placeholder="Select sex">
                        <ion-select-option value="Male">Male</ion-select-option>
                        <ion-select-option value="Female">Female</ion-select-option>
                      </ion-select>
                    </ion-item>
                    <div class="form-error-message" *ngIf="showQuickRegisterError('sex')">Sex is required.</div>
                  </div>

                  <div class="form-field">
                    <div class="form-field__label">Contact Number</div>
                    <ion-item class="clinic-input" lines="none">
                      <ion-label position="stacked">Contact Number</ion-label>
                      <ion-input formControlName="contactNumber" autocomplete="tel" placeholder="Contact number"></ion-input>
                    </ion-item>
                  </div>

                  <div class="form-field">
                    <div class="form-field__label">Email</div>
                    <ion-item class="clinic-input" lines="none" [class.is-invalid]="showQuickRegisterError('email')">
                      <ion-label position="stacked">Email</ion-label>
                      <ion-input type="email" formControlName="email" autocomplete="email" placeholder="Email"></ion-input>
                    </ion-item>
                    <div class="form-error-message" *ngIf="showQuickRegisterError('email')">Enter a valid email address.</div>
                    <p class="field-hint">Email is optional, but it helps with future portal linking.</p>
                  </div>

                  <div class="form-field field--full">
                    <div class="form-field__label">Address</div>
                    <ion-item class="clinic-input" lines="none">
                      <ion-label position="stacked">Address</ion-label>
                      <ion-input formControlName="address" autocomplete="street-address" placeholder="Address"></ion-input>
                    </ion-item>
                  </div>
                </div>

                <section class="account-ready-card">
                  <div class="section-heading">Patient Portal Account</div>
                  <label class="account-ready-toggle">
                    <ion-checkbox formControlName="preparePortalAccount"></ion-checkbox>
                    <span>
                      <strong>Prepare patient for portal account</strong>
                      <p>This patient record can be linked to a portal account when account creation is available.</p>
                    </span>
                  </label>
                  <p class="account-ready-note" *ngIf="quickRegisterForm.controls.preparePortalAccount.value">
                    Add an email if this patient may need portal access later.
                  </p>
                </section>

                <div class="quick-register__actions">
                  <button type="button" class="btn-ghost" (click)="cancelQuickRegister()">Cancel</button>
                  <button type="submit" class="btn-primary" [disabled]="isSavingPatient">
                    {{ isSavingPatient ? 'Creating...' : 'Create Patient' }}
                  </button>
                </div>
              </form>
            </ng-container>

            <app-empty-state
              *ngIf="searchErrorMessage"
              icon="warning-outline"
              title="Search unavailable"
              [description]="searchErrorMessage || 'Unable to search patients right now.'"
              ctaLabel="Retry Search"
              (ctaClick)="retrySearch()"
            ></app-empty-state>
          </section>

          <section class="clinic-card walk-in-panel" *ngIf="currentWalkInStep === 2">
            <div class="walk-in-panel__head">
              <div>
                <div class="section-heading">Slot Selection</div>
                <p class="panel-hint">Choose the doctor, service, and an available slot.</p>
              </div>
              <span class="panel-meta">The booking will be added to the queue for the selected date.</span>
            </div>

            <div class="selected-patient-strip" *ngIf="selectedPatient">
              <div class="selected-patient-strip__body">
                <div class="selected-patient-strip__title">Selected Patient</div>
                <div class="selected-patient-strip__name">{{ patientDisplayName(selectedPatient) }}</div>
                <div class="selected-patient-strip__meta">
                  <span class="data-mono">{{ selectedPatient.patientCode }}</span>
                  <span>{{ patientContactLabel(selectedPatient) }}</span>
                  <span>{{ patientEmailLabel(selectedPatient) }}</span>
                </div>
              </div>

              <div class="selected-patient-strip__actions">
                <app-status-badge [status]="patientAccountStatus(selectedPatient)" [labelOverride]="patientAccountLabel(selectedPatient)"></app-status-badge>
                <button type="button" class="btn-outline" (click)="clearSelectedPatient()">Change Patient</button>
              </div>
            </div>

            <form class="selection-grid" [formGroup]="bookingForm" novalidate>
              <div class="form-field">
                <div class="form-field__label">Doctor *</div>
                <ion-item class="clinic-input" lines="none" [class.is-invalid]="showBookingError('doctorId')">
                  <ion-label position="stacked">Doctor *</ion-label>
                  <ion-select formControlName="doctorId" interface="popover" placeholder="Select doctor">
                    <ion-select-option *ngFor="let doctor of doctors; trackBy: trackById" [value]="doctor.id">
                      {{ doctor.fullName }}
                    </ion-select-option>
                  </ion-select>
                </ion-item>
                <div class="form-error-message" *ngIf="showBookingError('doctorId')">Doctor is required.</div>
                <div class="field-hint" *ngIf="!isLoadingDoctors && doctors.length === 0">No doctors are available right now.</div>
              </div>

              <div class="form-field">
                <div class="form-field__label">Service *</div>
                <ion-item class="clinic-input" lines="none" [class.is-invalid]="showBookingError('serviceId')">
                  <ion-label position="stacked">Service *</ion-label>
                  <ion-select
                    formControlName="serviceId"
                    interface="popover"
                    placeholder="Select service"
                    [disabled]="isLoadingServices || !bookingForm.controls.doctorId.value || services.length === 0"
                  >
                    <ion-select-option *ngFor="let service of services; trackBy: trackById" [value]="service.id">
                      {{ service.name }}
                    </ion-select-option>
                  </ion-select>
                </ion-item>
                <div class="form-error-message" *ngIf="showBookingError('serviceId')">Service is required.</div>
                <div class="field-hint" *ngIf="isLoadingServices">
                  <ion-spinner name="dots"></ion-spinner>
                  Loading services...
                </div>
                <div class="field-hint" *ngIf="!isLoadingServices && bookingForm.controls.doctorId.value && services.length === 0">
                  No services are available for this doctor.
                </div>
              </div>

              <div class="form-field field--full">
                <div class="form-field__label">Appointment Date *</div>
                <ion-item class="clinic-input" lines="none" [class.is-invalid]="showBookingError('appointmentDate')">
                  <ion-label position="stacked">Appointment Date *</ion-label>
                  <ion-input type="date" formControlName="appointmentDate" [min]="todayIso"></ion-input>
                </ion-item>
                <div class="form-error-message" *ngIf="showBookingError('appointmentDate')">Appointment date is required.</div>
                <div class="field-hint">Future dates can be selected for walk-in bookings.</div>
              </div>
            </form>

            <div class="slot-section">
              <div class="section-heading">Available Slots</div>
              <ng-container *ngIf="bookingForm.controls.doctorId.value; else slotPromptTpl">
                <app-slot-grid
                  [slots]="slots"
                  [selectedSlot]="selectedSlot?.time || null"
                  [isLoading]="isLoadingSlots"
                  [unavailableToday]="doctorUnavailableToday"
                  (slotSelected)="onSlotSelected($event)"
                ></app-slot-grid>
              </ng-container>

              <ng-template #slotPromptTpl>
                <app-empty-state
                  icon="calendar-outline"
                  title="Choose a doctor"
                  description="Slots will appear after you select a doctor."
                ></app-empty-state>
              </ng-template>
            </div>

            <div class="step-actions">
              <button type="button" class="btn-ghost" (click)="goToStep(1)">Back</button>
            </div>
          </section>

          <section class="clinic-card walk-in-panel" *ngIf="currentWalkInStep === 3">
            <div class="walk-in-panel__head">
              <div>
                <div class="section-heading">Payment</div>
                <p class="panel-hint">Payment will be settled after consultation.</p>
              </div>
              <span class="panel-meta">Review the booking before submission.</span>
            </div>

            <div class="selected-patient-strip" *ngIf="selectedPatient">
              <div class="selected-patient-strip__body">
                <div class="selected-patient-strip__title">Selected Patient</div>
                <div class="selected-patient-strip__name">{{ patientDisplayName(selectedPatient) }}</div>
                <div class="selected-patient-strip__meta">
                  <span class="data-mono">{{ selectedPatient.patientCode }}</span>
                  <span>{{ patientContactLabel(selectedPatient) }}</span>
                  <span>{{ patientEmailLabel(selectedPatient) }}</span>
                </div>
              </div>

              <div class="selected-patient-strip__actions">
                <app-status-badge [status]="patientAccountStatus(selectedPatient)" [labelOverride]="patientAccountLabel(selectedPatient)"></app-status-badge>
                <button type="button" class="btn-outline" (click)="clearSelectedPatient()">Change Patient</button>
              </div>
            </div>

            <div class="review-grid">
              <div class="mobile-card review-card">
                <div class="review-card__label">Patient</div>
                <div class="review-card__value">{{ patientDisplayName(selectedPatient) }}</div>
                <div class="review-card__meta">
                  <span class="data-mono">{{ selectedPatient?.patientCode || 'No code' }}</span>
                  <app-status-badge
                    *ngIf="selectedPatient"
                    [status]="patientAccountStatus(selectedPatient)"
                    [labelOverride]="patientAccountLabel(selectedPatient)"
                  ></app-status-badge>
                </div>
              </div>

              <div class="mobile-card review-card">
                <div class="review-card__label">Doctor</div>
                <div class="review-card__value">{{ selectedDoctorLabel }}</div>
                <div class="review-card__meta">
                  <span *ngIf="selectedDoctor?.specialization">{{ selectedDoctor?.specialization }}</span>
                  <app-status-badge *ngIf="selectedDoctor" [status]="selectedDoctor.status"></app-status-badge>
                </div>
              </div>

              <div class="mobile-card review-card">
                <div class="review-card__label">Service</div>
                <div class="review-card__value">{{ selectedServiceLabel }}</div>
                <div class="review-card__meta">
                  <span>{{ selectedFeeLabel }}</span>
                </div>
              </div>

              <div class="mobile-card review-card">
                <div class="review-card__label">Schedule</div>
                <div class="review-card__value">{{ selectedDateLabel }}</div>
                <div class="review-card__meta">
                  <span>{{ selectedSlotLabel }}</span>
                </div>
              </div>

              <div class="mobile-card review-card">
                <div class="review-card__label">Payment Mode</div>
                <div class="review-card__value">Pay at Clinic</div>
                <div class="review-card__meta">
                  <span>Handled after consultation</span>
                </div>
              </div>

              <div class="mobile-card review-card">
                <div class="review-card__label">Queue</div>
                <div class="review-card__value">Today's queue</div>
                <div class="review-card__meta">
                  <span>Added after submission</span>
                </div>
              </div>
            </div>

            <div class="payment-note">
              Payment will be settled after consultation. Walk-in bookings are added to the queue once submitted.
            </div>

            <div class="step-actions">
              <button type="button" class="btn-ghost" (click)="goToStep(2)">Back</button>
              <button type="button" class="btn-primary" [disabled]="!canSubmitBooking || isSavingBooking" (click)="createBooking()">
                {{ isSavingBooking ? 'Creating...' : 'Create Booking' }}
              </button>
            </div>
          </section>
        </div>

        <aside class="walk-in-layout__summary">
          <div class="clinic-card summary-card">
            <div class="section-heading">Booking Summary</div>

            <ng-container *ngIf="selectedPatient; else summaryEmptyTpl">
              <div class="mobile-card summary-card__section">
                <div class="summary-card__section-title">Patient</div>
                <div class="summary-card__title">{{ patientDisplayName(selectedPatient) }}</div>
                <div class="summary-card__meta">
                  <span class="data-mono">{{ selectedPatient.patientCode }}</span>
                  <app-status-badge [status]="patientAccountStatus(selectedPatient)" [labelOverride]="patientAccountLabel(selectedPatient)"></app-status-badge>
                </div>
                <div class="summary-card__details">
                  <span>{{ patientContactLabel(selectedPatient) }}</span>
                  <span>{{ patientEmailLabel(selectedPatient) }}</span>
                </div>
              </div>

              <div class="mobile-card summary-card__section">
                <div class="summary-card__section-title">Doctor</div>
                <div class="summary-card__title">{{ selectedDoctorLabel }}</div>
                <div class="summary-card__details">
                  <span>{{ selectedDoctor?.specialization || 'Select a doctor' }}</span>
                  <app-status-badge *ngIf="selectedDoctor" [status]="selectedDoctor.status"></app-status-badge>
                </div>
              </div>

              <div class="mobile-card summary-card__section">
                <div class="summary-card__section-title">Service</div>
                <div class="summary-card__title">{{ selectedServiceLabel }}</div>
                <div class="summary-card__details">
                  <span>{{ selectedFeeLabel }}</span>
                </div>
              </div>

              <div class="mobile-card summary-card__section">
                <div class="summary-card__section-title">Schedule</div>
                <div class="summary-card__title">{{ selectedDateLabel }}</div>
                <div class="summary-card__details">
                  <span>{{ selectedSlotLabel }}</span>
                </div>
              </div>
            </ng-container>

            <ng-template #summaryEmptyTpl>
              <div class="mobile-card summary-card__section summary-card__section--empty">
                <div class="summary-card__empty-title">No patient selected yet</div>
                <p>Search or register a patient to start the walk-in booking.</p>
              </div>
            </ng-template>

            <div class="summary-card__queue-note">
              Walk-in bookings are added to the queue once submitted.
            </div>
          </div>
        </aside>
      </div>
    </section>
  `,
  styleUrl: './staff-walk-in.page.scss'
})
export class StaffWalkInPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly bookingService = inject(BookingService);
  private readonly staffService = inject(StaffService);
  private readonly publicService = inject(PublicService);
  private readonly adminPatientsService = inject(AdminPatientsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  readonly todayIso = toLocalIsoDate();
  readonly paymentMode: 'PayAtClinic' = 'PayAtClinic';

  currentWalkInStep: WalkInStep = 1;
  searchControl = this.fb.nonNullable.control('');
  quickRegisterForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    middleName: [''],
    lastName: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
    sex: ['', Validators.required],
    contactNumber: [''],
    email: ['', [Validators.email]],
    address: [''],
    preparePortalAccount: [false]
  });
  bookingForm = this.fb.nonNullable.group({
    doctorId: ['', Validators.required],
    serviceId: ['', Validators.required],
    appointmentDate: [this.todayIso, Validators.required]
  });

  doctors: Doctor[] = [];
  services: Service[] = [];
  slots: TimeSlot[] = [];
  selectedSlot: TimeSlot | null = null;
  selectedPatient: WalkInPatient | null = null;

  isSearchingPatients = false;
  isLoadingDoctors = false;
  isLoadingServices = false;
  isLoadingSlots = false;
  isSavingPatient = false;
  isSavingBooking = false;
  showQuickRegister = false;
  searchResults: WalkInPatient[] = [];
  searchErrorMessage: string | null = null;
  patientTotalCount = 0;
  patientCurrentPage = 1;
  patientPageSize = 20;
  patientTotalPages = 0;
  hasLoadedPatients = false;

  private searchRequestToken = 0;
  private servicesRequestToken = 0;
  private slotsRequestToken = 0;

  ngOnInit(): void {
    this.loadDoctors();
    this.loadPatients('');

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => this.searchPatients(query));

    this.bookingForm.controls.doctorId.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((doctorId) => this.onDoctorChanged(doctorId));

    this.bookingForm.controls.serviceId.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshCurrentStep());

    this.bookingForm.controls.appointmentDate.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((date) => this.onDateChanged(date));

    const rescheduling = this.route.snapshot.queryParamMap.get('rescheduling');
    if (rescheduling) {
      this.searchControl.setValue('');
    }
  }

  get hasSearchQuery(): boolean {
    return this.searchControl.value.trim().length > 0;
  }

  get showSearchPrompt(): boolean {
    return !this.hasSearchQuery && !this.selectedPatient && !this.hasLoadedPatients && !this.isSearchingPatients && !this.searchErrorMessage;
  }

  get showSearchEmpty(): boolean {
    return this.hasSearchQuery && this.hasLoadedPatients && !this.isSearchingPatients && !this.searchErrorMessage && this.searchResults.length === 0;
  }

  get showInitialEmpty(): boolean {
    return !this.hasSearchQuery && this.hasLoadedPatients && !this.isSearchingPatients && !this.searchErrorMessage && this.searchResults.length === 0;
  }

  get selectedDoctor(): Doctor | null {
    const doctorId = this.bookingForm.controls.doctorId.value;
    return this.doctors.find((doctor) => doctor.id === doctorId) ?? null;
  }

  get selectedService(): Service | null {
    const serviceId = this.bookingForm.controls.serviceId.value;
    return this.services.find((service) => service.id === serviceId) ?? null;
  }

  get selectedDateLabel(): string {
    return formatLocalDateLabel(this.bookingForm.controls.appointmentDate.value);
  }

  get selectedDoctorLabel(): string {
    return this.selectedDoctor?.fullName?.trim() || 'No doctor selected';
  }

  get selectedServiceLabel(): string {
    return this.selectedService?.name?.trim() || 'No service selected';
  }

  get selectedSlotLabel(): string {
    if (!this.selectedSlot) {
      return 'No slot selected';
    }

    return `${this.selectedSlot.time} - ${this.selectedSlot.endTime}`;
  }

  get selectedFee(): number {
    return this.selectedService?.price ?? this.selectedDoctor?.consultationFee ?? 0;
  }

  get selectedFeeLabel(): string {
    return formatPhpAmount(this.selectedFee);
  }

  get doctorUnavailableToday(): boolean {
    return Boolean(this.selectedDoctor && this.selectedDoctor.status !== 'Active');
  }

  get canSubmitBooking(): boolean {
    return Boolean(
      this.selectedPatient &&
        this.selectedDoctor &&
        this.selectedService &&
        this.selectedSlot &&
        this.bookingForm.valid
    );
  }

  canAccessStep(step: WalkInStep): boolean {
    switch (step) {
      case 1:
        return true;
      case 2:
        return Boolean(this.selectedPatient);
      case 3:
        return this.canSubmitBooking;
      default:
        return false;
    }
  }

  isStepComplete(step: WalkInStep): boolean {
    switch (step) {
      case 1:
        return Boolean(this.selectedPatient);
      case 2:
        return Boolean(this.selectedPatient && this.selectedDoctor && this.selectedService && this.selectedSlot);
      case 3:
        return false;
      default:
        return false;
    }
  }

  goToStep(step: WalkInStep): void {
    if (this.canAccessStep(step)) {
      this.currentWalkInStep = step;
    }
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  patientDisplayName(patient: WalkInPatient | null | undefined): string {
    if (!patient) {
      return 'Patient';
    }

    const explicit = trimText(patient.fullName);
    if (explicit) {
      return explicit;
    }

    const parts = [patient.firstName, patient.middleName, patient.lastName]
      .map((value) => trimText(value))
      .filter((value): value is string => Boolean(value));

    return parts.length ? parts.join(' ') : 'Patient';
  }

  patientAccountStatus(patient: WalkInPatient | null | undefined): 'LinkedAccount' | 'NoAccount' | 'AccountUnknown' {
    if (!patient) {
      return 'AccountUnknown';
    }

    if (patient.hasAccount === true || Boolean(patient.userId?.trim())) {
      return 'LinkedAccount';
    }

    if (patient.hasAccount === false) {
      return 'NoAccount';
    }

    return 'AccountUnknown';
  }

  patientAccountLabel(patient: WalkInPatient | null | undefined): string {
    switch (this.patientAccountStatus(patient)) {
      case 'LinkedAccount':
        return 'Account Linked';
      case 'NoAccount':
        return 'No Account';
      default:
        return 'Account Unknown';
    }
  }

  patientContactLabel(patient: WalkInPatient | null | undefined): string {
    return trimText(patient?.contactNumber) || 'No contact provided';
  }

  patientEmailLabel(patient: WalkInPatient | null | undefined): string {
    return trimText(patient?.email) || 'No email provided';
  }

  showQuickRegisterError(controlName: QuickRegisterControl): boolean {
    const control = this.quickRegisterForm.get(controlName);
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  showBookingError(controlName: BookingControl): boolean {
    const control = this.bookingForm.get(controlName);
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  openQuickRegister(): void {
    this.showQuickRegister = true;
  }

  cancelQuickRegister(): void {
    this.showQuickRegister = false;
    this.quickRegisterForm.reset({
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      sex: '',
      contactNumber: '',
      email: '',
      address: '',
      preparePortalAccount: false
    });
  }

  retrySearch(): void {
    this.loadPatients(this.searchControl.value);
  }

  selectPatient(patient: WalkInPatient): void {
    this.selectedPatient = patient;
    this.searchResults = [];
    this.searchErrorMessage = null;
    this.showQuickRegister = false;
    this.searchControl.setValue('', { emitEvent: false });
    this.refreshCurrentStep();
  }

  clearSelectedPatient(): void {
    this.selectedPatient = null;
    this.searchResults = [];
    this.searchErrorMessage = null;
    this.showQuickRegister = false;
    this.searchControl.setValue('', { emitEvent: false });
    this.currentWalkInStep = 1;
    this.loadPatients('');
  }

  onSlotSelected(slot: { slot: string; slotEnd: string }): void {
    this.selectedSlot = { time: slot.slot, endTime: slot.slotEnd, status: 'selected' };
    this.refreshCurrentStep();
  }

  async createPatient(): Promise<void> {
    if (this.quickRegisterForm.invalid) {
      this.quickRegisterForm.markAllAsTouched();
      return;
    }

    const values = this.quickRegisterForm.getRawValue();
    const dto: CreatePatientRequest = {
      firstName: values.firstName.trim(),
      middleName: optionalText(values.middleName),
      lastName: values.lastName.trim(),
      dateOfBirth: values.dateOfBirth.trim(),
      sex: values.sex.trim(),
      contactNumber: optionalText(values.contactNumber),
      email: optionalText(values.email),
      address: optionalText(values.address)
    };

    this.isSavingPatient = true;

    try {
      const patient = await firstValueFrom(this.adminPatientsService.createPatient(dto));
      this.selectedPatient = mapCreatedPatient(patient);
      this.searchResults = [];
      this.searchErrorMessage = null;
      this.showQuickRegister = false;
      this.searchControl.setValue('', { emitEvent: false });
      this.cancelQuickRegister();
      await this.presentToast('Patient created successfully.', 'success');
      this.refreshCurrentStep();
    } catch (error) {
      await this.presentToast(extractApiErrorMessage(error, 'Failed to create patient.'), 'danger');
    } finally {
      this.isSavingPatient = false;
    }
  }

  async createBooking(): Promise<void> {
    if (!this.canSubmitBooking || !this.selectedPatient || !this.selectedDoctor || !this.selectedService || !this.selectedSlot) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    const payload: CreateWalkInRequest = {
      patientId: this.selectedPatient.id,
      doctorId: this.selectedDoctor.id,
      serviceId: this.selectedService.id,
      appointmentDate: this.bookingForm.controls.appointmentDate.value,
      slotStartTime: this.selectedSlot.time,
      slotEndTime: this.selectedSlot.endTime,
      paymentMode: this.paymentMode,
      notes: 'Walk-in booking created by staff.'
    };

    this.isSavingBooking = true;

    try {
      const booking = await firstValueFrom(this.bookingService.createWalkIn(payload));
      await this.presentToast('Walk-in booking created successfully.', 'success');
      if (booking?.id) {
        await this.router.navigate(['/staff/bookings', booking.id]);
      } else {
        await this.router.navigate(['/staff/bookings']);
      }
    } catch (error) {
      await this.presentToast(extractApiErrorMessage(error, 'Failed to create walk-in booking.'), 'danger');
    } finally {
      this.isSavingBooking = false;
    }
  }

  private loadDoctors(): void {
    this.isLoadingDoctors = true;

    this.publicService
      .getDoctors()
      .pipe(
        finalize(() => {
          this.isLoadingDoctors = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (doctors) => {
          this.doctors = doctors;
          if (!this.bookingForm.controls.doctorId.value && doctors.length === 1) {
            this.bookingForm.controls.doctorId.setValue(doctors[0].id);
          }
        },
        error: async (error) => {
          this.doctors = [];
          await this.presentToast(extractApiErrorMessage(error, 'Failed to load doctors.'), 'danger');
        }
      });
  }

  private searchPatients(query: string): void {
    this.loadPatients(query);
  }

  private loadPatients(query: string): void {
    const trimmed = query.trim();
    this.searchErrorMessage = null;
    this.showQuickRegister = false;
    const fallbackErrorMessage = trimmed ? 'Unable to search patients right now.' : 'Unable to load patients right now.';

    const token = ++this.searchRequestToken;
    this.isSearchingPatients = true;
    this.hasLoadedPatients = false;

    this.staffService
      .getPatients(1, this.patientPageSize, trimmed)
      .pipe(
        finalize(() => {
          if (token === this.searchRequestToken) {
            this.isSearchingPatients = false;
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          if (token !== this.searchRequestToken) {
            return;
          }

          this.searchResults = result.items.map((patient) => mapSearchPatient(patient));
          this.patientTotalCount = result.totalCount ?? result.total ?? this.searchResults.length;
          this.patientCurrentPage = result.page || 1;
          this.patientPageSize = result.pageSize || this.patientPageSize;
          this.patientTotalPages = result.totalPages || 0;
          this.hasLoadedPatients = true;
        },
        error: async (error) => {
          if (token !== this.searchRequestToken) {
            return;
          }

          this.searchResults = [];
          this.searchErrorMessage = extractApiErrorMessage(error, fallbackErrorMessage);
          this.patientTotalCount = 0;
          this.patientCurrentPage = 1;
          this.patientTotalPages = 0;
          this.hasLoadedPatients = true;
          await this.presentToast(this.searchErrorMessage, 'danger');
        }
      });
  }

  private onDoctorChanged(doctorId: string): void {
    this.selectedSlot = null;
    this.services = [];
    this.bookingForm.controls.serviceId.setValue('', { emitEvent: false });

    if (!doctorId) {
      this.slots = [];
      this.isLoadingSlots = false;
      this.refreshCurrentStep();
      return;
    }

    this.loadServicesForDoctor(doctorId);
    this.refreshAvailableSlots();
    this.refreshCurrentStep();
  }

  private onDateChanged(date: string): void {
    if (!date) {
      this.selectedSlot = null;
      this.slots = [];
      this.isLoadingSlots = false;
      this.refreshCurrentStep();
      return;
    }

    this.selectedSlot = null;
    this.refreshAvailableSlots();
    this.refreshCurrentStep();
  }

  private loadServicesForDoctor(doctorId: string): void {
    const token = ++this.servicesRequestToken;
    this.isLoadingServices = true;

    this.publicService
      .getDoctorServices(doctorId)
      .pipe(
        switchMap((services) => {
          if (services.length > 0) {
            return of(services);
          }

          return this.publicService.getServices().pipe(
            map((allServices) => allServices.filter((service) => service.doctorIds.includes(doctorId)))
          );
        }),
        finalize(() => {
          if (token === this.servicesRequestToken) {
            this.isLoadingServices = false;
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (services) => {
          if (token !== this.servicesRequestToken) {
            return;
          }

          this.services = services;
          const preferredService = services[0] ?? null;
          this.bookingForm.controls.serviceId.setValue(preferredService?.id ?? '', { emitEvent: false });
          this.refreshCurrentStep();
        },
        error: async (error) => {
          if (token !== this.servicesRequestToken) {
            return;
          }

          this.services = [];
          this.bookingForm.controls.serviceId.setValue('', { emitEvent: false });
          await this.presentToast(extractApiErrorMessage(error, 'Failed to load services.'), 'danger');
        }
      });
  }

  private refreshAvailableSlots(): void {
    const doctorId = this.bookingForm.controls.doctorId.value;
    const date = this.bookingForm.controls.appointmentDate.value;

    if (!doctorId || !date) {
      this.slots = [];
      this.isLoadingSlots = false;
      return;
    }

    const token = ++this.slotsRequestToken;
    this.isLoadingSlots = true;

    this.publicService
      .getAvailableSlots(doctorId, date)
      .pipe(
        finalize(() => {
          if (token === this.slotsRequestToken) {
            this.isLoadingSlots = false;
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (slots) => {
          if (token !== this.slotsRequestToken) {
            return;
          }

          this.slots = slots.map((slot) => mapAvailableSlot(slot));
        },
        error: async (error) => {
          if (token !== this.slotsRequestToken) {
            return;
          }

          this.slots = [];
          await this.presentToast(extractApiErrorMessage(error, 'Failed to load available slots.'), 'danger');
        }
      });
  }

  private refreshCurrentStep(): void {
    if (!this.selectedPatient) {
      this.currentWalkInStep = 1;
      return;
    }

    if (this.canSubmitBooking) {
      this.currentWalkInStep = 3;
      return;
    }

    this.currentWalkInStep = 2;
  }

  private async presentToast(message: string, color: 'success' | 'danger' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2400,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

function mapSearchPatient(patient: PatientSummary): WalkInPatient {
  return {
    id: patient.id,
    patientCode: trimText(patient.patientCode) || patient.id,
    firstName: trimText(patient.firstName) || '',
    middleName: trimText(patient.middleName),
    lastName: trimText(patient.lastName) || '',
    fullName: trimText(patient.fullName) || buildPatientName(patient.firstName, patient.middleName, patient.lastName),
    dateOfBirth: trimText(patient.dateOfBirth) || '',
    sex: trimText(patient.sex) || '',
    contactNumber: trimText(patient.contactNumber),
    email: trimText(patient.email),
    userId: trimText(patient.userId),
    hasAccount: Boolean(patient.hasAccount),
    isGuest: Boolean(patient.isGuest)
  };
}

function mapCreatedPatient(patient: PatientDetail): WalkInPatient {
  return {
    id: patient.id,
    patientCode: trimText(patient.patientCode) || patient.id,
    firstName: trimText(patient.firstName) || '',
    middleName: trimText(patient.middleName),
    lastName: trimText(patient.lastName) || '',
    fullName: buildPatientName(patient.firstName, patient.middleName, patient.lastName),
    dateOfBirth: trimText(patient.dateOfBirth) || '',
    sex: trimText(patient.sex) || '',
    contactNumber: trimText(patient.contactNumber),
    email: trimText(patient.email),
    userId: trimText(patient.userId),
    hasAccount: Boolean(patient.hasAccount),
    isGuest: Boolean(patient.isGuest)
  };
}

function mapAvailableSlot(slot: AvailableSlot): TimeSlot {
  const time = trimText(slot.time || slot.slotStartTime) || '';
  const endTime = trimText(slot.endTime || slot.slotEndTime) || '';
  const bookedCount = typeof slot.bookedCount === 'number' ? slot.bookedCount : 0;
  const capacity = typeof slot.capacity === 'number' ? slot.capacity : 0;
  const isAvailable = typeof slot.isAvailable === 'boolean' ? slot.isAvailable : typeof slot.IsAvailable === 'boolean' ? slot.IsAvailable : true;
  const isFull = capacity > 0 ? bookedCount >= capacity : false;

  return {
    time,
    endTime,
    status: isAvailable ? (isFull ? 'full' : 'available') : 'disabled'
  };
}

function buildPatientName(firstName?: string | null, middleName?: string | null, lastName?: string | null): string {
  const parts = [firstName, middleName, lastName].map((value) => trimText(value)).filter((value): value is string => Boolean(value));
  return parts.length ? parts.join(' ') : 'Patient';
}

function toLocalIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLocalDateLabel(value: string): string {
  if (!value) {
    return 'No date selected';
  }

  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) {
    return value;
  }

  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function formatPhpAmount(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(amount);
}

function trimText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function optionalText(value: string | null | undefined): string | undefined {
  const trimmed = trimText(value);
  return trimmed || undefined;
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

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return fallback;
}

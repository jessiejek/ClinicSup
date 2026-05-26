import { AsyncPipe, DatePipe, NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { AfterViewChecked, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { BehaviorSubject, Observable, combineLatest, firstValueFrom, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import {
  Booking,
  Consultation,
  Diagnosis,
  LabRequest,
  Patient,
  Prescription,
  PrescriptionItem,
  VitalSigns,
  ClinicalRole
} from '../../../core/models';
import { CreatePatientVaccinationRequest } from '../../../core/models/vaccination.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { BookingService, DoctorCompleteBookingRequest } from '../../../core/services/booking.service';
import { AuditLogService } from '../../admin/services/audit-log.service';
import {
  MedicalRecordsService,
  MedicalRecordsState
} from '../../../core/services/medical-records.service';
import { PatientStateService } from '../../../core/services/patient-state.service';
import { PatientVaccinationsService } from '../../../core/services/patient-vaccinations.service';
import { PatientClinicalHistoryService } from '../../../core/services/patient-clinical-history.service';
import { OfflineConsultationQueueService } from '../../../core/services/offline-consultation-queue.service';
import { DrugInteractionService } from '../../../core/services/drug-interaction.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { FollowUpDraftView } from '../components/follow-up-form/follow-up-form.component';
import { LabRequestDraftView } from '../components/lab-request-form/lab-request-form.component';
import { SoapFormValue } from '../components/soap-form/soap-form.component';
import { PatientIdentityStripComponent } from './components/patient-identity-strip.component';
import { AllergyConfirmationState } from './components/allergy-badge.component';
import { buildPatientAvatarStyle } from './components/patient-avatar.util';
import { DoctorService } from '../services/doctor.service';
import { ConsultationSummaryComponent } from './components/consultation-summary.component';
import { SoapLastVisitModalComponent } from './components/soap-last-visit-modal.component';
import {
  ConsultationCompleteModalComponent,
  ConsultationChecklistItem,
  ConsultationSummaryLine
} from './components/consultation-complete-modal.component';
import {
  ConsultationHeaderComponent,
  ConsultationHeaderMode
} from './components/consultation-header.component';
import {
  ProfessionalFeePaymentMode
} from './components/professional-fee-decision-form.component';
import { ConsultationOverviewComponent } from './components/consultation-overview.component';
import { ConsultationWorkspaceComponent } from './components/consultation-workspace.component';
import { ConsultationPageVm } from './doctor-consultation.types';
import { PatientMediaPanelComponent } from '../../../shared/components/patient-media-panel/patient-media-panel.component';
import { PatientClinicalHistoryDto } from '../../../core/models/patient-clinical-history.models';
import { PatientClinicalHistoryDrawerComponent } from './components/patient-clinical-history-drawer.component';
import { resolveClinicalRole } from '../../../core/utils/clinical-role.util';
import {
  ConsultationRecordResponse,
  ConsultationRecordUpdateRequest
} from '../../../core/services/booking.service';

type NullableString = string | null | undefined;

interface PatientDto {
  id: string;
  patientCode?: NullableString;
  firstName?: NullableString;
  middleName?: NullableString;
  lastName?: NullableString;
  dateOfBirth?: NullableString;
  sex?: NullableString;
  civilStatus?: NullableString;
  address?: NullableString;
  city?: NullableString;
  zipCode?: NullableString;
  contactNumber?: NullableString;
  email?: NullableString;
  emergencyContactName?: NullableString;
  emergencyContactNumber?: NullableString;
  emergencyContactRelationship?: NullableString;
  bloodType?: NullableString;
  philHealthNumber?: NullableString;
  hmoProvider?: NullableString;
  hmoCardNumber?: NullableString;
  userId?: NullableString;
  isEmailVerified?: boolean | null;
  isGuest?: boolean | null;
  consentedAt?: NullableString;
  consentVersion?: NullableString;
}

const EMPTY_RECORDS: MedicalRecordsState = {
  consultations: [],
  prescriptions: [],
  allergies: [],
  labRequests: [],
  labResults: [],
  vaccinations: [],
  followUps: [],
  isLoading: false,
  error: null
};

interface ConsultationLocalDraft {
  bookingId: string;
  savedAt: string;
  soap: SoapFormValue;
  vitalsValue: VitalSigns | null;
  diagnoses: Diagnosis[];
  prescriptionItems: PrescriptionItem[];
  labRequests: LabRequestDraftView[];
  followUpValue: FollowUpDraftView | null;
  pendingVaccinations: CreatePatientVaccinationRequest[];
  professionalFeeAmount: number;
  professionalFeePaymentMode: ProfessionalFeePaymentMode;
  professionalFeeNotes: string;
  isProfessionalFeeWaived: boolean;
  finalAmount: number;
  professionalFeeWaivedReason: string;
}

type ConsultationInteractionMode = 'complete' | 'view' | 'amend';

interface ConsultationHistoryEntry {
  timestamp: string;
  editorName: string;
  editorRole: string;
  section: string;
  detail: string;
  action: string;
  tone: 'default' | 'amendment';
  sectionKey: 'soap' | 'diagnosis' | 'prescription' | 'lab-orders' | 'vaccinations' | 'followup' | 'pf-decision' | 'general';
}

type ProgressSectionId =
  | 'section-soap'
  | 'section-vitals'
  | 'section-diagnosis'
  | 'section-prescription'
  | 'section-lab-orders'
  | 'section-followup'
  | 'section-pf-decision';

@Component({
  standalone: true,
  selector: 'app-doctor-consultation-page',
  imports: [
    AsyncPipe, DatePipe, NgIf, RouterLink,
    NgClass,
    NgFor,
    NgStyle,
    EmptyStateComponent,
    ConsultationOverviewComponent,
    ConsultationSummaryComponent,
    ConsultationWorkspaceComponent,
    PatientClinicalHistoryDrawerComponent,
    PatientIdentityStripComponent,
    PatientMediaPanelComponent,
    StatusBadgeComponent
  ],
  template: `
    <ng-container *ngIf="vm$ | async as vm; else notFound">
      <div class="cr">
        <!-- ===== VIEW MODE: Completed consultation, compact header + summary body ===== -->
        <ng-container *ngIf="isCompletedConsultation(vm) && !isAmendMode; else editMode">
          <div class="cvh">
            <div class="cvh__top">
              <a class="cvh__back" routerLink="/doctor/appointments">&larr; Back to Appointments</a>
              <div class="cvh__actions">
                <button class="cr-btn cr-btn--secondary" type="button" (click)="openHistoryDrawer(vm)">History</button>
                <div class="cvh__finalized">
                  <span class="cvh__finalized-badge">COMPLETED</span>
                  <span class="cvh__finalized-meta">{{ getCompletionStatusText(vm) }}</span>
                </div>
                <button class="cr-btn cr-btn--secondary cvh__modify" type="button" (click)="enterAmendMode(vm)">
                  <i class="ti ti-pencil"></i>
                  Edit Consultation
                </button>
              </div>
            </div>
            <div class="cvh__main">
              <div class="cvh__identity">
                <div class="cvh__avatar" [ngStyle]="getPatientAvatarStyle(vm.patient)">
                  {{ (vm.patient.firstName?.charAt(0) || '?') }}{{ (vm.patient.lastName?.charAt(0) || '') }}
                </div>
                <div class="cvh__patient">
                  <strong>{{ vm.patient.firstName }} {{ vm.patient.lastName }}</strong>
                  <span>{{ vm.patient.sex || '--' }} &middot; {{ vm.patient.dateOfBirth ? (calcAge(vm.patient.dateOfBirth) + ' yrs') : '--' }}</span>
                  <span class="cvh__patient-line">{{ vm.booking.serviceNames?.join(', ') || vm.booking.serviceName || 'Service' }}</span>
                </div>
              </div>
              <div class="cvh__meta-cluster">
                <div class="cvh__meta-label">Visit Metadata</div>
                <div class="cvh__meta">
                  <div class="cvh__tag">
                    <span class="cvh__tag-label">Date</span>
                    <span class="cvh__tag-value">{{ vm.booking.appointmentDate | date:'MMMM d, y (EEE)' }}</span>
                  </div>
                  <div class="cvh__tag">
                    <span class="cvh__tag-label">Time</span>
                    <span class="cvh__tag-value">{{ vm.booking.slotStartTime }} - {{ vm.booking.slotEndTime }}</span>
                  </div>
                  <div class="cvh__tag">
                    <span class="cvh__tag-label">Queue</span>
                    <span class="cvh__tag-value">#{{ vm.booking.queueNumber ?? '--' }}</span>
                  </div>
                  <div class="cvh__tag">
                    <span class="cvh__tag-label">Fee</span>
                    <span class="cvh__tag-value">PHP {{ vm.booking.consultationFeeSnapshot ?? vm.booking.totalFee ?? 0 }}</span>
                  </div>
                  <div class="cvh__tag">
                    <span class="cvh__tag-label">Payment</span>
                    <span class="cvh__tag-value">{{ vm.booking.paymentMode || '--' }} &middot; <app-status-badge [status]="vm.booking.paymentStatus || 'Unpaid'"></app-status-badge></span>
                  </div>
                  <div class="cvh__tag" *ngIf="vm.allergies.length > 0">
                    <span class="cvh__tag-label">Allergies</span>
                    <span class="cvh__tag-value">{{ vm.allergies.length }} recorded</span>
                  </div>
                  <div class="cvh__tag" *ngIf="existingConditions(vm).length > 0">
                    <span class="cvh__tag-label">Conditions</span>
                    <span class="cvh__tag-value">{{ existingConditions(vm).slice(0,2).join(', ') }}{{ existingConditions(vm).length > 2 ? '...' : '' }}</span>
                  </div>
                  <div class="cvh__tag" *ngIf="lastVisitDate(vm) as lv">
                    <span class="cvh__tag-label">Last Visit</span>
                    <span class="cvh__tag-value">{{ lv | date:'MMM d' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="cr-body cr-body--view">
            <app-consultation-summary
              class="cr-summary-fill"
              [vm]="vm"
            ></app-consultation-summary>
          </div>
        </ng-container>

        <!-- ===== EDIT / AMEND MODE: Existing layout with sidebar ===== -->
        <ng-template #editMode>
          <div class="cr-top">
            <div class="cr-hdr">
              <div class="cr-hdr__left">
                <h1 class="cr-hdr__title">Consultation Room{{ isViewOnlyConsultation(vm) && !isAmendMode ? ' (View Only)' : '' }}</h1>
                <p class="cr-hdr__sub">{{ vm.patient.firstName || 'Patient' }} {{ vm.patient.lastName || '' }} &middot; {{ vm.booking.appointmentDate | date:'MMMM d, y (EEE)' }} &middot; Queue #{{ vm.booking.queueNumber ?? '--' }}</p>
              </div>
              <div class="cr-hdr__right">
                <ng-container *ngIf="isCompletedConsultation(vm); else activeActions">
                  <div class="cr-complete-pill">
                    <span class="cr-complete-pill__badge">COMPLETED</span>
                    <span class="cr-complete-pill__meta">{{ getCompletionStatusText(vm) }}</span>
                  </div>
                  <button class="cr-btn cr-btn--secondary" type="button" (click)="openHistoryDrawer(vm)">History</button>
                  <div class="cr-save-state" [class.cr-save-state--editing]="isAmendMode" [ngClass]="!isAmendMode ? 'cr-save-state--' + saveState : ''">
                    <ng-container *ngIf="!isAmendMode; else editingState">
                      <span class="cr-save-state__icon" *ngIf="saveState === 'saved'"></span>
                      <span class="cr-save-state__icon cr-save-state__icon--spinner" *ngIf="saveState === 'saving'"></span>
                      <span class="cr-save-state__icon" *ngIf="saveState === 'unsaved'"></span>
                      <span class="cr-save-state__icon" *ngIf="saveState === 'failed'"></span>
                    </ng-container>
                    <ng-template #editingState>
                      <span class="cr-save-state__icon cr-save-state__icon--editing"><i class="ti ti-pencil"></i></span>
                    </ng-template>
                    <span class="cr-save-state__label">{{ getSaveStateLabel() }}</span>
                  </div>
                  <button *ngIf="!isAmendMode" class="cr-btn cr-btn--secondary cvh__modify" type="button" (click)="enterAmendMode(vm)">
                    <i class="ti ti-pencil"></i>
                    Edit Consultation
                  </button>
                  <button *ngIf="isAmendMode" class="cr-btn cr-btn--primary" (click)="saveAmendment(vm)" [disabled]="isSavingAmendment">
                    {{ isSavingAmendment ? 'Saving...' : 'Save Changes' }}
                  </button>
                  <button *ngIf="isAmendMode" class="cr-btn cr-btn--outline" type="button" (click)="cancelAmendMode()">
                    Cancel
                  </button>
                  <div class="cr-cancel-prompt" *ngIf="editCancelPromptOpen">
                    <span>Discard unsaved changes?</span>
                    <div class="cr-cancel-prompt__actions">
                      <button type="button" class="cr-btn cr-btn--secondary" (click)="keepEditing()">Keep Editing</button>
                      <button type="button" class="cr-btn cr-btn--outline" (click)="discardEditChanges(vm)">Discard Changes</button>
                    </div>
                  </div>
                </ng-container>
                <ng-template #activeActions>
                  <app-status-badge [status]="vm.booking.status"></app-status-badge>
                  <a class="cr-btn" routerLink="/doctor/appointments">Back to Appointments</a>
                  <button class="cr-btn cr-btn--primary" (click)="saveDraft(vm)" [disabled]="isWorkspaceLocked(vm) || isSavingDraft || isAutosaving">{{ getDraftButtonLabel() }}</button>
                  <span class="cr-complete-wrap" [attr.title]="getCompleteTooltip(vm)">
                    <button
                      *ngIf="currentClinicalRole === 'physician'"
                      class="cr-btn cr-btn--complete"
                      [class.cr-btn--complete--ready]="!isCompleteActionDisabled(vm)"
                      (click)="requestCompletion(vm)"
                      [disabled]="isCompleteActionDisabled(vm)"
                    >
                      Complete Consultation
                    </button>
                    <span *ngIf="currentClinicalRole !== 'physician'" class="cr-complete-wrap__message">
                      Consultation can only be completed by the attending physician.
                    </span>
                  </span>
                </ng-template>
              </div>
            </div>

            <div class="cr-network-banner" *ngIf="!isNetworkOnline || networkBannerMessage">
              <i class="ti" [ngClass]="isNetworkOnline ? 'ti-wifi' : 'ti-wifi-off'"></i>
              <span>{{ networkBannerMessage || 'You are offline — Changes are being saved locally and will sync when reconnected.' }}</span>
              <button type="button" class="cr-network-banner__retry" *ngIf="networkSyncFailed" (click)="retrySync()">Retry sync</button>
            </div>

              <div class="cr-patient" id="patient-identity-card">
              <div class="cr-avatar" [ngStyle]="getPatientAvatarStyle(vm.patient)">{{ (vm.patient.firstName?.charAt(0) || '?') }}{{ (vm.patient.lastName?.charAt(0) || '') }}</div>
                <div class="cr-patient__info">
                  <strong>{{ vm.patient.firstName }} {{ vm.patient.lastName }}</strong>
                  <span>{{ vm.patient.sex || '--' }} &middot; {{ vm.patient.dateOfBirth ? (calcAge(vm.patient.dateOfBirth) + ' yrs') : '--' }}</span>
                  <span>{{ vm.booking.serviceNames?.join(', ') || vm.booking.serviceName || 'Service' }}</span>
              </div>
              <div class="cr-patient__meta">
                <div><span class="ml">Fee</span><span class="mv">PHP {{ vm.booking.consultationFeeSnapshot ?? vm.booking.totalFee ?? 0 }}</span></div>
                <div><span class="ml">Mode</span><span class="mv">{{ vm.booking.paymentMode || '--' }}</span></div>
                <div><span class="ml">Payment</span><app-status-badge [status]="vm.booking.paymentStatus || 'Unpaid'"></app-status-badge></div>
              </div>
            </div>
          </div>

          <app-patient-identity-strip
            *ngIf="showStickyIdentityStrip"
            [patient]="vm.patient"
            [booking]="vm.booking"
            [allergies]="vm.allergies"
            [allergyConfirmationState]="getAllergyConfirmationState(vm)"
            [expanded]="identityStripExpanded"
            (historyClick)="openPatientClinicalHistory(vm)"
          ></app-patient-identity-strip>

          <nav class="cr-mobile-tabs" aria-label="Consultation sections">
            <a
              *ngFor="let sectionId of mobileSectionIds"
              [href]="'#' + sectionId"
              class="cr-mobile-tabs__item"
              [class.active]="isStepActive(sectionId)"
              [class.done]="getProgressStepState(sectionId, vm) === 'complete'"
              [class.warning]="getProgressStepState(sectionId, vm) === 'warning'"
              (click)="scrollToSection(sectionId, $event)"
            >
              <span>{{ getMobileTabLabel(sectionId) }}</span>
              <i class="cr-mobile-tabs__dot" aria-hidden="true"></i>
            </a>
          </nav>

          <div class="cr-edit-banner" *ngIf="isAmendMode">
            <i class="ti ti-pencil"></i>
            <span>You are editing a completed consultation. Click Save Changes to apply your edits.</span>
          </div>
          <div class="cr-edit-error" *ngIf="editSaveErrorMessage">
            <span>{{ editSaveErrorMessage }}</span>
            <button type="button" (click)="saveAmendment(vm)" [disabled]="isSavingAmendment">{{ isSavingAmendment ? 'Saving...' : 'Retry' }}</button>
          </div>

          <div class="cr-body" role="main">
            <div class="cr-workspace">
              <app-consultation-overview
                [patient]="vm.patient"
                [consultation]="vm.consultation"
                [existingPrescription]="vm.existingPrescription"
                [allergies]="vm.allergies"
                [followUps]="vm.followUps"
                [recentConsultations]="vm.recentConsultations"
              ></app-consultation-overview>

              <div class="cr-section">
                <app-consultation-workspace
                  [vm]="vm"
                  [locked]="isWorkspaceLocked(vm)"
                  [clinicalRole]="currentClinicalRole"
                  [prescriptionItems]="prescriptionItems"
                  [professionalFee]="professionalFeeAmount"
                [professionalFeePaymentMode]="professionalFeePaymentMode"
                [professionalFeeNotes]="professionalFeeNotes"
                [pendingVaccinations]="pendingVaccinations"
                [validationRequested]="editValidationRequested"
                (vitalSignsChange)="onVitalsChange($event)"
                (vitalsValidityChange)="vitalsValid = $event"
                (soapChange)="onSoapChange($event)"
                  (soapValidityChange)="soapValid = $event"
                  (diagnosesChange)="onDiagnosesChange($event)"
                  (diagnosisValidityChange)="diagnosisValid = $event"
                  (prescriptionItemsChange)="onPrescriptionItemsChange($event)"
                  (labRequestsChange)="onLabRequestsChange($event)"
                  (followUpChange)="onFollowUpChange($event)"
                  (professionalFeeChange)="professionalFeeAmount = $event"
                  (professionalFeePaymentModeChange)="professionalFeePaymentMode = $event"
                  (professionalFeeNotesChange)="professionalFeeNotes = $event"
                  (professionalFeeValidityChange)="pfDecisionValid = $event"
                  (vaccinationsAdded)="onVaccinationsAdded($event)"
                  (loadFromLastVisit)="openLastVisitSoap(vm)"
                  (requestPrescription)="requestAttendingPhysician('prescription', vm)"
                  (requestLabOrder)="requestAttendingPhysician('lab-order', vm)"
                ></app-consultation-workspace>
              </div>
            </div>

            <button
              type="button"
              class="cr-progress-toggle"
              (click)="toggleProgressSidebar()"
              [attr.aria-expanded]="progressSidebarOpen"
              aria-label="Toggle consultation progress"
            >
              <i class="ti ti-progress"></i>
            </button>

            <div class="cr-side" [class.is-open]="progressSidebarOpen" role="navigation" aria-label="Consultation sections">
              <div class="cr-side-card">
                <div class="cr-progress-summary">
                  <div class="cr-progress-summary__label">
                    {{ getProgressSummaryLabel(vm) }}
                  </div>
                  <div class="cr-progress-summary__bar" [class.cr-progress-summary__bar--ready]="isCompletedConsultation(vm) && !isAmendMode" [class.cr-progress-summary__bar--editing]="isAmendMode">
                    <span class="cr-progress-summary__fill" [style.width.%]="getProgressPercent(vm)"></span>
                  </div>
                </div>
                <h3>Consultation Progress</h3>
                <ul class="cr-progress">
                  <li class="cr-progress__item"
                      [class.warning]="getProgressStepState('section-soap', vm) === 'warning'"
                      [class.done]="getProgressStepState('section-soap', vm) === 'complete'"
                      [class.active]="isStepActive('section-soap')">
                    <a href="#section-soap" (click)="scrollToSection('section-soap', $event)">
                      <span class="cr-progress__icon">{{ getProgressStepIcon('section-soap', vm) }}</span>
                      <span class="cr-progress__label">Notes &amp; SOAP</span>
                    </a>
                  </li>
                  <li class="cr-progress__item"
                      [class.warning]="getProgressStepState('section-vitals', vm) === 'warning'"
                      [class.done]="getProgressStepState('section-vitals', vm) === 'complete'"
                      [class.active]="isStepActive('section-vitals')">
                    <a href="#section-vitals" (click)="scrollToSection('section-vitals', $event)">
                      <span class="cr-progress__icon">{{ getProgressStepIcon('section-vitals', vm) }}</span>
                      <span class="cr-progress__label">Vitals</span>
                    </a>
                  </li>
                  <li class="cr-progress__item"
                      [class.warning]="getProgressStepState('section-diagnosis', vm) === 'warning'"
                      [class.done]="getProgressStepState('section-diagnosis', vm) === 'complete'"
                      [class.active]="isStepActive('section-diagnosis')">
                    <a href="#section-diagnosis" (click)="scrollToSection('section-diagnosis', $event)">
                      <span class="cr-progress__icon">{{ getProgressStepIcon('section-diagnosis', vm) }}</span>
                      <span class="cr-progress__label">Diagnosis</span>
                    </a>
                  </li>
                  <li class="cr-progress__item"
                      [class.warning]="getProgressStepState('section-prescription', vm) === 'warning'"
                      [class.done]="getProgressStepState('section-prescription', vm) === 'complete'"
                      [class.active]="isStepActive('section-prescription')">
                    <a href="#section-prescription" (click)="scrollToSection('section-prescription', $event)">
                      <span class="cr-progress__icon">{{ getProgressStepIcon('section-prescription', vm) }}</span>
                      <span class="cr-progress__label">Prescription</span>
                    </a>
                  </li>
                  <li class="cr-progress__item"
                      [class.warning]="getProgressStepState('section-lab-orders', vm) === 'warning'"
                      [class.done]="getProgressStepState('section-lab-orders', vm) === 'complete'"
                      [class.active]="isStepActive('section-lab-orders')">
                    <a href="#section-lab-orders" (click)="scrollToSection('section-lab-orders', $event)">
                      <span class="cr-progress__icon">{{ getProgressStepIcon('section-lab-orders', vm) }}</span>
                      <span class="cr-progress__label">Lab Orders</span>
                    </a>
                  </li>
                  <li class="cr-progress__item"
                      [class.warning]="getProgressStepState('section-followup', vm) === 'warning'"
                      [class.done]="getProgressStepState('section-followup', vm) === 'complete'"
                      [class.active]="isStepActive('section-followup')">
                    <a href="#section-followup" (click)="scrollToSection('section-followup', $event)">
                      <span class="cr-progress__icon">{{ getProgressStepIcon('section-followup', vm) }}</span>
                      <span class="cr-progress__label">Follow-up</span>
                    </a>
                  </li>
                  <li *ngIf="currentClinicalRole !== 'nurse' && currentClinicalRole !== 'medical_assistant'" class="cr-progress__item"
                      [class.warning]="getProgressStepState('section-pf-decision', vm) === 'warning'"
                      [class.done]="getProgressStepState('section-pf-decision', vm) === 'complete'"
                      [class.active]="isStepActive('section-pf-decision')">
                    <a href="#section-pf-decision" (click)="scrollToSection('section-pf-decision', $event)">
                      <span class="cr-progress__icon">{{ getProgressStepIcon('section-pf-decision', vm) }}</span>
                      <span class="cr-progress__label">PF Decision</span>
                    </a>
                  </li>
                </ul>
              </div>

              <div class="cr-side-card">
                <h3>Patient Uploads</h3>
                <app-patient-media-panel kind="document" [patientId]="vm.patient.id" [filterByBooking]="false" [allowUpload]="false" heading="Documents" subheading="Referrals, certificates, and files."></app-patient-media-panel>
                <app-patient-media-panel kind="lab-result" [patientId]="vm.patient.id" [filterByBooking]="false" [allowUpload]="false" heading="Lab Results" headingIcon="ti ti-upload" subheading="Files uploaded by the patient"></app-patient-media-panel>
              </div>
            </div>
            <div class="cr-side-backdrop" [class.is-visible]="progressSidebarOpen" (click)="closeProgressSidebar()"></div>
          </div>

          <div class="cr-mobile-actions">
            <ng-container *ngIf="isCompletedConsultation(vm) && !isAmendMode; else mobileActiveOrEdit">
              <button type="button" class="cr-mobile-actions__btn cr-mobile-actions__btn--outline cr-mobile-actions__btn--full" (click)="enterAmendMode(vm)">
                <i class="ti ti-pencil"></i>
                Edit Consultation
              </button>
            </ng-container>
            <ng-template #mobileActiveOrEdit>
              <ng-container *ngIf="isAmendMode; else mobileActiveActions">
                <button type="button" class="cr-mobile-actions__btn cr-mobile-actions__btn--outline cr-mobile-actions__btn--cancel" (click)="cancelAmendMode()">
                  Cancel
                </button>
                <button type="button" class="cr-mobile-actions__btn cr-mobile-actions__btn--primary cr-mobile-actions__btn--save" (click)="saveAmendment(vm)" [disabled]="isSavingAmendment">
                  {{ isSavingAmendment ? 'Saving...' : 'Save Changes' }}
                </button>
                <div class="cr-cancel-prompt cr-cancel-prompt--mobile" *ngIf="editCancelPromptOpen">
                  <span>Discard unsaved changes?</span>
                  <div class="cr-cancel-prompt__actions">
                    <button type="button" class="cr-btn cr-btn--secondary" (click)="keepEditing()">Keep Editing</button>
                    <button type="button" class="cr-btn cr-btn--outline" (click)="discardEditChanges(vm)">Discard Changes</button>
                  </div>
                </div>
              </ng-container>
            </ng-template>
            <ng-template #mobileActiveActions>
              <button type="button" class="cr-mobile-actions__btn cr-mobile-actions__btn--outline" (click)="saveDraft(vm)">
                Save Draft
              </button>
              <button *ngIf="currentClinicalRole === 'physician'" type="button" class="cr-mobile-actions__btn cr-mobile-actions__btn--primary" (click)="requestCompletion(vm)" [disabled]="isCompleteActionDisabled(vm)">
                Complete ▶
              </button>
              <button *ngIf="currentClinicalRole !== 'physician'" type="button" class="cr-mobile-actions__btn cr-mobile-actions__btn--primary" disabled>
                Physician Only
              </button>
            </ng-template>
          </div>
        </ng-template>

        <app-patient-clinical-history-drawer
          [isOpen]="clinicalHistoryDrawerOpen"
          [patientName]="clinicalHistoryPatientName"
          [history]="clinicalHistory"
          (close)="closeClinicalHistoryDrawer()"
        ></app-patient-clinical-history-drawer>

        <div class="shortcut-backdrop" *ngIf="shortcutsHelpOpen" (click)="shortcutsHelpOpen = false"></div>
        <section
          class="shortcut-modal"
          *ngIf="shortcutsHelpOpen"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcutsHelpTitle"
        >
          <div class="shortcut-modal__card">
            <div class="shortcut-modal__head">
              <h2 id="shortcutsHelpTitle">Keyboard Shortcuts</h2>
              <button type="button" class="shortcut-modal__close" (click)="shortcutsHelpOpen = false" aria-label="Close shortcuts help">×</button>
            </div>
            <table class="shortcut-table">
              <tr><th>Shortcut</th><th>Action</th></tr>
              <tr><td>Ctrl/Cmd + S</td><td>Save Draft</td></tr>
              <tr><td>Ctrl/Cmd + Enter</td><td>Open Complete Consultation flow</td></tr>
              <tr><td>Ctrl/Cmd + 1</td><td>Patient Summary</td></tr>
              <tr><td>Ctrl/Cmd + 2</td><td>Vitals</td></tr>
              <tr><td>Ctrl/Cmd + 3</td><td>SOAP</td></tr>
              <tr><td>Ctrl/Cmd + 4</td><td>Diagnosis</td></tr>
              <tr><td>Ctrl/Cmd + 5</td><td>Prescription</td></tr>
              <tr><td>Ctrl/Cmd + 6</td><td>Lab Orders</td></tr>
              <tr><td>Ctrl/Cmd + 7</td><td>Vaccinations</td></tr>
              <tr><td>Ctrl/Cmd + 8</td><td>Follow-up</td></tr>
              <tr><td>Esc</td><td>Close open overlays</td></tr>
              <tr><td>?</td><td>Open this help panel</td></tr>
            </table>
          </div>
        </section>

        <div class="history-drawer-backdrop" *ngIf="historyDrawerOpen" (click)="closeHistoryDrawer()"></div>
        <aside class="history-drawer" *ngIf="historyDrawerOpen" role="dialog" aria-modal="true" aria-label="Consultation Edit History">
          <div class="history-drawer__top">
            <div>
              <h2>Consultation Edit History</h2>
              <p>Chronological edit events for this visit.</p>
            </div>
            <button type="button" class="history-drawer__close" (click)="closeHistoryDrawer()">&times;</button>
          </div>

          <ng-container *ngIf="hasRealAuditHistory && historyEntries.length > 0; else emptyHistory">
            <ol class="history-list">
              <li class="history-item" [class.history-item--amendment]="entry.tone === 'amendment'" *ngFor="let entry of historyEntries">
                <div class="history-item__timestamp">{{ entry.timestamp | date : 'MMM d, y h:mm a' }}</div>
                <div class="history-item__meta">
                  <strong>{{ entry.editorName }}</strong>
                  <span>{{ entry.editorRole }}</span>
                </div>
                <div class="history-item__section">{{ entry.section }}</div>
                <p class="history-item__detail">{{ entry.detail }}</p>
              </li>
            </ol>
          </ng-container>

          <ng-template #emptyHistory>
            <div class="history-empty">No edits recorded yet for this consultation.</div>
          </ng-template>
        </aside>
      </div>
    </ng-container>

    <ng-template #notFound>
      <app-empty-state icon="document-text-outline" title="Consultation unavailable" description="This appointment is either missing or belongs to another doctor." ctaLabel="Back to Appointments" ctaRoute="/doctor/appointments"></app-empty-state>
    </ng-template>
  `,
  styleUrl: './doctor-consultation.page.scss'
})
export class DoctorConsultationPage implements AfterViewChecked, OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly authState = inject(AuthStateService);
  private readonly bookingService = inject(BookingService);
  private readonly auditLogService = inject(AuditLogService);
  private readonly doctorService = inject(DoctorService);
  private readonly medicalRecords = inject(MedicalRecordsService);
  private readonly modalCtrl = inject(ModalController);
  private readonly offlineQueue = inject(OfflineConsultationQueueService);
  private readonly patientClinicalHistoryService = inject(PatientClinicalHistoryService);
  private readonly drugInteractionService = inject(DrugInteractionService);
  private readonly supabase = inject(SupabaseService);
  private readonly patientState = inject(PatientStateService);
  private readonly vaccinationService = inject(PatientVaccinationsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly reloadSubject = new BehaviorSubject(0);

  private currentVm: ConsultationPageVm | null = null;
  currentClinicalRole: ClinicalRole = 'receptionist';
  private lastSavedDraftSnapshot = '';
  private lastAutosaveAt = 0;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private draftDirty = false;
  isNetworkOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  isProfessionalFeeWaived = false;
  completionFinalAmount = 0;
  completionWaivedReason = '';
  isSubmittingComplete = false;
  isSavingDraft = false;
  isAutosaving = false;
  isSavingAmendment = false;
  isAmendMode = false;
  editCancelPromptOpen = false;
  editValidationRequested = false;
  editSaveErrorMessage = '';
  private editModeSnapshot: ConsultationLocalDraft | null = null;
  completionValidationRequested = false;
  showStickyIdentityStrip = false;
  identityStripExpanded = false;
  activeSectionId: ProgressSectionId = 'section-soap';
  mobileSectionIds: ProgressSectionId[] = [
    'section-soap',
    'section-vitals',
    'section-diagnosis',
    'section-prescription',
    'section-lab-orders',
    'section-followup'
  ];
  progressSidebarOpen = false;
  saveState: 'saved' | 'saving' | 'unsaved' | 'failed' = 'saved';
  networkBannerMessage = '';
  networkSyncFailed = false;
  clinicalHistoryDrawerOpen = false;
  clinicalHistory: PatientClinicalHistoryDto | null | undefined = undefined;
  clinicalHistoryPatientName = 'Patient';
  shortcutsHelpOpen = false;

  currentConsultationFee = 0;
  professionalFeeAmount = 0;
  professionalFeePaymentMode: ProfessionalFeePaymentMode = 'Cash';
  professionalFeeNotes = '';

  soapValid = false;
  diagnosisValid = false;
  vitalsValid = true;
  pfDecisionValid = true;
  soapValue: SoapFormValue = {
    chiefComplaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  };
  vitalsValue: VitalSigns | null = null;
  diagnoses: Diagnosis[] = [];
  prescriptionItems: PrescriptionItem[] = [];
  labRequests: LabRequestDraftView[] = [];
  followUpValue: FollowUpDraftView | null = null;
  pendingVaccinations: CreatePatientVaccinationRequest[] = [];

  private sectionObserver: IntersectionObserver | null = null;
  private identityObserver: IntersectionObserver | null = null;
  private observersInitialized = false;
  historyDrawerOpen = false;
  historyEntries: ConsultationHistoryEntry[] = [];
  hasRealAuditHistory = false;

  readonly vm$ = combineLatest([
    this.route.paramMap.pipe(map((paramMap) => paramMap.get('bookingId') ?? '')),
    this.authState.currentUser$,
    this.reloadSubject
  ]).pipe(
    switchMap(([bookingId, user]) => {
      if (!bookingId || !user) {
        return of(null);
      }

      this.currentClinicalRole = resolveClinicalRole(user);

      return this.bookingService.getBookingById$(bookingId).pipe(
        switchMap((booking) => {
          if (!booking) {
            return of(null);
          }

          return combineLatest([
            of(booking),
            this.doctorService.getMyProfile().pipe(catchError(() => of(undefined))),
            this.resolvePatient$(booking)
          ]).pipe(
            switchMap(([resolvedBooking, doctor, patient]) => {
              if (!doctor || !patient || !this.isOwnedByLoggedInDoctor(resolvedBooking, doctor, user)) {
                return of(null);
              }

              if (this.isConsultationUnavailable(resolvedBooking.status)) {
                return of(null);
              }

              return this.medicalRecords.fetchPatientMedicalRecords(patient.id).pipe(
                catchError(() => of(EMPTY_RECORDS)),
                switchMap((records) =>
                  this.loadConsultationRecord$(resolvedBooking).pipe(
                    switchMap((consultationRecord) =>
                      this.loadVaccinations$(patient.id).pipe(
                        switchMap((apiVaccinations) =>
                          this.auditLogService.getAuditLogs().pipe(
                            catchError(() => of([])),
                            map((auditLogs) =>
                              this.buildVm({
                                booking: resolvedBooking,
                                patient,
                                doctor,
                                records: { ...records, vaccinations: apiVaccinations },
                                consultationRecord,
                                auditLogs
                              })
                            )
                          )
                        )
                      )
                    )
                  )
                )
              );
            })
          );
        })
      );
    })
  );

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('offline', this.handleNetworkOffline);
    window.addEventListener('online', this.handleNetworkOnline);
  }

  ngAfterViewChecked(): void {
    this.initializeObservers();
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      window.removeEventListener('offline', this.handleNetworkOffline);
      window.removeEventListener('online', this.handleNetworkOnline);
    }

    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }

    this.sectionObserver?.disconnect();
    this.identityObserver?.disconnect();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    const key = event.key;
    const isModifier = event.ctrlKey || event.metaKey;
    const isTypingTarget = this.isEditableTarget(event.target);

    if (key === '?') {
      event.preventDefault();
      this.shortcutsHelpOpen = true;
      return;
    }

    if (key === 'Escape') {
      this.shortcutsHelpOpen = false;
      this.progressSidebarOpen = false;
      this.clinicalHistoryDrawerOpen = false;
      this.historyDrawerOpen = false;
      return;
    }

    if (!isModifier) {
      return;
    }

    if (key.toLowerCase() === 's') {
      event.preventDefault();
      if (this.currentVm) {
        if (this.isAmendMode && this.isCompletedConsultation(this.currentVm)) {
          void this.saveAmendment(this.currentVm);
        } else {
          void this.saveDraft(this.currentVm);
        }
      }
      return;
    }

    if (key === 'Enter') {
      event.preventDefault();
      if (this.currentVm && this.isAmendMode && this.isCompletedConsultation(this.currentVm)) {
        void this.saveAmendment(this.currentVm);
        return;
      }

      if (this.currentVm && this.currentClinicalRole === 'physician') {
        this.requestCompletion(this.currentVm);
      }
      return;
    }

    if (isTypingTarget) {
      return;
    }

    const shortcutMap: Record<string, ProgressSectionId> = {
      '1': 'section-soap',
      '2': 'section-vitals',
      '3': 'section-soap',
      '4': 'section-diagnosis',
      '5': 'section-prescription',
      '6': 'section-lab-orders',
      '7': 'section-followup',
      '8': 'section-pf-decision'
    };

    const sectionId = shortcutMap[key];
    if (sectionId) {
      event.preventDefault();
      this.scrollToSection(sectionId);
    }
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
  }

  onVitalsChange(value: VitalSigns): void {
    this.vitalsValue = value;
    this.handleDraftMutation();
  }

  onSoapChange(value: SoapFormValue): void {
    this.soapValue = value;
    this.handleDraftMutation();
  }

  onDiagnosesChange(value: Diagnosis[]): void {
    this.diagnoses = value;
    this.handleDraftMutation();
  }

  onPrescriptionItemsChange(value: PrescriptionItem[]): void {
    this.prescriptionItems = value;
    this.handleDraftMutation();
  }

  onLabRequestsChange(value: LabRequestDraftView[]): void {
    this.labRequests = value;
    this.handleDraftMutation();
  }

  onFollowUpChange(value: FollowUpDraftView | null): void {
    this.followUpValue = value;
    this.handleDraftMutation();
  }

  onVaccinationsAdded(payloads: CreatePatientVaccinationRequest[]): void {
    this.pendingVaccinations = payloads;
    this.handleDraftMutation();
  }

  toggleProgressSidebar(): void {
    this.progressSidebarOpen = !this.progressSidebarOpen;
  }

  closeProgressSidebar(): void {
    this.progressSidebarOpen = false;
  }

  openLastVisitSoap(vm: ConsultationPageVm): void {
    const lastVisit = this.getLastVisitSoap(vm);
    if (!lastVisit) {
      return;
    }

    void this.openSoapHistoryModal(lastVisit);
  }

  openPatientClinicalHistory(vm: ConsultationPageVm): void {
    this.clinicalHistoryDrawerOpen = true;
    this.clinicalHistoryPatientName = [vm.patient.firstName, vm.patient.lastName].filter(Boolean).join(' ') || 'Patient';
    this.clinicalHistory = undefined;
    this.patientClinicalHistoryService.getPatientClinicalHistory(vm.patient.id).pipe(take(1)).subscribe((history) => {
      this.clinicalHistory = history;
    });
  }

  closeClinicalHistoryDrawer(): void {
    this.clinicalHistoryDrawerOpen = false;
  }

  async requestAttendingPhysician(kind: 'prescription' | 'lab-order', vm: ConsultationPageVm): Promise<void> {
    try {
      await firstValueFrom(
        this.apiService.post<{ ok: boolean }>('/consultation-requests/request-attending-physician', {
          bookingId: vm.booking.id,
          patientId: vm.patient.id,
          kind,
          requestedByRole: this.currentClinicalRole
        })
      );
      await this.presentToast(
        kind === 'prescription'
          ? 'Prescription request sent to the attending physician.'
          : 'Lab order request sent to the attending physician.',
        'success'
      );
    } catch (error) {
      await this.presentToast(extractApiErrorMessage(error, 'Could not send request to the attending physician.'), 'danger');
    }
  }

  private handleDraftMutation(): void {
    const currentSnapshot = this.createDraftSnapshot();
    this.draftDirty = currentSnapshot !== this.lastSavedDraftSnapshot;

    if (this.isAmendMode && this.currentVm && this.isCompletedConsultation(this.currentVm)) {
      return;
    }

    if (!this.draftDirty) {
      this.saveState = 'saved';
      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = null;
      }
      return;
    }

    if (!this.isNetworkOnline) {
      this.saveState = 'failed';
      this.networkBannerMessage = 'You are offline — Changes are being saved locally and will sync when reconnected.';
      void this.queueCurrentDraft('draft');
      return;
    }

    this.saveState = this.isAutosaving || this.isSavingDraft ? 'saving' : 'unsaved';
    void this.queueCurrentDraft('draft');
    this.scheduleAutosave();
  }

  private scheduleAutosave(): void {
    if (!this.draftDirty || !this.currentVm || this.isSavingDraft || this.isSubmittingComplete || this.isAmendMode) {
      return;
    }

    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }

    const now = Date.now();
    const earliestByTyping = now + 5000;
    const earliestByCadence = this.lastAutosaveAt ? this.lastAutosaveAt + 30000 : earliestByTyping;
    const targetTime = Math.max(earliestByTyping, earliestByCadence);
    const delay = Math.max(0, targetTime - now);

    this.autosaveTimer = setTimeout(() => {
      void this.performAutosave();
    }, delay);
  }

  private async performAutosave(): Promise<void> {
    if (!this.currentVm || !this.draftDirty) {
      return;
    }

    if (this.isAmendMode && this.currentVm && this.isCompletedConsultation(this.currentVm)) {
      return;
    }

    if (!this.isNetworkOnline) {
      this.saveState = 'failed';
      return;
    }

    this.isAutosaving = true;
    this.saveState = 'saving';
    try {
      await this.saveDraft(this.currentVm, true);
    } finally {
      this.isAutosaving = false;
    }
  }

  private handleBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (!this.draftDirty) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  };

  private handleNetworkOffline = (): void => {
    this.isNetworkOnline = false;
    this.networkBannerMessage = 'You are offline — Changes are being saved locally and will sync when reconnected.';
    this.networkSyncFailed = false;
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    if (this.draftDirty) {
      this.saveState = 'failed';
    }
  };

  private handleNetworkOnline = (): void => {
    this.isNetworkOnline = true;
    this.networkBannerMessage = 'Back online — syncing your changes...';
    this.networkSyncFailed = false;
    void this.syncQueuedDrafts();
    if (this.draftDirty && !this.isAmendMode) {
      void this.performAutosave();
    }
    window.setTimeout(() => {
      if (this.networkBannerMessage === 'Back online — syncing your changes...') {
        this.networkBannerMessage = '';
      }
    }, 3200);
  };

  async retrySync(): Promise<void> {
    this.networkSyncFailed = false;
    this.networkBannerMessage = 'Back online — syncing your changes...';
    await this.syncQueuedDrafts();
  }

  getSaveStateLabel(): string {
    if (this.isAmendMode && this.currentVm && this.isCompletedConsultation(this.currentVm)) {
      return 'Editing - save manually';
    }

    switch (this.saveState) {
      case 'saving':
        return 'Saving...';
      case 'unsaved':
        return 'Unsaved changes';
      case 'failed':
        return 'Autosave failed — click Save Draft';
      default:
        return 'All changes saved';
    }
  }

  getDraftButtonLabel(): string {
    if (this.isAmendMode && this.currentVm && this.isCompletedConsultation(this.currentVm)) {
      return 'Save Changes';
    }

    if (!this.isNetworkOnline) {
      return 'Saved Locally';
    }
    return this.isSavingDraft ? 'Saving...' : 'Save Draft';
  }

  private initializeObservers(): void {
    if (this.observersInitialized || typeof document === 'undefined') {
      return;
    }

    const patientCard = document.getElementById('patient-identity-card');
    const sectionIds = this.getVisibleProgressSectionIds();
    const sections = sectionIds
      .map((sectionId) => document.getElementById(sectionId))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!patientCard || sections.length !== sectionIds.length) {
      return;
    }

    this.identityObserver?.disconnect();
    this.sectionObserver?.disconnect();

    this.identityObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this.showStickyIdentityStrip = !entry.isIntersecting;
      },
      {
        threshold: [0.05, 0.2, 0.95]
      }
    );
    this.identityObserver.observe(patientCard);

    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          this.activeSectionId = visible.target.id as ProgressSectionId;
        }
      },
      {
        rootMargin: '-18% 0px -58% 0px',
        threshold: [0.1, 0.25, 0.5, 0.75]
      }
    );

    for (const section of sections) {
      this.sectionObserver.observe(section);
    }

    this.observersInitialized = true;
  }

  scrollToSection(sectionId: ProgressSectionId, event?: Event): void {
    event?.preventDefault();
    const element = typeof document !== 'undefined' ? document.getElementById(sectionId) : null;
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeSectionId = sectionId;
  }

  getCompleteTooltip(vm: ConsultationPageVm): string {
    if (this.currentClinicalRole !== 'physician') {
      return 'Consultation can only be completed by the attending physician.';
    }

    const missing = this.getMissingCompletionFields(vm);
    if (missing.length > 0) {
      return `Missing: ${missing.join(', ')}`;
    }

    if (this.isWorkspaceLocked(vm) || this.isSavingDraft) {
      return 'Consultation is currently locked.';
    }

    return 'Complete Consultation';
  }

  getProgressStepState(sectionId: ProgressSectionId, vm: ConsultationPageVm): 'empty' | 'progress' | 'complete' | 'warning' {
    if (this.isViewOnlyConsultation(vm)) {
      return 'complete';
    }

    const showWarning = this.completionValidationRequested && this.isSectionMissing(sectionId, vm);
    if (showWarning) {
      return 'warning';
    }

    switch (sectionId) {
      case 'section-soap': {
        const hasChiefComplaint = this.hasChiefComplaint();
        const hasAnySoap = this.hasAnySoapInput();
        if (hasChiefComplaint) return 'complete';
        if (hasAnySoap) return 'progress';
        return 'empty';
      }
      case 'section-vitals': {
        const hasRequired = this.hasRequiredVitals();
        const hasAny = this.hasAnyVitalsInput();
        if (hasRequired) return 'complete';
        if (hasAny) return 'progress';
        return 'empty';
      }
      case 'section-diagnosis':
        return this.diagnoses.length > 0 ? 'complete' : 'empty';
      case 'section-prescription':
        return this.prescriptionItems.length > 0 ? 'complete' : 'empty';
      case 'section-lab-orders':
        return this.labRequests.length > 0 ? 'complete' : 'empty';
      case 'section-followup':
        if (this.followUpValue?.followUpDate) return 'complete';
        if (this.followUpValue?.reason?.trim() || this.followUpValue?.reminderEnabled) return 'progress';
        return 'empty';
      case 'section-pf-decision':
        if (this.hasProfessionalFeeDecision()) return 'complete';
        if (this.professionalFeeNotes.trim().length > 0 || this.professionalFeeAmount > 0) return 'progress';
        return 'empty';
      default:
        return 'empty';
    }
  }

  getProgressStepIcon(sectionId: ProgressSectionId, vm: ConsultationPageVm): string {
    switch (this.getProgressStepState(sectionId, vm)) {
      case 'complete':
        return '✓';
      case 'progress':
        return '◑';
      case 'warning':
        return '⚠';
      default:
        return '○';
    }
  }

  getProgressStepLabel(sectionId: ProgressSectionId): string {
    switch (sectionId) {
      case 'section-soap':
        return 'Notes & SOAP';
      case 'section-vitals':
        return 'Vitals';
      case 'section-diagnosis':
        return 'Diagnosis';
      case 'section-prescription':
        return 'Prescription';
      case 'section-lab-orders':
        return 'Lab Orders';
      case 'section-followup':
        return 'Follow-up';
      case 'section-pf-decision':
        return 'PF Decision';
    }
  }

  getMobileTabLabel(sectionId: ProgressSectionId): string {
    switch (sectionId) {
      case 'section-soap':
        return 'Notes';
      case 'section-vitals':
        return 'Vitals';
      case 'section-diagnosis':
        return 'Diagnosis';
      case 'section-prescription':
        return 'Rx';
      case 'section-lab-orders':
        return 'Lab Orders';
      case 'section-followup':
        return 'Follow-up';
      case 'section-pf-decision':
        return 'PF Decision';
    }
  }

  isStepActive(sectionId: ProgressSectionId): boolean {
    return this.activeSectionId === sectionId;
  }

  private isSectionMissing(sectionId: ProgressSectionId, vm: ConsultationPageVm): boolean {
    switch (sectionId) {
      case 'section-soap':
        return !this.hasChiefComplaint();
      case 'section-vitals':
        return !this.hasRequiredVitals();
      case 'section-diagnosis':
        return this.diagnoses.length === 0;
      case 'section-prescription':
        return this.prescriptionItems.length === 0;
      case 'section-lab-orders':
        return this.labRequests.length === 0;
      case 'section-followup':
        return !this.followUpValue?.followUpDate;
      case 'section-pf-decision':
        return !this.hasProfessionalFeeDecision();
    }
  }

  private getMissingCompletionFields(vm: ConsultationPageVm): string[] {
    const missing: string[] = [];
    if (!this.hasChiefComplaint()) missing.push('Chief Complaint');
    if (this.diagnoses.length === 0) missing.push('At least one ICD-10 Diagnosis');
    if (!this.hasBloodPressure()) missing.push('Blood Pressure');
    if (!this.hasHeartRate()) missing.push('Heart Rate');
    return missing;
  }

  private hasChiefComplaint(): boolean {
    return this.soapValue.chiefComplaint.trim().length > 0;
  }

  private hasAnySoapInput(): boolean {
    return [
      this.soapValue.chiefComplaint,
      this.soapValue.subjective,
      this.soapValue.objective,
      this.soapValue.assessment,
      this.soapValue.plan
    ].some((value) => value.trim().length > 0);
  }

  private hasBloodPressure(): boolean {
    return this.hasNumberValue(this.vitalsValue?.bloodPressureSystolic) && this.hasNumberValue(this.vitalsValue?.bloodPressureDiastolic);
  }

  private hasHeartRate(): boolean {
    return this.hasNumberValue(this.vitalsValue?.heartRate);
  }

  private hasRequiredVitals(): boolean {
    return this.hasBloodPressure() && this.hasHeartRate();
  }

  private hasAnyVitalsInput(): boolean {
    const value = this.vitalsValue;
    if (!value) {
      return false;
    }

    return [
      value.bloodPressureSystolic,
      value.bloodPressureDiastolic,
      value.heartRate,
      value.respiratoryRate,
      value.temperatureCelsius,
      value.temperature,
      value.oxygenSaturation,
      value.weightKg,
      value.weight,
      value.heightCm,
      value.height,
      value.bmi,
      value.painScore
    ].some((entry) => this.hasNumberOrTextValue(entry));
  }

  private hasProfessionalFeeDecision(): boolean {
    return this.hasNumberValue(this.professionalFeeAmount) && this.professionalFeePaymentMode.length > 0;
  }

  private normalizeProfessionalFeePaymentMode(value: unknown): ProfessionalFeePaymentMode {
    const allowed: ProfessionalFeePaymentMode[] = ['Cash', 'Card', 'PayMClinic', 'HMO', 'Waived'];
    return allowed.includes(value as ProfessionalFeePaymentMode) ? (value as ProfessionalFeePaymentMode) : 'Cash';
  }

  private hasNumberValue(value: number | string | null | undefined): boolean {
    if (value === null || value === undefined || value === '') {
      return false;
    }
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric);
  }

  private hasNumberOrTextValue(value: number | string | null | undefined): boolean {
    if (value === null || value === undefined || value === '') {
      return false;
    }
    return String(value).trim().length > 0;
  }

  getAllergyConfirmationState(vm: ConsultationPageVm): AllergyConfirmationState {
    const patient = vm.patient as ConsultationPageVm['patient'] & {
      allergyConfirmationState?: AllergyConfirmationState;
      allergiesConfirmedEmpty?: boolean;
    };

    if (patient.allergyConfirmationState) {
      return patient.allergyConfirmationState;
    }

    if (patient.allergiesConfirmedEmpty) {
      return 'confirmed-empty';
    }

    return null;
  }

  private buildCompletionChecklist(vm: ConsultationPageVm): ConsultationChecklistItem[] {
    const diagnosis = this.diagnoses[0];
    return [
      {
        label: 'Chief Complaint',
        complete: this.hasChiefComplaint(),
        detail: this.hasChiefComplaint() ? this.soapValue.chiefComplaint.trim() : 'Missing'
      },
      {
        label: 'Diagnosis',
        complete: this.diagnoses.length > 0,
        detail: diagnosis ? `${diagnosis.code || diagnosis.icd10Code || 'N/A'} - ${diagnosis.description}` : 'No diagnosis selected'
      },
      {
        label: 'Vitals',
        complete: this.hasRequiredVitals(),
        detail: this.hasRequiredVitals() ? 'Blood pressure and heart rate entered' : 'Blood pressure and heart rate required'
      },
      {
        label: `Prescriptions (${this.prescriptionItems.length})`,
        complete: this.prescriptionItems.length > 0,
        detail: this.prescriptionItems.length > 0 ? 'At least one prescription added' : 'No prescriptions added'
      },
      {
        label: `Lab Orders (${this.labRequests.length})`,
        complete: this.labRequests.length > 0,
        detail: this.labRequests.length > 0 ? 'At least one lab order added' : 'No lab orders added'
      },
      {
        label: 'Follow-up date',
        complete: Boolean(this.followUpValue?.followUpDate?.trim()),
        detail: this.followUpValue?.followUpDate ? this.followUpValue.followUpDate : 'No follow-up date set'
      },
      {
        label: 'PF Decision',
        complete: this.hasProfessionalFeeDecision(),
        detail: `PHP ${this.professionalFeeAmount || 0} · ${this.professionalFeePaymentMode}`
      }
    ];
  }

  private buildCompletionSummary(vm: ConsultationPageVm): ConsultationSummaryLine[] {
    return [
      {
        label: 'Diagnosis codes and descriptions',
        value:
          this.diagnoses.length > 0
            ? this.diagnoses.map((diagnosis) => `${diagnosis.code || diagnosis.icd10Code || 'N/A'} - ${diagnosis.description}`)
            : ['No diagnosis selected']
      },
      {
        label: 'Prescriptions added',
        value:
          this.prescriptionItems.length > 0
            ? this.prescriptionItems.map(
                (item) => `${item.medicineName} · ${item.dosageForm || 'N/A'} · ${item.frequency || item.sig || 'N/A'}`
              )
            : ['No prescriptions added']
      },
      {
        label: 'Lab orders placed',
        value:
          this.labRequests.length > 0
            ? this.labRequests.map((request) => `${request.testName}${request.reason ? ` · ${request.reason}` : ''}`)
            : ['No lab orders added']
      },
      {
        label: 'Follow-up date',
        value: this.followUpValue?.followUpDate?.trim() || 'Not set'
      },
      {
        label: 'Professional fee',
        value: `PHP ${this.isProfessionalFeeWaived ? 0 : this.professionalFeeAmount} (${this.professionalFeePaymentMode})`
      }
    ];
  }

  async saveDraft(vm: ConsultationPageVm, autosave = false): Promise<void> {
    if (this.isWorkspaceLocked(vm) || this.isSavingDraft || this.isAmendMode) {
      return;
    }

    this.isSavingDraft = !autosave;
    this.saveState = 'saving';
    try {
      this.writeLocalDraft(vm);
      this.currentVm = vm;
      const payload = this.buildConsultationRecordUpdatePayload();

      if (!this.isNetworkOnline) {
        await this.queueCurrentDraft('draft');
        this.lastSavedDraftSnapshot = this.createDraftSnapshot();
        this.lastAutosaveAt = Date.now();
        this.draftDirty = true;
        this.saveState = 'saved';
        if (!autosave) {
          void this.presentToast('Saved locally. Changes will sync when reconnected.', 'success');
        }
        return;
      }

      await firstValueFrom(this.bookingService.updateConsultationRecord(vm.booking.id, payload));
      await this.queueCurrentDraft('draft');
      await this.offlineQueue.clear(vm.booking.id);
      this.lastSavedDraftSnapshot = this.createDraftSnapshot();
      this.lastAutosaveAt = Date.now();
      this.draftDirty = false;
      this.saveState = 'saved';
      this.networkBannerMessage = 'All changes synced ✓';
      this.networkSyncFailed = false;
      window.setTimeout(() => {
        if (this.networkBannerMessage === 'All changes synced ✓') {
          this.networkBannerMessage = '';
        }
      }, 2200);
      if (!autosave) {
        void this.presentToast('Draft saved.', 'success');
      }
    } catch (error) {
      this.draftDirty = true;
      this.saveState = 'failed';
      this.networkSyncFailed = true;
      this.networkBannerMessage = 'Sync failed. Please retry syncing.';
      if (!autosave) {
        void this.presentToast(extractApiErrorMessage(error, 'Failed to save local draft.'), 'danger');
      }
    } finally {
      this.isSavingDraft = false;
      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = null;
      }
      if (this.draftDirty && this.isNetworkOnline && !autosave) {
        this.saveState = 'unsaved';
        this.scheduleAutosave();
      }
    }
  }

  private async openSoapHistoryModal(sourceSoap: SoapFormValue): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: SoapLastVisitModalComponent,
      componentProps: { soap: sourceSoap },
      cssClass: 'modal-default',
      backdropDismiss: false
    });

    await modal.present();
    const result = await modal.onDidDismiss<{ soap?: SoapFormValue }>();
    if (result.role === 'confirm' && result.data?.soap) {
      this.onSoapChange(result.data.soap);
    }
  }

  private async queueCurrentDraft(kind: 'draft' | 'complete'): Promise<void> {
    if (!this.currentVm || typeof navigator === 'undefined') {
      return;
    }

    try {
      await this.offlineQueue.enqueue({
        bookingId: this.currentVm.booking.id,
        createdAt: new Date().toISOString(),
        kind,
        payload: this.buildConsultationRecordUpdatePayload()
      });
    } catch (error) {
      console.warn('[DoctorConsultation] Failed to queue draft change', error);
    }
  }

  private async syncQueuedDrafts(): Promise<void> {
    if (!this.currentVm || !this.isNetworkOnline) {
      return;
    }

    try {
      await this.offlineQueue.flush(this.currentVm.booking.id, async () => {
        await firstValueFrom(
          this.bookingService.updateConsultationRecord(this.currentVm!.booking.id, this.buildConsultationRecordUpdatePayload())
        );
      });
      this.lastSavedDraftSnapshot = this.createDraftSnapshot();
      this.lastAutosaveAt = Date.now();
      this.draftDirty = false;
      this.networkBannerMessage = 'All changes synced ✓';
      this.networkSyncFailed = false;
      window.setTimeout(() => {
        if (this.networkBannerMessage === 'All changes synced ✓') {
          this.networkBannerMessage = '';
        }
      }, 2200);
    } catch (error) {
      this.networkSyncFailed = true;
      this.networkBannerMessage = 'Sync failed. Please retry syncing.';
      console.warn('[DoctorConsultation] Failed to sync offline changes', error);
    }
  }

  requestCompletion(vm: ConsultationPageVm): void {
    if (this.currentClinicalRole !== 'physician') {
      return;
    }

    if (this.isCompleteActionDisabled(vm)) {
      void this.presentToast(
        'Complete the chief complaint, diagnosis, and required vitals before completing.',
        'warning'
      );
      return;
    }

    this.completionValidationRequested = true;
    void this.openCompleteModal(vm);
  }

  async openCompleteModal(vm: ConsultationPageVm): Promise<void> {
    const booking = vm.booking;
    this.isSubmittingComplete = false;
    this.currentConsultationFee = booking.consultationFeeSnapshot ?? booking.totalFee ?? 0;
    this.completionFinalAmount = this.professionalFeeAmount;
    this.isProfessionalFeeWaived = this.professionalFeePaymentMode === 'Waived';
    this.completionWaivedReason = this.isProfessionalFeeWaived ? this.professionalFeeNotes.trim() : '';

    const modal = await this.modalCtrl.create({
      component: ConsultationCompleteModalComponent,
      componentProps: {
        patientName: [vm.patient.firstName, vm.patient.lastName].filter(Boolean).join(' ') || 'Patient',
        patientDob: vm.patient.dateOfBirth ? `DOB: ${this.formatDateForDisplay(vm.patient.dateOfBirth)}` : 'DOB: --',
        patientMrn: vm.patient.patientCode || vm.patient.id || 'Patient ID unavailable',
        visitDateTime: new Date(`${booking.appointmentDate}T${booking.slotStartTime}`).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }),
        checklistItems: this.buildCompletionChecklist(vm),
        summaryLines: this.buildCompletionSummary(vm),
        submitHandler: () => this.submitCompletion(booking)
      },
      cssClass: 'modal-default',
      backdropDismiss: false
    });

    await modal.present();
    await modal.onDidDismiss();
  }

  async submitCompletion(booking: Booking): Promise<boolean> {
    if (this.isSubmittingComplete) {
      return false;
    }

    this.isProfessionalFeeWaived = this.professionalFeePaymentMode === 'Waived';
    this.completionFinalAmount = this.isProfessionalFeeWaived ? 0 : this.professionalFeeAmount;
    this.completionWaivedReason = this.isProfessionalFeeWaived ? this.professionalFeeNotes.trim() : '';

    const finalAmount = this.completionFinalAmount;
    const professionalFeeWaivedReason = this.completionWaivedReason.trim();

    if (!this.isProfessionalFeeWaived && (!Number.isFinite(finalAmount) || finalAmount < 0)) {
      await this.presentToast('Enter a valid professional fee.', 'warning');
      return false;
    }

    if (this.isProfessionalFeeWaived && !professionalFeeWaivedReason) {
      await this.presentToast('A waived reason is required.', 'warning');
      return false;
    }

    const payload = this.buildDoctorCompletePayload(finalAmount, professionalFeeWaivedReason);

    this.isSubmittingComplete = true;

    try {
      await firstValueFrom(this.bookingService.doctorCompleteBooking(booking.id, payload));

      // Save pending vaccinations
      if (this.pendingVaccinations.length > 0) {
        await this.savePendingVaccinations(booking.patientId, booking);
      }

      this.clearLocalDraft(booking.id);
      this.resetCompletionModalState();
      this.reload();
      await this.presentToast('Consultation completed successfully.', 'success');
      const bookingId = this.route.snapshot.paramMap.get('bookingId') || booking.id;
      void this.router.navigate(['/doctor/appointments', bookingId]);
      return true;
    } catch (error) {
      await this.presentToast(extractApiErrorMessage(error, 'Failed to complete consultation.'), 'danger');
      return false;
    } finally {
      this.isSubmittingComplete = false;
    }
  }

  enterAmendMode(vm: ConsultationPageVm): void {
    if (!this.isCompletedConsultation(vm)) {
      return;
    }

    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }

    this.isAmendMode = true;
    this.isSavingAmendment = false;
    this.editCancelPromptOpen = false;
    this.editValidationRequested = false;
    this.editSaveErrorMessage = '';
    this.editModeSnapshot = this.captureEditSnapshot();
    this.saveState = 'saved';
  }

  cancelAmendMode(): void {
    if (this.isSavingAmendment) {
      return;
    }

    if (!this.isAmendMode) {
      return;
    }

    if (!this.hasEditChanges()) {
      this.exitAmendMode(true);
      return;
    }

    this.editCancelPromptOpen = true;
  }

  keepEditing(): void {
    this.editCancelPromptOpen = false;
  }

  discardEditChanges(vm: ConsultationPageVm): void {
    if (this.editModeSnapshot) {
      this.restoreEditSnapshot(this.editModeSnapshot);
    }
    this.editValidationRequested = false;
    this.editSaveErrorMessage = '';
    this.editCancelPromptOpen = false;
    this.exitAmendMode(true);
    void vm;
  }

  async saveAmendment(vm: ConsultationPageVm): Promise<void> {
    if (!this.isAmendMode || this.isSavingAmendment || !this.isCompletedConsultation(vm)) {
      return;
    }

    this.editValidationRequested = true;
    this.editSaveErrorMessage = '';

    if (!this.hasChiefComplaint() || this.diagnoses.length === 0 || !this.hasRequiredVitals()) {
      await this.presentToast('Complete the required fields before saving changes.', 'warning');
      return;
    }

    const payload = this.buildConsultationRecordUpdatePayload();
    const changedSections = this.getAmendedSections();
    this.isSavingAmendment = true;

    try {
      await firstValueFrom(this.bookingService.updateConsultationRecord(vm.booking.id, payload));
      await this.recordConsultationAmendmentAuditLogs(vm, changedSections);
      this.clearLocalDraft(vm.booking.id);
      this.exitAmendMode(true);
      this.reload();
      await this.presentToast('Consultation amendment saved.', 'success');
    } catch (error) {
      this.editSaveErrorMessage = 'Save failed — please try again';
      await this.presentToast(extractApiErrorMessage(error, 'Failed to save consultation amendment.'), 'danger');
    } finally {
      this.isSavingAmendment = false;
    }
  }

  private exitAmendMode(resetSnapshot: boolean): void {
    this.isAmendMode = false;
    this.editCancelPromptOpen = false;
    this.editValidationRequested = false;
    this.editSaveErrorMessage = '';
    this.isSavingAmendment = false;
    if (resetSnapshot) {
      this.editModeSnapshot = null;
    }
  }

  private captureEditSnapshot(): ConsultationLocalDraft {
    return {
      bookingId: this.currentVm?.booking.id ?? '',
      savedAt: new Date().toISOString(),
      soap: { ...this.soapValue },
      vitalsValue: this.vitalsValue ? { ...this.vitalsValue } : null,
      diagnoses: this.diagnoses.map((diagnosis) => ({ ...diagnosis })),
      prescriptionItems: this.prescriptionItems.map((item) => ({ ...item })),
      labRequests: this.labRequests.map((request) => ({ ...request })),
      followUpValue: this.followUpValue ? { ...this.followUpValue } : null,
      pendingVaccinations: this.pendingVaccinations.map((payload) => ({ ...payload })),
      professionalFeeAmount: this.professionalFeeAmount,
      professionalFeePaymentMode: this.professionalFeePaymentMode,
      professionalFeeNotes: this.professionalFeeNotes,
      isProfessionalFeeWaived: this.isProfessionalFeeWaived,
      finalAmount: this.completionFinalAmount,
      professionalFeeWaivedReason: this.completionWaivedReason
    };
  }

  private restoreEditSnapshot(snapshot: ConsultationLocalDraft): void {
    this.soapValue = { ...snapshot.soap };
    this.vitalsValue = snapshot.vitalsValue ? { ...snapshot.vitalsValue } : null;
    this.diagnoses = snapshot.diagnoses.map((diagnosis) => ({ ...diagnosis }));
    this.prescriptionItems = snapshot.prescriptionItems.map((item) => ({ ...item }));
    this.labRequests = snapshot.labRequests.map((request) => ({ ...request }));
    this.followUpValue = snapshot.followUpValue ? { ...snapshot.followUpValue } : null;
    this.pendingVaccinations = snapshot.pendingVaccinations.map((payload) => ({ ...payload }));
    this.professionalFeeAmount = snapshot.professionalFeeAmount;
    this.professionalFeePaymentMode = snapshot.professionalFeePaymentMode;
    this.professionalFeeNotes = snapshot.professionalFeeNotes;
    this.isProfessionalFeeWaived = snapshot.isProfessionalFeeWaived;
    this.completionFinalAmount = snapshot.finalAmount;
    this.completionWaivedReason = snapshot.professionalFeeWaivedReason;
    this.lastSavedDraftSnapshot = this.createDraftSnapshot();
    this.draftDirty = false;
    this.saveState = 'saved';
  }

  private hasEditChanges(): boolean {
    if (!this.editModeSnapshot) {
      return false;
    }

    return JSON.stringify(this.captureEditSnapshot()) !== JSON.stringify(this.editModeSnapshot);
  }

  private getAmendedSections(): Array<'soap' | 'diagnosis' | 'prescription' | 'lab-orders' | 'vaccinations' | 'followup' | 'pf-decision'> {
    if (!this.editModeSnapshot) {
      return [];
    }

    const next = this.captureEditSnapshot();
    const sections: Array<'soap' | 'diagnosis' | 'prescription' | 'lab-orders' | 'vaccinations' | 'followup' | 'pf-decision'> = [];
    if (JSON.stringify(next.soap) !== JSON.stringify(this.editModeSnapshot.soap)) sections.push('soap');
    if (JSON.stringify(next.diagnoses) !== JSON.stringify(this.editModeSnapshot.diagnoses)) sections.push('diagnosis');
    if (JSON.stringify(next.prescriptionItems) !== JSON.stringify(this.editModeSnapshot.prescriptionItems)) sections.push('prescription');
    if (JSON.stringify(next.labRequests) !== JSON.stringify(this.editModeSnapshot.labRequests)) sections.push('lab-orders');
    if (JSON.stringify(next.pendingVaccinations) !== JSON.stringify(this.editModeSnapshot.pendingVaccinations)) sections.push('vaccinations');
    if (JSON.stringify(next.followUpValue) !== JSON.stringify(this.editModeSnapshot.followUpValue)) sections.push('followup');
    if (
      next.professionalFeeAmount !== this.editModeSnapshot.professionalFeeAmount ||
      next.professionalFeePaymentMode !== this.editModeSnapshot.professionalFeePaymentMode ||
      next.professionalFeeNotes !== this.editModeSnapshot.professionalFeeNotes ||
      next.isProfessionalFeeWaived !== this.editModeSnapshot.isProfessionalFeeWaived
    ) {
      sections.push('pf-decision');
    }
    return sections;
  }

  private async recordConsultationAmendmentAuditLogs(
    vm: ConsultationPageVm,
    sections: Array<'soap' | 'diagnosis' | 'prescription' | 'lab-orders' | 'vaccinations' | 'followup' | 'pf-decision'>
  ): Promise<void> {
    if (sections.length === 0) {
      return;
    }

    const performedBy = this.authState.snapshot?.fullName || vm.doctor.fullName || 'Doctor';
    const performedAt = new Date().toISOString();
    const details = `Fields changed: ${sections.map((section) => this.getSectionDisplayName(section)).join(', ')}`;

    try {
      await this.supabase.client.from('audit_logs').insert(
        sections.map((section) => ({
          entity_type: 'Consultation',
          entity_id: vm.consultation?.id || vm.booking.id,
          action: `Amended ${this.getSectionDisplayName(section)}`,
          performed_by: performedBy,
          performed_at: performedAt,
          details: `${details}; section=${section}`
        }))
      );
    } catch (error) {
      console.warn('[DoctorConsultation] Failed to record amendment audit log', error);
    }
  }

  private getSectionDisplayName(section: 'soap' | 'diagnosis' | 'prescription' | 'lab-orders' | 'vaccinations' | 'followup' | 'pf-decision'): string {
    switch (section) {
      case 'soap':
        return 'SOAP Notes';
      case 'diagnosis':
        return 'Diagnosis';
      case 'prescription':
        return 'Prescription';
      case 'lab-orders':
        return 'Order Labs';
      case 'vaccinations':
        return 'Vaccinations';
      case 'followup':
        return 'Follow-up';
      case 'pf-decision':
        return 'PF Decision';
    }
  }

  isCompleteActionDisabled(vm: ConsultationPageVm): boolean {
    return (
      this.isWorkspaceLocked(vm) ||
      this.isSavingDraft ||
      this.isSubmittingComplete ||
      !this.hasChiefComplaint() ||
      this.diagnoses.length === 0 ||
      !this.hasRequiredVitals()
    );
  }

  private canEditConsultation(vm: ConsultationPageVm): boolean {
    return vm.booking.status === 'CheckedIn' || vm.booking.status === 'InProgress';
  }

  isCompletedConsultation(vm: ConsultationPageVm): boolean {
    return vm.booking.status === 'Completed' || vm.consultation?.status === 'Completed' || vm.consultation?.status === 'Locked';
  }

  private isEditableConsultation(vm: ConsultationPageVm): boolean {
    return this.canEditConsultation(vm) || this.isAmendMode;
  }

  isWorkspaceLocked(vm: ConsultationPageVm): boolean {
    if (this.isAmendMode && this.isCompletedConsultation(vm)) {
      return false;
    }

    if (this.isCompletedConsultation(vm)) {
      return true;
    }

    return !this.isEditableConsultation(vm);
  }

  isAmendActionDisabled(vm: ConsultationPageVm): boolean {
    return (
      !this.isCompletedConsultation(vm) ||
      this.isSavingAmendment
    );
  }

  headerMode(vm: ConsultationPageVm): ConsultationHeaderMode {
    if (this.isCompletedConsultation(vm)) {
      return this.isAmendMode ? 'amend' : 'view';
    }

    return 'complete';
  }

  existingConditions(vm: ConsultationPageVm): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of vm.recentConsultations) {
      for (const d of c.diagnoses) {
        if (!seen.has(d.description)) {
          seen.add(d.description);
          result.push(d.description);
        }
      }
    }
    return result;
  }

  lastVisitDate(vm: ConsultationPageVm): string | null {
    return vm.recentConsultations[0]?.consultationDate || null;
  }

  calcAge(dob: string): number {
    if (!dob) return 0;
    const b = new Date(dob);
    const t = new Date();
    let a = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
    return a;
  }

  private formatDateForDisplay(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${month}/${day}/${date.getFullYear()}`;
  }

  private buildVm(args: {
    booking: Booking;
    patient: Patient;
    doctor: ConsultationPageVm['doctor'];
    records: MedicalRecordsState;
    consultationRecord: ConsultationRecordResponse | null;
    auditLogs: Array<{
      entityType: string;
      entityId: string;
      action: string;
      performedBy: string;
      performedAt: string;
      details?: string | undefined;
    }>;
  }): ConsultationPageVm {
    const localDraft = this.readLocalDraft(args.booking.id);
    this.currentConsultationFee = args.booking.consultationFeeSnapshot ?? args.booking.totalFee ?? 0;
    this.professionalFeeAmount = localDraft?.professionalFeeAmount ?? this.currentConsultationFee;
    this.professionalFeePaymentMode = this.normalizeProfessionalFeePaymentMode(localDraft?.professionalFeePaymentMode);
    this.professionalFeeNotes = localDraft?.professionalFeeNotes ?? '';
    this.isProfessionalFeeWaived = this.professionalFeePaymentMode === 'Waived';
    this.completionFinalAmount = this.isProfessionalFeeWaived ? 0 : this.professionalFeeAmount;
    this.completionWaivedReason = this.isProfessionalFeeWaived ? this.professionalFeeNotes : '';
    this.pendingVaccinations = localDraft?.pendingVaccinations?.length
      ? localDraft.pendingVaccinations.map((payload) => ({ ...payload }))
      : [];
    const consultation = this.mapConsultationRecord(
      args.consultationRecord,
      args.booking,
      args.records
    );
    const fallbackConsultation =
      consultation ?? args.records.consultations.find((item) => item.bookingId === args.booking.id) ?? null;
    const mergedConsultation = mergeConsultationWithDraft(fallbackConsultation, localDraft);
    const existingPrescription =
      localDraft?.prescriptionItems.length
        ? mergePrescriptionWithDraft(
            mergedConsultation?.prescriptions?.[0] ??
              args.records.prescriptions.find((item) => item.consultationId === mergedConsultation?.id) ??
              null,
            localDraft
          )
        : mergedConsultation?.prescriptions?.[0] ??
          args.records.prescriptions.find((item) => item.consultationId === mergedConsultation?.id) ??
          null;

    const vm: ConsultationPageVm = {
      booking: args.booking,
      patient: args.patient,
      doctor: args.doctor,
      consultation: mergedConsultation,
      soap: this.soapFromConsultation(mergedConsultation),
      existingPrescription,
      allergies: args.records.allergies.filter((item) => item.patientId === args.patient.id),
      labRequests:
        mergedConsultation?.labRequests ??
        args.records.labRequests.filter((item) =>
          mergedConsultation?.id ? item.consultationId === mergedConsultation.id : item.patientId === args.patient.id
        ),
      labResults: args.records.labResults.filter((item) => item.patientId === args.patient.id),
      vaccinations: args.records.vaccinations.filter((item) => item.patientId === args.patient.id),
      followUps: args.records.followUps.filter((item) => item.patientId === args.patient.id),
      labRequestDrafts:
        localDraft?.labRequests.length
          ? localDraft.labRequests.map((item) => ({ ...item }))
          : (mergedConsultation?.labRequests ?? []).map((request) => ({
              id: request.id,
              testName: request.testName,
              reason: request.reason
            })),
      followUpDraft:
        localDraft?.followUpValue ??
        (mergedConsultation?.followUpDate
          ? {
              id: `fu-${mergedConsultation.id}`,
              followUpDate: mergedConsultation.followUpDate,
              reason: '',
              reminderEnabled: false
            }
          : null),
      pendingVaccinations: this.pendingVaccinations.map((payload) => ({ ...payload })),
      recentConsultations: args.records.consultations
        .filter((item) => item.patientId === args.patient.id)
        .slice(0, 5)
    };

    this.currentVm = vm;
    this.historyEntries = this.buildHistoryEntries(vm, args.auditLogs);
    this.lastSavedDraftSnapshot = this.createDraftSnapshot();
    this.draftDirty = false;
    this.saveState = 'saved';
    this.lastAutosaveAt = Date.now();

    return vm;
  }

  private soapFromConsultation(consultation: Consultation | null): SoapFormValue {
    return {
      chiefComplaint: consultation?.chiefComplaint ?? '',
      subjective: consultation?.subjective ?? consultation?.historyOfPresentIllness ?? '',
      objective: consultation?.objective ?? consultation?.peGeneralFindings ?? '',
      assessment: consultation?.assessment ?? '',
      plan: consultation?.plan ?? ''
    };
  }

  private getLastVisitSoap(vm: ConsultationPageVm): SoapFormValue | null {
    const last = vm.recentConsultations[0];
    if (!last) {
      return null;
    }

    return {
      chiefComplaint: last.chiefComplaint ?? '',
      subjective: last.subjective ?? last.historyOfPresentIllness ?? '',
      objective: last.objective ?? last.peGeneralFindings ?? '',
      assessment: last.assessment ?? '',
      plan: last.plan ?? ''
    };
  }

  getPatientAvatarStyle(patient: Patient): Record<string, string> {
    const fullName = [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ') || patient.id || 'Patient';
    return buildPatientAvatarStyle(fullName);
  }

  isViewOnlyConsultation(vm: ConsultationPageVm): boolean {
    return this.isCompletedConsultation(vm) || vm.consultation?.status === 'Locked';
  }

  getVisibleProgressSectionIds(): ProgressSectionId[] {
    return this.currentClinicalRole === 'nurse' || this.currentClinicalRole === 'medical_assistant'
      ? [
          'section-soap',
          'section-vitals',
          'section-diagnosis',
          'section-prescription',
          'section-lab-orders',
          'section-followup'
        ]
      : [
          'section-soap',
          'section-vitals',
          'section-diagnosis',
          'section-prescription',
          'section-lab-orders',
          'section-followup',
          'section-pf-decision'
        ];
  }

  getCompletedSectionCount(vm: ConsultationPageVm): number {
    if (this.isCompletedConsultation(vm)) {
      return this.getVisibleProgressSectionIds().length;
    }

    return this.getVisibleProgressSectionIds().filter((sectionId) => this.getProgressStepState(sectionId, vm) === 'complete').length;
  }

  getProgressPercent(vm: ConsultationPageVm): number {
    if (this.isCompletedConsultation(vm)) {
      return 100;
    }

    const total = this.getVisibleProgressSectionIds().length || 1;
    return Math.round((this.getCompletedSectionCount(vm) / total) * 100);
  }

  getProgressSummaryLabel(vm: ConsultationPageVm): string {
    if (this.isCompletedConsultation(vm)) {
      return this.isAmendMode ? 'Editing in progress...' : 'Consultation complete ✓';
    }

    const complete = this.getCompletedSectionCount(vm);
    const total = this.getVisibleProgressSectionIds().length;
    return complete === total ? 'Ready to complete ✓' : `${complete} of ${total} sections complete`;
  }

  getCompletionStatusText(vm: ConsultationPageVm): string {
    const completionSource = vm.booking.doctorCompletedAt || vm.consultation?.updatedAt || vm.booking.createdAt;
    const base = `Completed by ${vm.doctor.fullName || 'Doctor'} · ${this.formatDateForDisplay(completionSource)} · ${this.formatTimeForAudit(completionSource)}`;
    const latestAmendment = this.hasRealAuditHistory ? this.historyEntries.find((entry) => entry.tone === 'amendment') : null;
    if (!latestAmendment) {
      return base;
    }

    return `${base} · Last amended by ${latestAmendment.editorName} at ${this.formatTimeForAudit(latestAmendment.timestamp)}`;
  }

  openHistoryDrawer(vm: ConsultationPageVm): void {
    if (this.historyEntries.length === 0) {
      this.historyEntries = this.buildHistoryEntries(vm, []);
    }
    this.historyDrawerOpen = true;
  }

  closeHistoryDrawer(): void {
    this.historyDrawerOpen = false;
  }

  getSectionAuditText(vm: ConsultationPageVm, sectionKey: 'soap' | 'diagnosis' | 'prescription' | 'lab-orders' | 'vaccinations'): string {
    void vm;

    if (!this.hasRealAuditHistory) {
      return 'Not yet edited this visit';
    }

    const entry = this.historyEntries.find((item) => item.sectionKey === sectionKey);
    if (entry) {
      return `${entry.tone === 'amendment' ? 'Last amended by' : 'Last edited by'} ${entry.editorName} at ${this.formatTimeForAudit(entry.timestamp)}`;
    }

    return 'Not yet edited this visit';
  }

  private formatTimeForAudit(value: string | undefined | null): string {
    if (!value) {
      return '--:--';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  private buildHistoryEntries(
    vm: ConsultationPageVm,
    auditLogs: Array<{
      entityType: string;
      entityId: string;
      action: string;
      performedBy: string;
      performedAt: string;
      details?: string | undefined;
    }>
  ): ConsultationHistoryEntry[] {
    const bookingId = vm.booking.id;
    const consultationId = vm.consultation?.id;
    const relevantLogs = auditLogs.filter((log) =>
      (log.entityType === 'Consultation' && (log.entityId === bookingId || log.entityId === consultationId)) ||
      (log.entityType === 'Booking' && log.entityId === bookingId)
    );

    const mappedLogs = relevantLogs.map((log): ConsultationHistoryEntry => ({
      timestamp: log.performedAt,
      editorName: log.performedBy || vm.doctor.fullName || 'Doctor',
      editorRole: log.entityType === 'Consultation' ? 'Doctor' : 'Staff',
      section: this.mapAuditLogSection(log.action, log.entityType),
      detail: log.details?.trim() || 'Content updated',
      action: log.action,
      tone: /amend/i.test(log.action) ? 'amendment' : 'default',
      sectionKey: this.mapSectionKey(log.action, log.entityType)
    }));

    if (mappedLogs.length > 0) {
      this.hasRealAuditHistory = true;
      return mappedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    this.hasRealAuditHistory = false;
    return this.buildSyntheticHistoryEntries(vm);
  }

  private buildSyntheticHistoryEntries(vm: ConsultationPageVm): ConsultationHistoryEntry[] {
    const timestamp = vm.consultation?.updatedAt || vm.booking.doctorCompletedAt || vm.booking.createdAt;
    const editorName = vm.doctor.fullName || 'Doctor';
    const editorRole = 'Doctor';
    const entries: ConsultationHistoryEntry[] = [];

    if (this.hasAnySoapInput()) {
      entries.push({
        timestamp,
        editorName,
        editorRole,
        section: 'SOAP Notes — Chief Complaint updated',
        detail: this.soapValue.chiefComplaint.trim().length <= 80
          ? `— → ${this.soapValue.chiefComplaint.trim() || 'Updated'}`
          : 'Content updated',
        action: 'Completed SOAP Notes',
        tone: 'default',
        sectionKey: 'soap'
      });
    }

    if (this.diagnoses.length > 0) {
      entries.push({
        timestamp,
        editorName,
        editorRole,
        section: `Diagnosis — ${this.diagnoses.length} diagnosis${this.diagnoses.length > 1 ? 'es' : ''} added`,
        detail: this.diagnoses
          .slice(0, 2)
          .map((diagnosis) => `${diagnosis.code || diagnosis.icd10Code || 'N/A'} ${diagnosis.description}`)
          .join(' • '),
        action: 'Completed Diagnosis',
        tone: 'default',
        sectionKey: 'diagnosis'
      });
    }

    if (this.prescriptionItems.length > 0) {
      entries.push({
        timestamp,
        editorName,
        editorRole,
        section: `Prescription — ${this.prescriptionItems.length} medication${this.prescriptionItems.length > 1 ? 's' : ''} added`,
        detail: 'Content updated',
        action: 'Completed Prescription',
        tone: 'default',
        sectionKey: 'prescription'
      });
    }

    if (this.labRequests.length > 0) {
      entries.push({
        timestamp,
        editorName,
        editorRole,
        section: `Order Labs — ${this.labRequests.length} request${this.labRequests.length > 1 ? 's' : ''} added`,
        detail: 'Content updated',
        action: 'Completed Order Labs',
        tone: 'default',
        sectionKey: 'lab-orders'
      });
    }

    if (this.pendingVaccinations.length > 0 || vm.vaccinations.length > 0) {
      entries.push({
        timestamp,
        editorName,
        editorRole,
        section: 'Vaccinations — record updated',
        detail: 'Content updated',
        action: 'Completed Vaccinations',
        tone: 'default',
        sectionKey: 'vaccinations'
      });
    }

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private mapAuditLogSection(action: string, entityType: string): string {
    if (/soap/i.test(action) || entityType === 'Consultation') {
      return 'SOAP Notes — content updated';
    }
    if (/diagnosis/i.test(action)) {
      return 'Diagnosis — content updated';
    }
    if (/prescription|medication/i.test(action)) {
      return 'Prescription — content updated';
    }
    if (/lab/i.test(action)) {
      return 'Order Labs — content updated';
    }
    if (/vaccin/i.test(action)) {
      return 'Vaccinations — content updated';
    }
    return action;
  }

  private mapSectionKey(action: string, entityType: string): ConsultationHistoryEntry['sectionKey'] {
    if (/soap/i.test(action) || entityType === 'Consultation') {
      return 'soap';
    }
    if (/diagnosis/i.test(action)) {
      return 'diagnosis';
    }
    if (/prescription|medication/i.test(action)) {
      return 'prescription';
    }
    if (/lab/i.test(action)) {
      return 'lab-orders';
    }
    if (/vaccin/i.test(action)) {
      return 'vaccinations';
    }
    return 'general';
  }

  private createDraftSnapshot(): string {
    return JSON.stringify({
      soap: this.soapValue,
      vitals: this.vitalsValue,
      diagnoses: this.diagnoses,
      prescriptions: this.prescriptionItems,
      labRequests: this.labRequests,
      followUp: this.followUpValue,
      professionalFeeAmount: this.professionalFeeAmount,
      professionalFeePaymentMode: this.professionalFeePaymentMode,
      professionalFeeNotes: this.professionalFeeNotes,
      vaccinations: this.pendingVaccinations
    });
  }

  private buildSoapNotes(): string | undefined {
    const sections = [
      ['Chief Complaint', this.soapValue.chiefComplaint.trim()],
      ['Subjective', this.soapValue.subjective.trim()],
      ['Objective', this.soapValue.objective.trim()],
      ['Assessment', this.soapValue.assessment.trim()],
      ['Plan', this.soapValue.plan.trim()]
    ]
      .filter(([, value]) => value.length > 0)
      .map(([label, value]) => `${label}: ${value}`);

    return sections.length ? sections.join('\n') : undefined;
  }

  private buildDoctorCompletePayload(finalAmount: number, professionalFeeWaivedReason: string): DoctorCompleteBookingRequest {
    const normalizedDiagnoses = this.buildNormalizedDiagnoses();
    const normalizedPrescription = this.buildNormalizedPrescription();
    const normalizedLabOrders = this.buildNormalizedLabOrders();
    const normalizedFollowUp = this.buildNormalizedFollowUp();
    const normalizedVitals = this.buildNormalizedVitalSigns();
    const normalizedSoap = this.buildNormalizedSoap();
    const generalNotes = this.buildGeneralNotes();

    return {
      finalAmount: this.isProfessionalFeeWaived ? 0 : finalAmount,
      isProfessionalFeeWaived: this.isProfessionalFeeWaived,
      professionalFeeWaivedReason: professionalFeeWaivedReason || undefined,
      doctorFeeStatus: this.isProfessionalFeeWaived ? 'Waived' : this.professionalFeePaymentMode,
      doctorFeeNotes: professionalFeeWaivedReason || this.professionalFeeNotes.trim() || undefined,
      generalNotes,
      vitalSigns: normalizedVitals,
      soap: normalizedSoap,
      diagnoses: normalizedDiagnoses,
      prescription: normalizedPrescription,
      labOrders: normalizedLabOrders,
      followUp: normalizedFollowUp,
      soapNotes: this.buildSoapNotes(),
      diagnosis: this.buildLegacyDiagnosisText(normalizedDiagnoses),
      followUpDate: normalizedFollowUp?.followUpDate ?? undefined,
      followUpInstructions: normalizedFollowUp?.instructions ?? undefined,
      prescriptionItems: this.buildLegacyPrescriptionItems(),
      notes: generalNotes ?? undefined
    };
  }

  private buildGeneralNotes(): string | null {
    const plan = this.soapValue.plan.trim();
    if (plan.length > 0) {
      return plan;
    }

    const chiefComplaint = this.soapValue.chiefComplaint.trim();
    return chiefComplaint.length > 0 ? chiefComplaint : null;
  }

  private buildNormalizedSoap(): DoctorCompleteBookingRequest['soap'] {
    const subjective = this.soapValue.subjective.trim();
    const objective = this.soapValue.objective.trim();
    const assessment = this.soapValue.assessment.trim();
    const plan = this.soapValue.plan.trim();

    if (![subjective, objective, assessment, plan].some((value) => value.length > 0)) {
      return null;
    }

    return {
      subjective: subjective || null,
      objective: objective || null,
      assessment: assessment || null,
      plan: plan || null
    };
  }

  private buildNormalizedDiagnoses(): NonNullable<DoctorCompleteBookingRequest['diagnoses']> {
    const rows = this.diagnoses
      .map((diagnosis) => {
        const diagnosisText = diagnosis.description.trim() || diagnosis.icd10Description?.trim() || '';
        const diagnosisCode = diagnosis.icd10Code?.trim() || diagnosis.code.trim() || null;

        if (!diagnosisText) {
          return null;
        }

        return {
          diagnosisText,
          diagnosisCode,
          isPrimary: diagnosis.type === 'Primary',
          notes: diagnosis.type === 'Primary' ? null : diagnosis.type
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (rows.length === 0) {
      return [];
    }

    if (!rows.some((item) => item.isPrimary)) {
      rows[0] = { ...rows[0], isPrimary: true };
    }

    return rows;
  }

  private buildNormalizedPrescription(): DoctorCompleteBookingRequest['prescription'] {
    const items = this.prescriptionItems
      .map((item) => {
        const medicationName = item.medicineName.trim();
        if (!medicationName) {
          return null;
        }

        return {
          medicationName,
          strength: item.strength.trim() || null,
          dosage: item.sig.trim() || null,
          route: item.route?.trim() || item.routeDescription?.trim() || null,
          frequency: item.frequency?.trim() || item.frequencyCode?.trim() || null,
          duration: item.duration?.trim() || null,
          quantity: item.quantity === null || item.quantity === undefined ? null : String(item.quantity),
          instructions: item.instructions?.trim() || null
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (items.length === 0) {
      return null;
    }

    return {
      notes: this.soapValue.plan.trim() || null,
      items
    };
  }

  private buildNormalizedLabOrders(): NonNullable<DoctorCompleteBookingRequest['labOrders']> {
    const orders = this.labRequests
      .map((request) => {
        const testName = request.testName.trim();
        if (!testName) {
          return null;
        }

        const reason = request.reason?.trim() || null;
        return {
          notes: reason,
          items: [
            {
              testName,
              testCode: testName,
              instructions: reason
            }
          ]
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return orders;
  }

  private buildNormalizedFollowUp(): DoctorCompleteBookingRequest['followUp'] {
    const followUpDate = this.followUpValue?.followUpDate?.trim() || '';
    const reason = this.followUpValue?.reason?.trim() || '';

    if (!followUpDate && !reason) {
      return null;
    }

    return {
      followUpDate: followUpDate || null,
      instructions: reason || null,
      reason: reason || null
    };
  }

  private buildNormalizedVitalSigns(): DoctorCompleteBookingRequest['vitalSigns'] {
    const value = this.vitalsValue;
    if (!value || !this.hasVitalSignsValue(value)) {
      return null;
    }

    return {
      systolicBp: value.bloodPressureSystolic ?? null,
      diastolicBp: value.bloodPressureDiastolic ?? null,
      heartRate: value.heartRate ?? null,
      respiratoryRate: value.respiratoryRate ?? null,
      temperature: value.temperatureCelsius ?? value.temperature ?? null,
      oxygenSaturation: value.oxygenSaturation ?? null,
      weight: value.weightKg ?? value.weight ?? null,
      height: value.heightCm ?? value.height ?? null,
      bmi: value.bmi ?? null,
      painScore: value.painScore ?? null,
      takenAt: new Date().toISOString()
    };
  }

  private hasVitalSignsValue(value: VitalSigns): boolean {
    const entries: Array<number | string | null | undefined> = [
      value.bloodPressureSystolic,
      value.bloodPressureDiastolic,
      value.heartRate,
      value.respiratoryRate,
      value.temperatureCelsius,
      value.temperature,
      value.oxygenSaturation,
      value.weightKg,
      value.weight,
      value.heightCm,
      value.height,
      value.bmi,
      value.painScore
    ];

    return entries.some((entry) => entry !== null && entry !== undefined && String(entry).trim().length > 0);
  }

  private buildLegacyDiagnosisText(diagnoses: NonNullable<DoctorCompleteBookingRequest['diagnoses']>): string | undefined {
    if (!diagnoses.length) {
      return undefined;
    }

    return diagnoses
      .map((diagnosis) => {
        const code = diagnosis.diagnosisCode?.trim();
        return code ? `${code} - ${diagnosis.diagnosisText}` : diagnosis.diagnosisText;
      })
      .join('; ');
  }

  private writeLocalDraft(vm: ConsultationPageVm): void {
    if (typeof localStorage === 'undefined') {
      throw new Error('Local draft storage is not available in this browser.');
    }

    const isProfessionalFeeWaived = this.professionalFeePaymentMode === 'Waived';

    const draft: ConsultationLocalDraft = {
      bookingId: vm.booking.id,
      savedAt: new Date().toISOString(),
      soap: {
        chiefComplaint: this.soapValue.chiefComplaint,
        subjective: this.soapValue.subjective,
        objective: this.soapValue.objective,
        assessment: this.soapValue.assessment,
        plan: this.soapValue.plan
      },
      vitalsValue: this.vitalsValue ? { ...this.vitalsValue } : null,
      diagnoses: this.diagnoses.map((diagnosis) => ({ ...diagnosis })),
      prescriptionItems: this.prescriptionItems.map((item) => ({ ...item })),
      labRequests: this.labRequests.map((request) => ({ ...request })),
      followUpValue: this.followUpValue ? { ...this.followUpValue } : null,
      pendingVaccinations: this.pendingVaccinations.map((payload) => ({ ...payload })),
      professionalFeeAmount: this.professionalFeeAmount,
      professionalFeePaymentMode: this.professionalFeePaymentMode,
      professionalFeeNotes: this.professionalFeeNotes,
      isProfessionalFeeWaived,
      finalAmount: isProfessionalFeeWaived ? 0 : this.professionalFeeAmount,
      professionalFeeWaivedReason: isProfessionalFeeWaived ? this.professionalFeeNotes.trim() : ''
    };

    localStorage.setItem(buildConsultationDraftKey(vm.booking.id), JSON.stringify(draft));
  }

  private readLocalDraft(bookingId: string): ConsultationLocalDraft | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(buildConsultationDraftKey(bookingId));
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ConsultationLocalDraft>;
      if (parsed.bookingId !== bookingId) {
        return null;
      }

      return {
        bookingId,
        savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
        soap: {
          chiefComplaint: parsed.soap?.chiefComplaint ?? '',
          subjective: parsed.soap?.subjective ?? '',
          objective: parsed.soap?.objective ?? '',
          assessment: parsed.soap?.assessment ?? '',
          plan: parsed.soap?.plan ?? ''
        },
        vitalsValue: parsed.vitalsValue ? { ...parsed.vitalsValue } : null,
        diagnoses: Array.isArray(parsed.diagnoses) ? parsed.diagnoses.map((diagnosis) => ({ ...diagnosis })) : [],
        prescriptionItems: Array.isArray(parsed.prescriptionItems)
          ? parsed.prescriptionItems.map((item) => ({ ...item }))
          : [],
        labRequests: Array.isArray(parsed.labRequests) ? parsed.labRequests.map((request) => ({ ...request })) : [],
        followUpValue: parsed.followUpValue ? { ...parsed.followUpValue } : null,
        pendingVaccinations: Array.isArray(parsed.pendingVaccinations)
          ? parsed.pendingVaccinations.map((payload) => ({ ...payload }))
          : [],
        professionalFeeAmount: typeof parsed.professionalFeeAmount === 'number' ? parsed.professionalFeeAmount : 0,
        professionalFeePaymentMode: this.normalizeProfessionalFeePaymentMode(parsed.professionalFeePaymentMode),
        professionalFeeNotes: parsed.professionalFeeNotes ?? '',
        isProfessionalFeeWaived: Boolean(parsed.isProfessionalFeeWaived),
        finalAmount: typeof parsed.finalAmount === 'number' ? parsed.finalAmount : 0,
        professionalFeeWaivedReason: parsed.professionalFeeWaivedReason ?? ''
      };
    } catch {
      return null;
    }
  }

  private async savePendingVaccinations(patientId: string, booking: Booking): Promise<void> {
    for (const payload of this.pendingVaccinations) {
      try {
        await firstValueFrom(
          this.vaccinationService.createPatientVaccination(patientId, {
            ...payload,
            bookingId: booking.id,
            doctorId: booking.doctorId
          })
        );
      } catch (error) {
        console.error('Failed to save vaccination:', error);
      }
    }
    this.pendingVaccinations = [];
  }

  private clearLocalDraft(bookingId: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(buildConsultationDraftKey(bookingId));
  }

  private resetCompletionModalState(): void {
    this.isProfessionalFeeWaived = false;
    this.completionFinalAmount = 0;
    this.completionWaivedReason = '';
    this.isSubmittingComplete = false;
    this.completionValidationRequested = false;
  }

  private loadConsultationRecord$(booking: Booking): Observable<ConsultationRecordResponse | null> {
    return this.bookingService.fetchConsultationRecordByBookingId(booking.id).pipe(catchError(() => of(null)));
  }

  private loadVaccinations$(patientId: string): Observable<any[]> {
    return this.vaccinationService.getPatientVaccinations(patientId).pipe(
      catchError(() => of([]))
    );
  }

  private resolvePatient$(booking: Booking): Observable<Patient | undefined> {
    return this.patientState.getPatientById(booking.patientId).pipe(
      map((patient) => patient ?? buildFallbackPatient(booking))
    );
  }

  private isConsultationUnavailable(status: Booking['status']): boolean {
    return !['CheckedIn', 'InProgress', 'Completed'].includes(status);
  }

  private isOwnedByLoggedInDoctor(
    booking: Booking,
    doctor: { id: string; userId?: string | null } | null | undefined,
    currentUser: { id: string }
  ): boolean {
    if (booking.doctorId && doctor?.id && booking.doctorId === doctor.id) {
      return true;
    }

    if (booking.doctor?.userId && booking.doctor.userId === currentUser.id) {
      return true;
    }

    if (doctor?.userId && doctor.userId === currentUser.id) {
      return true;
    }

    return false;
  }

  private buildConsultationRecordUpdatePayload(): ConsultationRecordUpdateRequest {
    const normalizedDiagnoses = this.buildNormalizedDiagnoses();
    const normalizedFollowUp = this.buildNormalizedFollowUp();

    return {
      generalNotes: this.buildGeneralNotes(),
      soapNotes: this.buildSoapNotes(),
      notes: this.buildGeneralNotes(),
      diagnosis: this.buildLegacyDiagnosisText(normalizedDiagnoses) ?? null,
      followUpDate: normalizedFollowUp?.followUpDate ?? null,
      followUpInstructions: normalizedFollowUp?.instructions ?? null,
      vitalSigns: this.buildNormalizedVitalSigns(),
      soap: this.buildNormalizedSoap(),
      diagnoses: normalizedDiagnoses,
      prescription: this.buildNormalizedPrescription(),
      labOrders: this.buildNormalizedLabOrders(),
      followUp: normalizedFollowUp,
      prescriptionItems: this.buildLegacyPrescriptionItems().map((item) => ({
        ...item,
        quantity: item.quantity === null || item.quantity === undefined ? null : String(item.quantity)
      }))
    };
  }

  private mapConsultationRecord(
    record: ConsultationRecordResponse | null,
    booking: Booking,
    records: MedicalRecordsState
  ): Consultation | null {
    if (!record) {
      return null;
    }

    const prescriptions = record.prescription ? [this.mapConsultationRecordPrescription(record)] : [];
    const labRequests = record.labOrders.flatMap((order) =>
      order.items.map((item) => ({
        id: item.id ?? `${order.id}-${item.testName}`,
        consultationId: record.consultationId ?? record.bookingId,
        patientId: record.patientId,
        doctorId: record.doctorId,
        testName: item.testName,
        reason: item.instructions ?? order.notes ?? '',
        status: 'Requested' as const,
        requestedAt: new Date().toISOString()
      }))
    );
    const diagnoses: Diagnosis[] = record.diagnoses.map(
      (item): Diagnosis => ({
        id: item.id ?? `${record.bookingId}-${item.diagnosisText}`,
        code: item.diagnosisCode ?? item.diagnosisText,
        description: item.diagnosisText,
        type: item.isPrimary ? 'Primary' : 'Secondary'
      })
    );

    return {
      id: record.consultationId ?? record.bookingId,
      bookingId: record.bookingId,
      patientId: record.patientId,
      doctorId: record.doctorId,
      consultationDate: booking.doctorCompletedAt ?? booking.createdAt,
      generalNotes: record.generalNotes ?? '',
      chiefComplaint: record.soap?.subjective ?? record.generalNotes ?? '',
      subjective: record.soap?.subjective ?? '',
      objective: record.soap?.objective ?? '',
      assessment: record.soap?.assessment ?? '',
      plan: record.soap?.plan ?? '',
      vitalSigns: record.vitalSigns
        ? {
            id: `${record.bookingId}-vitals`,
            consultationId: record.consultationId ?? undefined,
            patientId: record.patientId,
            bloodPressureSystolic: record.vitalSigns.systolicBp ?? undefined,
            bloodPressureDiastolic: record.vitalSigns.diastolicBp ?? undefined,
            heartRate: record.vitalSigns.heartRate ?? undefined,
            respiratoryRate: record.vitalSigns.respiratoryRate ?? undefined,
            temperatureCelsius: record.vitalSigns.temperature ?? undefined,
            temperature: record.vitalSigns.temperature ?? undefined,
            oxygenSaturation: record.vitalSigns.oxygenSaturation ?? undefined,
            weightKg: record.vitalSigns.weight ?? undefined,
            weight: record.vitalSigns.weight ?? undefined,
            heightCm: record.vitalSigns.height ?? undefined,
            height: record.vitalSigns.height ?? undefined,
            bmi: record.vitalSigns.bmi ?? undefined,
            painScore: record.vitalSigns.painScore ?? undefined,
            takenAt: record.vitalSigns.takenAt ?? undefined,
            createdAt: record.vitalSigns.takenAt ?? booking.createdAt
          }
        : undefined,
      diagnoses,
      prescriptionIds: record.prescription ? [record.prescription.id ?? record.bookingId] : [],
      labRequestIds: labRequests.map((item) => item.id),
      followUpDate: record.followUp?.followUpDate ?? undefined,
      status: record.bookingStatus === 'Completed' ? 'Completed' : 'Draft',
      isLocked: record.bookingStatus === 'Completed' && !this.isAmendMode,
      createdAt: booking.createdAt,
      updatedAt: booking.doctorCompletedAt ?? booking.createdAt,
      prescriptions,
      labRequests
    };
  }

  private mapConsultationRecordPrescription(record: ConsultationRecordResponse): Prescription {
    const prescription = record.prescription;
    if (!prescription) {
      return {
        id: record.bookingId,
        consultationId: record.consultationId ?? record.bookingId,
        patientId: record.patientId,
        doctorId: record.doctorId,
        issuedAt: new Date().toISOString(),
        status: 'Active',
        items: [],
        notes: undefined
      };
    }

    return {
      id: prescription.id ?? record.bookingId,
      consultationId: record.consultationId ?? record.bookingId,
      patientId: record.patientId,
      doctorId: record.doctorId,
      issuedAt: new Date().toISOString(),
      status: 'Active',
      items: prescription.items
        .map((item) => ({
          id: item.id ?? `${prescription.id ?? record.bookingId}-${item.medicationName}`,
          medicineName: item.medicationName,
          genericName: undefined,
          dosageForm: 'Tablet',
          strength: item.strength ?? '',
          quantity: parsePrescriptionQuantity(item.quantity),
          sig: item.dosage ?? '',
          frequency: item.frequency ?? undefined,
          duration: item.duration ?? undefined,
          route: item.route ?? undefined,
          routeDescription: item.route ?? undefined,
          unitOfMeasure: undefined,
          unitOfMeasureDescription: undefined,
          instructions: item.instructions ?? undefined,
          isControlledSubstance: false
        }))
        .filter((item) => item.medicineName.length > 0 && item.strength.length > 0 && item.sig.length > 0),
      notes: prescription.notes ?? undefined
    };
  }

  private buildLegacyPrescriptionItems(): PrescriptionItem[] {
    return this.prescriptionItems.map((item) => ({ ...item }));
  }

  private reload(): void {
    this.reloadSubject.next(this.reloadSubject.value + 1);
  }

  private async presentToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      position: 'top',
      color
    });
    await toast.present();
  }
}

function mapPatientDetail(dto: PatientDto): Patient {
  return {
    id: dto.id,
    patientCode: normalizeString(dto.patientCode) || dto.id,
    firstName: normalizeString(dto.firstName) || '',
    middleName: normalizeString(dto.middleName),
    lastName: normalizeString(dto.lastName) || '',
    dateOfBirth: normalizeString(dto.dateOfBirth) || '',
    sex: normalizeString(dto.sex) || '',
    civilStatus: normalizeString(dto.civilStatus),
    address: normalizeString(dto.address),
    city: normalizeString(dto.city),
    zipCode: normalizeString(dto.zipCode),
    contactNumber: normalizeString(dto.contactNumber),
    email: normalizeString(dto.email),
    emergencyContactName: normalizeString(dto.emergencyContactName),
    emergencyContactNumber: normalizeString(dto.emergencyContactNumber),
    emergencyContactRelationship: normalizeString(dto.emergencyContactRelationship),
    bloodType: normalizeString(dto.bloodType),
    philHealthNumber: normalizeString(dto.philHealthNumber),
    hmoProvider: normalizeString(dto.hmoProvider),
    hmoCardNumber: normalizeString(dto.hmoCardNumber),
    userId: normalizeString(dto.userId),
    isEmailVerified: dto.isEmailVerified ?? undefined,
    isGuest: Boolean(dto.isGuest),
    consentedAt: normalizeString(dto.consentedAt),
    consentVersion: normalizeString(dto.consentVersion)
  };
}

function buildFallbackPatient(booking: Booking): Patient {
  const [firstName, ...lastNameParts] = booking.patientName?.trim().split(/\s+/).filter(Boolean) ?? [];

  return {
    id: booking.patientId,
    patientCode: booking.patientId,
    firstName: firstName ?? 'Patient',
    lastName: lastNameParts.join(' '),
    dateOfBirth: '',
    sex: 'Not specified',
    contactNumber: undefined,
    email: undefined,
    isGuest: false
  };
}

function normalizeString(value: NullableString): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parsePrescriptionQuantity(value: string | null | undefined): number {
  const text = value?.trim() ?? '';
  if (!text) {
    return 1;
  }

  const parsed = Number(text);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  const digits = text.replace(/[^0-9.]/g, '');
  const digitsValue = Number(digits);
  return Number.isFinite(digitsValue) && digitsValue > 0 ? digitsValue : 1;
}

function formatServicesLabel(booking: Booking): string {
  if (booking.serviceNames?.length) {
    return booking.serviceNames.join(', ');
  }

  const names = booking.services?.map((service) => service.name).filter((name) => name.trim().length > 0) ?? [];
  if (names.length > 0) {
    return names.join(', ');
  }

  return booking.serviceName?.trim() || 'Service';
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as {
      error?: { message?: unknown; errors?: Record<string, unknown> };
      message?: unknown;
    };

    const directMessage = apiError.error?.message ?? apiError.message;
    if (typeof directMessage === 'string' && directMessage.trim()) {
      return directMessage;
    }

    const firstValidationError = apiError.error?.errors
      ? Object.values(apiError.error.errors)
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : undefined;

    if (firstValidationError) {
      return firstValidationError;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function buildConsultationDraftKey(bookingId: string): string {
  return `doctor-consultation-draft:${bookingId}`;
}

function mergeConsultationWithDraft(
  consultation: Consultation | null,
  draft: ConsultationLocalDraft | null
): Consultation | null {
  if (!consultation && !draft) {
    return null;
  }

  const base = consultation ?? {
    id: '',
    bookingId: draft?.bookingId ?? '',
    patientId: '',
    doctorId: '',
    consultationDate: '',
    chiefComplaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    diagnoses: [],
    prescriptionIds: [],
    labRequestIds: [],
    status: 'Draft' as const,
    isLocked: false,
    createdAt: draft?.savedAt ?? new Date().toISOString(),
    updatedAt: draft?.savedAt ?? new Date().toISOString()
  };

  if (!draft) {
    return base;
  }

  return {
    ...base,
    chiefComplaint: draft.soap.chiefComplaint,
    subjective: draft.soap.subjective,
    objective: draft.soap.objective,
    assessment: draft.soap.assessment,
    plan: draft.soap.plan,
    historyOfPresentIllness: draft.soap.subjective,
    peGeneralFindings: draft.soap.objective,
    vitalSigns: draft.vitalsValue ? { ...draft.vitalsValue } : base.vitalSigns,
    diagnoses: draft.diagnoses.map((diagnosis) => ({ ...diagnosis })),
    followUpDate: draft.followUpValue?.followUpDate ?? base.followUpDate,
    updatedAt: draft.savedAt
  };
}

function mergePrescriptionWithDraft(
  prescription: Prescription | null,
  draft: ConsultationLocalDraft
): Prescription {
  return {
    id: prescription?.id ?? '',
    consultationId: prescription?.consultationId ?? '',
    patientId: prescription?.patientId ?? '',
    doctorId: prescription?.doctorId ?? '',
    issuedAt: prescription?.issuedAt ?? draft.savedAt,
    status: prescription?.status ?? 'Active',
    notes: prescription?.notes,
    prescriptionDate: prescription?.prescriptionDate,
    items: draft.prescriptionItems.map((item) => ({ ...item }))
  };
}

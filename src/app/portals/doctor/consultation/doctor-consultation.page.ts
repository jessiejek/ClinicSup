import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
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
  VitalSigns
} from '../../../core/models';
import { CreatePatientVaccinationRequest } from '../../../core/models/vaccination.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { BookingService, DoctorCompleteBookingRequest } from '../../../core/services/booking.service';
import {
  MedicalRecordsService,
  MedicalRecordsState
} from '../../../core/services/medical-records.service';
import { PatientStateService } from '../../../core/services/patient-state.service';
import { PatientVaccinationsService } from '../../../core/services/patient-vaccinations.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { FollowUpDraftView } from '../components/follow-up-form/follow-up-form.component';
import { LabRequestDraftView } from '../components/lab-request-form/lab-request-form.component';
import { SoapFormValue } from '../components/soap-form/soap-form.component';
import { DoctorService } from '../services/doctor.service';
import {
  ConsultationCompleteModalComponent,
  ConsultationCompleteModalPayload
} from './components/consultation-complete-modal.component';
import {
  ConsultationHeaderComponent,
  ConsultationHeaderMode
} from './components/consultation-header.component';
import { ConsultationOverviewComponent } from './components/consultation-overview.component';
import { ConsultationWorkspaceComponent } from './components/consultation-workspace.component';
import { ConsultationPageVm } from './doctor-consultation.types';
import { PatientMediaPanelComponent } from '../../../shared/components/patient-media-panel/patient-media-panel.component';
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
  isProfessionalFeeWaived: boolean;
  finalAmount: number;
  professionalFeeWaivedReason: string;
}

type ConsultationInteractionMode = 'complete' | 'view' | 'amend';

@Component({
  standalone: true,
  selector: 'app-doctor-consultation-page',
  imports: [
    AsyncPipe, DatePipe, NgIf, RouterLink,
    EmptyStateComponent,
    ConsultationOverviewComponent,
    ConsultationWorkspaceComponent,
    PatientMediaPanelComponent,
    StatusBadgeComponent
  ],
  template: `
    <ng-container *ngIf="vm$ | async as vm; else notFound">
      <div class="cr">
        <div class="cr-top">
          <div class="cr-hdr">
            <div class="cr-hdr__left">
              <h1 class="cr-hdr__title">Consultation Room</h1>
              <p class="cr-hdr__sub">{{ vm.patient.firstName || 'Patient' }} {{ vm.patient.lastName || '' }} &middot; {{ vm.booking.appointmentDate | date:'MMM d, y' }} &middot; Queue #{{ vm.booking.queueNumber ?? '--' }}</p>
            </div>
            <div class="cr-hdr__right">
              <app-status-badge [status]="vm.booking.status"></app-status-badge>
              <a class="cr-btn" routerLink="/doctor/appointments">Back to Appointments</a>
              <button class="cr-btn cr-btn--primary" (click)="saveDraft(vm)" [disabled]="isWorkspaceLocked(vm) || isSavingDraft">{{ isSavingDraft ? 'Saving...' : 'Save Draft' }}</button>
              <button class="cr-btn cr-btn--complete" (click)="requestCompletion(vm)" [disabled]="isCompleteActionDisabled(vm)" *ngIf="!isCompletedConsultation(vm) || isAmendMode">Complete Consultation</button>
            </div>
          </div>

          <div class="cr-patient">
            <div class="cr-avatar">{{ (vm.patient.firstName?.charAt(0) || '?') }}{{ (vm.patient.lastName?.charAt(0) || '') }}</div>
            <div class="cr-patient__info">
              <strong>{{ vm.patient.firstName }} {{ vm.patient.lastName }}</strong>
              <span>{{ vm.patient.sex || '--' }} &middot; {{ vm.patient.dateOfBirth ? (calcAge(vm.patient.dateOfBirth) + ' yrs') : '--' }}</span>
              <span>{{ vm.booking.serviceNames?.join(', ') || vm.booking.serviceName || 'Service' }}</span>
              <a class="cr-clinical-link" [routerLink]="['/doctor/patients', vm.patient.id]" (click)="$event.stopPropagation()">View Clinical History &rarr;</a>
            </div>
            <div class="cr-patient__meta">
              <div><span class="ml">Fee</span><span class="mv">PHP {{ vm.booking.consultationFeeSnapshot ?? vm.booking.totalFee ?? 0 }}</span></div>
              <div><span class="ml">Mode</span><span class="mv">{{ vm.booking.paymentMode || '--' }}</span></div>
              <div><span class="ml">Payment</span><app-status-badge [status]="vm.booking.paymentStatus || 'Unpaid'"></app-status-badge></div>
            </div>
          </div>
        </div>

        <div class="cr-body">
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
                [prescriptionItems]="prescriptionItems"
                (vitalSignsChange)="onVitalsChange($event)"
                (vitalsValidityChange)="vitalsValid = $event"
                (soapChange)="onSoapChange($event)"
                (soapValidityChange)="soapValid = $event"
                (diagnosesChange)="onDiagnosesChange($event)"
                (diagnosisValidityChange)="diagnosisValid = $event"
                (prescriptionItemsChange)="onPrescriptionItemsChange($event)"
                (labRequestsChange)="onLabRequestsChange($event)"
                (followUpChange)="onFollowUpChange($event)"
                (vaccinationsAdded)="onVaccinationsAdded($event)"
              ></app-consultation-workspace>
            </div>
          </div>

          <div class="cr-side">
            <div class="cr-side-card">
              <h3>Consultation Progress</h3>
              <ul class="cr-progress">
                <li class="cr-progress__item" [class.done]="soapValid">Notes &amp; SOAP</li>
                <li class="cr-progress__item" [class.done]="true">Vitals</li>
                <li class="cr-progress__item" [class.done]="diagnosisValid">Diagnosis</li>
                <li class="cr-progress__item" [class.done]="prescriptionItems.length > 0">Prescription</li>
                <li class="cr-progress__item">Follow-up</li>
                <li class="cr-progress__item">PF Decision</li>
              </ul>
              <button class="cr-btn cr-btn--primary cr-btn--full" (click)="saveDraft(vm)" [disabled]="isWorkspaceLocked(vm) || isSavingDraft">{{ isSavingDraft ? 'Saving Draft...' : 'Save Draft' }}</button>
              <button class="cr-btn cr-btn--complete cr-btn--full" (click)="requestCompletion(vm)" [disabled]="isCompleteActionDisabled(vm)" *ngIf="!isCompletedConsultation(vm) || isAmendMode" style="margin-top:8px">Complete Consultation</button>
            </div>

            <div class="cr-side-card">
              <h3>Patient Uploads</h3>
              <app-patient-media-panel kind="document" [patientId]="vm.patient.id" [filterByBooking]="false" [allowUpload]="false" heading="Documents" subheading="Referrals, certificates, and files."></app-patient-media-panel>
              <app-patient-media-panel kind="lab-result" [patientId]="vm.patient.id" [filterByBooking]="false" [allowUpload]="false" heading="Lab Results" subheading="Uploaded lab reports."></app-patient-media-panel>
            </div>
          </div>
        </div>
      </div>
    </ng-container>

    <ng-template #notFound>
      <app-empty-state icon="document-text-outline" title="Consultation unavailable" description="This appointment is either missing or belongs to another doctor." ctaLabel="Back to Appointments" ctaRoute="/doctor/appointments"></app-empty-state>
    </ng-template>
  `,
  styleUrl: './doctor-consultation.page.scss'
})
export class DoctorConsultationPage {
  private readonly apiService = inject(ApiService);
  private readonly authState = inject(AuthStateService);
  private readonly bookingService = inject(BookingService);
  private readonly doctorService = inject(DoctorService);
  private readonly medicalRecords = inject(MedicalRecordsService);
  private readonly modalCtrl = inject(ModalController);
  private readonly patientState = inject(PatientStateService);
  private readonly vaccinationService = inject(PatientVaccinationsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly reloadSubject = new BehaviorSubject(0);

  isProfessionalFeeWaived = false;
  completionFinalAmount = 0;
  completionWaivedReason = '';
  isSubmittingComplete = false;
  isSavingDraft = false;
  isSavingAmendment = false;
  isAmendMode = false;

  soapValid = false;
  diagnosisValid = false;
  vitalsValid = true;
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

  readonly vm$ = combineLatest([
    this.route.paramMap.pipe(map((paramMap) => paramMap.get('bookingId') ?? '')),
    this.authState.currentUser$,
    this.reloadSubject
  ]).pipe(
    switchMap(([bookingId, user]) => {
      if (!bookingId || !user) {
        return of(null);
      }

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
                        map((apiVaccinations) =>
                          this.buildVm({
                            booking: resolvedBooking,
                            patient,
                            doctor,
                            records: { ...records, vaccinations: apiVaccinations },
                            consultationRecord
                          })
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

  onVitalsChange(value: VitalSigns): void {
    this.vitalsValue = value;
  }

  onSoapChange(value: SoapFormValue): void {
    this.soapValue = value;
  }

  onDiagnosesChange(value: Diagnosis[]): void {
    this.diagnoses = value;
  }

  onPrescriptionItemsChange(value: PrescriptionItem[]): void {
    this.prescriptionItems = value;
  }

  onLabRequestsChange(value: LabRequestDraftView[]): void {
    this.labRequests = value;
  }

  onFollowUpChange(value: FollowUpDraftView | null): void {
    this.followUpValue = value;
  }

  onVaccinationsAdded(payloads: CreatePatientVaccinationRequest[]): void {
    this.pendingVaccinations = payloads;
  }

  saveDraft(vm: ConsultationPageVm): void {
    if (this.isWorkspaceLocked(vm) || this.isSavingDraft || this.isAmendMode) {
      return;
    }

    this.isSavingDraft = true;
    try {
      this.writeLocalDraft(vm);
      void this.presentToast('Draft saved locally.', 'success');
    } catch (error) {
      void this.presentToast(extractApiErrorMessage(error, 'Failed to save local draft.'), 'danger');
    } finally {
      this.isSavingDraft = false;
    }
  }

  requestCompletion(vm: ConsultationPageVm): void {
    if (this.isCompleteActionDisabled(vm)) {
      void this.presentToast(
        'Complete the chief complaint and add at least one primary diagnosis before completing.',
        'warning'
      );
      return;
    }

    void this.openCompleteModal(vm);
  }

  async openCompleteModal(vm: ConsultationPageVm): Promise<void> {
    const booking = vm.booking;
    const draft = this.readLocalDraft(booking.id);
    this.isSubmittingComplete = false;
    this.isProfessionalFeeWaived =
      draft?.isProfessionalFeeWaived ?? (booking.isProfessionalFeeWaived === true || booking.paymentStatus === 'Waived');
    this.completionFinalAmount =
      draft?.finalAmount ?? Math.max(0, booking.finalAmount ?? booking.consultationFeeSnapshot ?? 0);
    this.completionWaivedReason = draft?.professionalFeeWaivedReason ?? booking.professionalFeeWaivedReason ?? '';

    const modal = await this.modalCtrl.create({
      component: ConsultationCompleteModalComponent,
      componentProps: {
        patientName: [vm.patient.firstName, vm.patient.lastName].filter(Boolean).join(' ') || 'Patient',
        serviceLabel: this.servicesLabel(booking),
        scheduleLabel: `${booking.appointmentDate} \u2022 ${booking.slotStartTime} - ${booking.slotEndTime}`,
        initialFinalAmount: this.completionFinalAmount,
        initialIsProfessionalFeeWaived: this.isProfessionalFeeWaived,
        initialProfessionalFeeWaivedReason: this.completionWaivedReason,
        submitHandler: (completion: ConsultationCompleteModalPayload) => this.submitCompletion(booking, completion)
      },
      cssClass: 'modal-default',
      backdropDismiss: false
    });

    await modal.present();
    await modal.onDidDismiss();
  }

  servicesLabel(booking: Booking): string {
    return formatServicesLabel(booking);
  }

  async submitCompletion(booking: Booking, completion: ConsultationCompleteModalPayload): Promise<boolean> {
    if (this.isSubmittingComplete) {
      return false;
    }

    this.isProfessionalFeeWaived = completion.isProfessionalFeeWaived;
    this.completionFinalAmount = completion.isProfessionalFeeWaived ? 0 : completion.finalAmount;
    this.completionWaivedReason = completion.professionalFeeWaivedReason;

    const finalAmount = this.completionFinalAmount;
    const professionalFeeWaivedReason = this.completionWaivedReason.trim();

    if (!this.isProfessionalFeeWaived && (!Number.isFinite(finalAmount) || finalAmount < 0)) {
      await this.presentToast('Enter a valid final amount.', 'warning');
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

  enterAmendMode(): void {
    this.isAmendMode = true;
    this.isSavingAmendment = false;
  }

  cancelAmendMode(): void {
    if (this.isSavingAmendment) {
      return;
    }

    this.isAmendMode = false;
    this.reload();
  }

  async saveAmendment(vm: ConsultationPageVm): Promise<void> {
    if (!this.isAmendMode || this.isSavingAmendment || !this.isCompletedConsultation(vm)) {
      return;
    }

    const payload = this.buildConsultationRecordUpdatePayload();
    this.isSavingAmendment = true;

    try {
      await firstValueFrom(this.bookingService.updateConsultationRecord(vm.booking.id, payload));
      this.clearLocalDraft(vm.booking.id);
      this.isAmendMode = false;
      this.reload();
      await this.presentToast('Consultation amendment saved.', 'success');
    } catch (error) {
      await this.presentToast(extractApiErrorMessage(error, 'Failed to save consultation amendment.'), 'danger');
    } finally {
      this.isSavingAmendment = false;
    }
  }

  isCompleteActionDisabled(vm: ConsultationPageVm): boolean {
    return (
      this.isWorkspaceLocked(vm) ||
      this.isSavingDraft ||
      this.isSubmittingComplete ||
      !this.soapValid ||
      !this.diagnosisValid ||
      !this.vitalsValid
    );
  }

  private canEditConsultation(vm: ConsultationPageVm): boolean {
    return vm.booking.status === 'CheckedIn' || vm.booking.status === 'InProgress';
  }

  isCompletedConsultation(vm: ConsultationPageVm): boolean {
    return vm.booking.status === 'Completed';
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

  calcAge(dob: string): number {
    if (!dob) return 0;
    const b = new Date(dob);
    const t = new Date();
    let a = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
    return a;
  }

  private buildVm(args: {
    booking: Booking;
    patient: Patient;
    doctor: ConsultationPageVm['doctor'];
    records: MedicalRecordsState;
    consultationRecord: ConsultationRecordResponse | null;
  }): ConsultationPageVm {
    const localDraft = this.readLocalDraft(args.booking.id);
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

    return {
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
      recentConsultations: args.records.consultations
        .filter((item) => item.patientId === args.patient.id)
        .slice(0, 5)
    };
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
      doctorFeeStatus: this.isProfessionalFeeWaived ? 'Waived' : 'Charged',
      doctorFeeNotes: this.isProfessionalFeeWaived ? professionalFeeWaivedReason || undefined : undefined,
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
      isProfessionalFeeWaived: this.isProfessionalFeeWaived,
      finalAmount: this.completionFinalAmount,
      professionalFeeWaivedReason: this.completionWaivedReason.trim()
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
    return this.apiService.get<PatientDto>(`/patients/${encodeURIComponent(booking.patientId)}`).pipe(
      map((patient) => mapPatientDetail(patient)),
      catchError(() =>
        this.patientState.getPatientById(booking.patientId).pipe(
          take(1),
          map((patient) => patient ?? buildFallbackPatient(booking))
        )
      )
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

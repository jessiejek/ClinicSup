import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, throwError } from 'rxjs';
import {
  Allergy,
  Consultation,
  Diagnosis,
  FollowUp,
  LabRequest,
  LabResult,
  Prescription,
  VitalSigns,
  VaccinationRecord
} from '../models';
import { ApiService } from './api.service';
import { MockDataService } from './mock-data.service';

export interface MedicalRecordsState {
  consultations: Consultation[];
  prescriptions: Prescription[];
  allergies: Allergy[];
  labRequests: LabRequest[];
  labResults: LabResult[];
  vaccinations: VaccinationRecord[];
  followUps: FollowUp[];
  isLoading: boolean;
  error: string | null;
}

type ConsultationDraft = Omit<Consultation, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};
type PrescriptionDraft = Omit<Prescription, 'id'> & { id?: string };
type AllergyDraft = Omit<Allergy, 'id'> & { id?: string };
type LabRequestDraft = Omit<LabRequest, 'id' | 'requestedAt' | 'status'> & {
  id?: string;
  requestedAt?: string;
  status?: LabRequest['status'];
};
type LabResultDraft = Omit<LabResult, 'id' | 'resultDate'> & {
  id?: string;
  resultDate?: string;
};
type VaccinationDraft = Omit<VaccinationRecord, 'id'> & { id?: string };
type FollowUpDraft = Omit<FollowUp, 'id'> & { id?: string };
type NullableString = string | null | undefined;

interface MedicalRecordsDto {
  consultations?: unknown[];
  prescriptions?: unknown[];
  allergies?: unknown[];
  labRequests?: unknown[];
  labResults?: unknown[];
  vaccinations?: unknown[];
  followUps?: unknown[];
}

interface ConsultationDto {
  id: string;
  bookingId?: NullableString;
  patientId?: NullableString;
  doctorId?: NullableString;
  consultationDate?: NullableString;
  generalNotes?: NullableString;
  consultationTime?: NullableString;
  chiefComplaint?: NullableString;
  subjective?: NullableString;
  objective?: NullableString;
  assessment?: NullableString;
  plan?: NullableString;
  vitalSigns?: unknown;
  diagnoses?: unknown[];
  prescriptions?: unknown[];
  labRequests?: unknown[];
  prescriptionIds?: string[];
  labRequestIds?: string[];
  followUpDate?: NullableString;
  status?: NullableString;
  isLocked?: boolean | null;
  createdAt?: NullableString;
  updatedAt?: NullableString;
  historyOfPresentIllness?: NullableString;
  peGeneralFindings?: NullableString;
  visitSummaryUrl?: NullableString;
}

interface VitalSignsDto {
  id?: NullableString;
  consultationId?: NullableString;
  patientId?: NullableString;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  temperatureCelsius?: number | null;
  temperature?: number | null;
  oxygenSaturation?: number | null;
  weightKg?: number | null;
  weight?: number | null;
  heightCm?: number | null;
  height?: number | null;
  bmi?: number | null;
  painScore?: number | null;
  takenAt?: NullableString;
  createdAt?: NullableString;
}

interface DiagnosisDto {
  id: string;
  consultationId?: NullableString;
  patientId?: NullableString;
  code?: NullableString;
  description?: NullableString;
  type?: NullableString;
  icd10Code?: NullableString;
  icd10Description?: NullableString;
}

interface PrescriptionDto {
  id: string;
  consultationId?: NullableString;
  patientId?: NullableString;
  doctorId?: NullableString;
  issuedAt?: NullableString;
  prescriptionDate?: NullableString;
  status?: NullableString;
  notes?: NullableString;
  items?: unknown[];
}

interface PrescriptionItemDto {
  id?: NullableString;
  prescriptionId?: NullableString;
  medicineName?: NullableString;
  genericName?: NullableString;
  brandName?: NullableString;
  dosageForm?: NullableString;
  strength?: NullableString;
  sig?: NullableString;
  quantity?: number | null;
  frequency?: NullableString;
  frequencyCode?: NullableString;
  duration?: NullableString;
  route?: NullableString;
  routeDescription?: NullableString;
  unitOfMeasure?: NullableString;
  unitOfMeasureDescription?: NullableString;
  instructions?: NullableString;
  isControlledSubstance?: boolean | null;
}

interface LabRequestDto {
  id: string;
  consultationId?: NullableString;
  patientId?: NullableString;
  doctorId?: NullableString;
  testName?: NullableString;
  reason?: NullableString;
  status?: NullableString;
  requestedAt?: NullableString;
}

interface LabResultDto {
  id: string;
  labRequestId?: NullableString;
  patientId?: NullableString;
  consultationId?: NullableString;
  fileName?: NullableString;
  resultDate?: NullableString;
  notes?: NullableString;
}

interface AllergyDto {
  id: string;
  patientId?: NullableString;
  allergen?: NullableString;
  reaction?: NullableString;
  severity?: NullableString;
  allergenName?: NullableString;
  allergenType?: NullableString;
  notes?: NullableString;
}

interface VaccinationDto {
  id: string;
  patientId?: NullableString;
  vaccineName?: NullableString;
  brandName?: NullableString;
  doseNumber?: number | string | null;
  lotNumber?: NullableString;
  dateGiven?: NullableString;
  administeredBy?: NullableString;
  dateAdministered?: NullableString;
  administeredByUserId?: NullableString;
  nextDoseDate?: NullableString;
  remarks?: NullableString;
}

interface FollowUpDto {
  id: string;
  consultationId?: NullableString;
  patientId?: NullableString;
  doctorId?: NullableString;
  followUpDate?: NullableString;
  reason?: NullableString;
  status?: NullableString;
  reminderEnabled?: boolean | null;
}

export interface ConsultationUpsertRequest {
  bookingId: string;
  chiefComplaint: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  historyOfPresentIllness?: string;
  peGeneralFindings?: string;
  followUpDate?: string;
  consultationTime?: string;
}

export interface DiagnosisUpsertRequest {
  icd10Code?: string;
  icd10Description?: string;
  description: string;
  type: Diagnosis['type'];
}

export interface PrescriptionUpsertRequest {
  notes?: string;
  items: Array<{
    medicineName: string;
    genericName?: string;
    dosageForm: string;
    strength: string;
    sig: string;
    quantity: number;
    frequency?: string;
    duration?: string;
    instructions?: string;
    isControlledSubstance?: boolean;
    route?: string;
    routeDescription?: string;
    unitOfMeasure?: string;
    unitOfMeasureDescription?: string;
    frequencyCode?: string;
    brandName?: string;
  }>;
}

export interface LabRequestUpsertRequest {
  testName: string;
  reason?: string;
}

const buildId = (prefix: string, currentId?: string): string =>
  currentId && currentId.trim().length > 0 ? currentId : `${prefix}-${Date.now()}`;

const sortNewestFirstByDate = <T>(items: T[], readDate: (item: T) => string): T[] =>
  [...items].sort((a, b) => new Date(readDate(b)).getTime() - new Date(readDate(a)).getTime());

@Injectable({ providedIn: 'root' })
export class MedicalRecordsService {
  private readonly apiService = inject(ApiService);
  private readonly mockData = inject(MockDataService);
  private readonly stateSubject = new BehaviorSubject<MedicalRecordsState>(this.readState(false));

  readonly state$ = this.stateSubject.asObservable();
  readonly isLoading$ = this.state$.pipe(map((state) => state.isLoading));
  readonly consultations$ = this.state$.pipe(map((state) => state.consultations));
  readonly prescriptions$ = this.state$.pipe(map((state) => state.prescriptions));
  readonly labRequests$ = this.state$.pipe(map((state) => state.labRequests));

  get snapshot(): MedicalRecordsState {
    return this.stateSubject.value;
  }

  refresh(): void {
    this.stateSubject.next(this.readState(false));
  }

  fetchConsultation(id: string): Observable<Consultation> {
    return this.apiService.get<ConsultationDto>(`/consultations/${encodeURIComponent(id)}`).pipe(
      map((consultation) => mapConsultationDto(consultation)),
      catchError((error) =>
        throwError(() => new Error(extractApiErrorMessage(error, 'Failed to load consultation.')))
      )
    );
  }

  createConsultation(body: ConsultationUpsertRequest): Observable<Consultation> {
    return this.apiService.post<ConsultationDto>('/consultations', body).pipe(
      map((consultation) => mapConsultationDto(consultation)),
      catchError((error) =>
        throwError(() => new Error(extractApiErrorMessage(error, 'Failed to save consultation draft.')))
      )
    );
  }

  updateConsultation(id: string, body: ConsultationUpsertRequest): Observable<Consultation> {
    return this.apiService.put<ConsultationDto>(`/consultations/${encodeURIComponent(id)}`, body).pipe(
      map((consultation) => mapConsultationDto(consultation)),
      catchError((error) =>
        throwError(() => new Error(extractApiErrorMessage(error, 'Failed to save consultation draft.')))
      )
    );
  }

  lockConsultation$(id: string): Observable<Consultation> {
    return this.apiService.post<ConsultationDto>(`/consultations/${encodeURIComponent(id)}/lock`, {}).pipe(
      map((consultation) => mapConsultationDto(consultation)),
      catchError((error) =>
        throwError(() => new Error(extractApiErrorMessage(error, 'Failed to lock consultation.')))
      )
    );
  }

  saveVitalSigns(consultationId: string, body: VitalSigns): Observable<VitalSigns> {
    return this.apiService
      .post<VitalSignsDto>(`/consultations/${encodeURIComponent(consultationId)}/vital-signs`, body)
      .pipe(
        map((vitalSigns) => mapVitalSignsDto(vitalSigns)),
        catchError((error) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to save vital signs.')))
        )
      );
  }

  addDiagnosis(consultationId: string, body: DiagnosisUpsertRequest): Observable<Diagnosis> {
    return this.apiService.post<DiagnosisDto>(`/consultations/${encodeURIComponent(consultationId)}/diagnoses`, body).pipe(
      map((diagnosis) => mapDiagnosisDto(diagnosis)),
      catchError((error) =>
        throwError(() => new Error(extractApiErrorMessage(error, 'Failed to save diagnosis.')))
      )
    );
  }

  deleteDiagnosis(consultationId: string, diagnosisId: string): Observable<void> {
    return this.apiService
      .delete<void>(`/consultations/${encodeURIComponent(consultationId)}/diagnoses/${encodeURIComponent(diagnosisId)}`)
      .pipe(
        catchError((error) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to remove diagnosis.')))
        )
      );
  }

  addPrescription(consultationId: string, body: PrescriptionUpsertRequest): Observable<Prescription> {
    return this.apiService
      .post<PrescriptionDto>(`/consultations/${encodeURIComponent(consultationId)}/prescriptions`, body)
      .pipe(
        map((prescription) => mapPrescriptionDto(prescription)),
        catchError((error) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to save prescription.')))
        )
      );
  }

  updatePrescription(
    consultationId: string,
    prescriptionId: string,
    body: PrescriptionUpsertRequest
  ): Observable<Prescription> {
    return this.apiService
      .put<PrescriptionDto>(
        `/consultations/${encodeURIComponent(consultationId)}/prescriptions/${encodeURIComponent(prescriptionId)}`,
        body
      )
      .pipe(
        map((prescription) => mapPrescriptionDto(prescription)),
        catchError((error) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to save prescription.')))
        )
      );
  }

  deletePrescription(consultationId: string, prescriptionId: string): Observable<void> {
    return this.apiService
      .delete<void>(
        `/consultations/${encodeURIComponent(consultationId)}/prescriptions/${encodeURIComponent(prescriptionId)}`
      )
      .pipe(
        catchError((error) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to remove prescription.')))
        )
      );
  }

  addLabRequest(consultationId: string, body: LabRequestUpsertRequest): Observable<LabRequest> {
    return this.apiService
      .post<LabRequestDto>(`/consultations/${encodeURIComponent(consultationId)}/lab-requests`, body)
      .pipe(
        map((labRequest) => mapLabRequestDto(labRequest)),
        catchError((error) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to save lab request.')))
        )
      );
  }

  deleteLabRequest(consultationId: string, requestId: string): Observable<void> {
    return this.apiService
      .delete<void>(
        `/consultations/${encodeURIComponent(consultationId)}/lab-requests/${encodeURIComponent(requestId)}`
      )
      .pipe(
        catchError((error) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to remove lab request.')))
        )
      );
  }

  fetchPatientMedicalRecords(patientId: string): Observable<MedicalRecordsState> {
    return this.apiService.get<MedicalRecordsDto>(`/patients/${encodeURIComponent(patientId)}/medical-records`).pipe(
      map((records) => mapMedicalRecordsDto(records)),
      catchError((error) => {
        const fallback = this.snapshot;
        return throwError(
          () => new Error(extractApiErrorMessage(error, fallback.error ?? 'Failed to load medical records.'))
        );
      })
    );
  }

  getConsultationByBookingId(bookingId: string): Observable<Consultation | undefined> {
    return this.consultations$.pipe(
      map((consultations) => consultations.find((item) => item.bookingId === bookingId))
    );
  }

  getConsultationsByPatientId(patientId: string): Observable<Consultation[]> {
    return this.consultations$.pipe(
      map((items) =>
        items
          .filter((item) => item.patientId === patientId)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      )
    );
  }

  getConsultationsByDoctorId(doctorId: string): Observable<Consultation[]> {
    return this.consultations$.pipe(
      map((items) =>
        items
          .filter((item) => item.doctorId === doctorId)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      )
    );
  }

  getPrescriptionsByPatientId(patientId: string): Observable<Prescription[]> {
    return this.prescriptions$.pipe(
      map((items) =>
        items
          .filter((item) => item.patientId === patientId)
          .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
      )
    );
  }

  getPrescriptionsByConsultationId(consultationId: string): Observable<Prescription[]> {
    return this.prescriptions$.pipe(
      map((items) =>
        items
          .filter((item) => item.consultationId === consultationId)
          .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
      )
    );
  }

  getAllergiesByPatientId(patientId: string): Observable<Allergy[]> {
    return this.state$.pipe(
      map((state) => state.allergies.filter((item) => item.patientId === patientId))
    );
  }

  getLabResultsByPatientId(patientId: string): Observable<LabResult[]> {
    return this.state$.pipe(
      map((state) =>
        state.labResults
          .filter((item) => item.patientId === patientId)
          .sort((a, b) => new Date(b.resultDate).getTime() - new Date(a.resultDate).getTime())
      )
    );
  }

  getLabRequestsByPatientId(patientId: string): Observable<LabRequest[]> {
    return this.labRequests$.pipe(
      map((items) =>
        items
          .filter((item) => item.patientId === patientId)
          .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
      )
    );
  }

  getLabRequestsByConsultationId(consultationId: string): Observable<LabRequest[]> {
    return this.labRequests$.pipe(
      map((items) =>
        items
          .filter((item) => item.consultationId === consultationId)
          .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
      )
    );
  }

  getVaccinationsByPatientId(patientId: string): Observable<VaccinationRecord[]> {
    return this.state$.pipe(
      map((state) =>
        state.vaccinations
          .filter((item) => item.patientId === patientId)
          .sort((a, b) => new Date(b.dateGiven).getTime() - new Date(a.dateGiven).getTime())
      )
    );
  }

  getFollowUpsByPatientId(patientId: string): Observable<FollowUp[]> {
    return this.state$.pipe(
      map((state) =>
        state.followUps
          .filter((item) => item.patientId === patientId)
          .sort((a, b) => new Date(b.followUpDate).getTime() - new Date(a.followUpDate).getTime())
      )
    );
  }

  saveConsultationLocal(consultation: ConsultationDraft): Consultation {
    const now = new Date().toISOString();
    const saved = this.mockData.saveConsultation({
      id: buildId('consult', consultation.id),
      bookingId: consultation.bookingId,
      patientId: consultation.patientId,
      doctorId: consultation.doctorId,
      consultationDate: consultation.consultationDate,
      consultationTime: consultation.consultationTime,
      chiefComplaint: consultation.chiefComplaint,
      subjective: consultation.subjective,
      objective: consultation.objective,
      assessment: consultation.assessment,
      plan: consultation.plan,
      vitalSigns: consultation.vitalSigns,
      diagnoses: consultation.diagnoses ?? [],
      prescriptionIds: consultation.prescriptionIds ?? [],
      labRequestIds: consultation.labRequestIds ?? [],
      followUpDate: consultation.followUpDate,
      status: consultation.status ?? 'Draft',
      isLocked: consultation.status === 'Completed' ? true : consultation.isLocked ?? false,
      createdAt: consultation.createdAt ?? now,
      updatedAt: consultation.updatedAt ?? now,
      historyOfPresentIllness: consultation.historyOfPresentIllness,
      peGeneralFindings: consultation.peGeneralFindings,
      visitSummaryUrl: consultation.visitSummaryUrl
    });
    this.refresh();
    return saved;
  }

  updateConsultationLocal(consultation: Consultation): Consultation {
    const saved = this.mockData.saveConsultation({
      ...consultation,
      updatedAt: consultation.updatedAt || new Date().toISOString()
    });
    this.refresh();
    return saved;
  }

  lockConsultationLocal(consultationId: string): void {
    const consultation = this.mockData.getConsultationById(consultationId);
    if (!consultation) {
      return;
    }
    this.mockData.saveConsultation({
      ...consultation,
      isLocked: true,
      status: 'Locked',
      updatedAt: new Date().toISOString()
    });
    this.refresh();
  }

  addPrescriptionLocal(prescription: PrescriptionDraft): Prescription {
    const saved = this.mockData.savePrescription({
      ...prescription,
      id: buildId('rx', prescription.id),
      issuedAt: prescription.issuedAt ?? new Date().toISOString(),
      status: prescription.status ?? 'Active',
      items: (prescription.items ?? []).map((item, index) => ({
        ...item,
        id: item.id || `rx-item-${Date.now()}-${index + 1}`,
        medicineName: item.medicineName || item.genericName || ''
      }))
    });
    this.refresh();
    return saved;
  }

  addAllergy(allergy: AllergyDraft): void {
    this.mockData.saveAllergy({ ...allergy, id: buildId('allergy', allergy.id) });
    this.refresh();
  }

  updateAllergy(allergy: Allergy): void {
    this.mockData.saveAllergy(allergy);
    this.refresh();
  }

  removeAllergy(allergyId: string): void {
    this.mockData.removeAllergy(allergyId);
    this.refresh();
  }

  addLabRequestLocal(labRequest: LabRequestDraft): void {
    this.mockData.saveLabRequest({
      ...labRequest,
      id: buildId('labreq', labRequest.id),
      requestedAt: labRequest.requestedAt ?? new Date().toISOString(),
      status: labRequest.status ?? 'Requested'
    });
    this.refresh();
  }

  addLabResult(labResult: LabResultDraft): void {
    this.mockData.saveLabResult({
      ...labResult,
      id: buildId('labres', labResult.id),
      resultDate: labResult.resultDate ?? new Date().toISOString()
    });
    this.refresh();
  }

  addVaccinationRecord(vaccinationRecord: VaccinationDraft): void {
    this.mockData.saveVaccinationRecord({
      ...vaccinationRecord,
      id: buildId('vac', vaccinationRecord.id)
    });
    this.refresh();
  }

  addFollowUp(followUp: FollowUpDraft): void {
    this.mockData.saveFollowUp({ ...followUp, id: buildId('fu', followUp.id) });
    this.refresh();
  }

  private readState(isLoading: boolean): MedicalRecordsState {
    return {
      consultations: sortNewestFirstByDate(this.mockData.getConsultations(), (item) => item.updatedAt),
      prescriptions: sortNewestFirstByDate(this.mockData.getPrescriptions(), (item) => item.issuedAt),
      allergies: this.mockData.getAllergies(),
      labRequests: this.mockData.getLabRequests(),
      labResults: this.mockData.getLabResults(),
      vaccinations: this.mockData.getVaccinations(),
      followUps: this.mockData.getFollowUps(),
      isLoading,
      error: null
    };
  }
}

function mapMedicalRecordsDto(dto: MedicalRecordsDto): MedicalRecordsState {
  return {
    consultations: ensureArray(dto.consultations).map((item) => mapConsultationDto(item as ConsultationDto)),
    prescriptions: ensureArray(dto.prescriptions).map((item) => mapPrescriptionDto(item as PrescriptionDto)),
    allergies: ensureArray(dto.allergies).map((item) => mapAllergyDto(item as AllergyDto)),
    labRequests: ensureArray(dto.labRequests).map((item) => mapLabRequestDto(item as LabRequestDto)),
    labResults: ensureArray(dto.labResults).map((item) => mapLabResultDto(item as LabResultDto)),
    vaccinations: ensureArray(dto.vaccinations).map((item) => mapVaccinationDto(item as VaccinationDto)),
    followUps: ensureArray(dto.followUps).map((item) => mapFollowUpDto(item as FollowUpDto)),
    isLoading: false,
    error: null
  };
}

function mapConsultationDto(dto: ConsultationDto): Consultation {
  const diagnoses = ensureArray(dto.diagnoses).map((item) => mapDiagnosisDto(item as DiagnosisDto));
  const prescriptions = ensureArray(dto.prescriptions).map((item) => mapPrescriptionDto(item as PrescriptionDto));
  const labRequests = ensureArray(dto.labRequests).map((item) => mapLabRequestDto(item as LabRequestDto));

  return {
    id: dto.id,
    bookingId: normalizeString(dto.bookingId) || '',
    patientId: normalizeString(dto.patientId) || '',
    doctorId: normalizeString(dto.doctorId) || '',
    consultationDate: normalizeString(dto.consultationDate) || '',
    generalNotes: normalizeString(dto.generalNotes),
    consultationTime: normalizeString(dto.consultationTime),
    chiefComplaint: normalizeString(dto.chiefComplaint) || '',
    subjective: normalizeString(dto.subjective) || '',
    objective: normalizeString(dto.objective) || '',
    assessment: normalizeString(dto.assessment) || '',
    plan: normalizeString(dto.plan) || '',
    vitalSigns: dto.vitalSigns ? mapVitalSignsDto(dto.vitalSigns as VitalSignsDto) : undefined,
    diagnoses,
    prescriptionIds:
      dto.prescriptionIds?.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) ??
      prescriptions.map((item) => item.id),
    labRequestIds:
      dto.labRequestIds?.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) ??
      labRequests.map((item) => item.id),
    followUpDate: normalizeString(dto.followUpDate),
    status: normalizeConsultationStatus(dto.status),
    isLocked: Boolean(dto.isLocked),
    createdAt: normalizeString(dto.createdAt) || new Date().toISOString(),
    updatedAt: normalizeString(dto.updatedAt) || normalizeString(dto.createdAt) || new Date().toISOString(),
    historyOfPresentIllness: normalizeString(dto.historyOfPresentIllness),
    peGeneralFindings: normalizeString(dto.peGeneralFindings),
    visitSummaryUrl: normalizeString(dto.visitSummaryUrl),
    prescriptions,
    labRequests
  };
}

function mapVitalSignsDto(dto: VitalSignsDto): VitalSigns {
  return {
    id: normalizeString(dto.id),
    consultationId: normalizeString(dto.consultationId),
    patientId: normalizeString(dto.patientId),
    bloodPressureSystolic: normalizeNumber(dto.bloodPressureSystolic),
    bloodPressureDiastolic: normalizeNumber(dto.bloodPressureDiastolic),
    heartRate: normalizeNumber(dto.heartRate),
    respiratoryRate: normalizeNumber(dto.respiratoryRate),
    temperatureCelsius: normalizeNumber(dto.temperatureCelsius ?? dto.temperature),
    oxygenSaturation: normalizeNumber(dto.oxygenSaturation),
    weightKg: normalizeNumber(dto.weightKg ?? dto.weight),
    heightCm: normalizeNumber(dto.heightCm ?? dto.height),
    bmi: normalizeNumber(dto.bmi),
    painScore: normalizeNumber(dto.painScore),
    takenAt: normalizeString(dto.takenAt),
    createdAt: normalizeString(dto.createdAt)
  };
}

function mapDiagnosisDto(dto: DiagnosisDto): Diagnosis {
  const icd10Code = normalizeString(dto.icd10Code) ?? normalizeString(dto.code);
  const icd10Description = normalizeString(dto.icd10Description) ?? normalizeString(dto.description);

  return {
    id: dto.id,
    consultationId: normalizeString(dto.consultationId),
    patientId: normalizeString(dto.patientId),
    code: icd10Code || normalizeString(dto.code) || '',
    description: normalizeString(dto.description) || icd10Description || '',
    type: normalizeDiagnosisType(dto.type),
    icd10Code,
    icd10Description
  };
}

function mapPrescriptionDto(dto: PrescriptionDto): Prescription {
  return {
    id: dto.id,
    consultationId: normalizeString(dto.consultationId) || '',
    patientId: normalizeString(dto.patientId) || '',
    doctorId: normalizeString(dto.doctorId) || '',
    issuedAt: normalizeString(dto.issuedAt) || new Date().toISOString(),
    prescriptionDate: normalizeString(dto.prescriptionDate),
    status: normalizePrescriptionStatus(dto.status),
    items: ensureArray(dto.items).map((item) => mapPrescriptionItemDto(item as PrescriptionItemDto)),
    notes: normalizeString(dto.notes)
  };
}

function mapPrescriptionItemDto(dto: PrescriptionItemDto): Prescription['items'][number] {
  return {
    id: normalizeString(dto.id) || `rx-item-${Date.now()}`,
    prescriptionId: normalizeString(dto.prescriptionId),
    medicineName: normalizeString(dto.medicineName) || '',
    genericName: normalizeString(dto.genericName),
    brandName: normalizeString(dto.brandName),
    dosageForm: normalizeString(dto.dosageForm) || 'Tablet',
    strength: normalizeString(dto.strength) || '',
    quantity: normalizeNumber(dto.quantity) ?? 1,
    sig: normalizeString(dto.sig) || '',
    frequency: normalizeString(dto.frequency),
    frequencyCode: normalizeString(dto.frequencyCode),
    duration: normalizeString(dto.duration),
    route: normalizeString(dto.route),
    routeDescription: normalizeString(dto.routeDescription),
    unitOfMeasure: normalizeString(dto.unitOfMeasure),
    unitOfMeasureDescription: normalizeString(dto.unitOfMeasureDescription),
    instructions: normalizeString(dto.instructions),
    isControlledSubstance: Boolean(dto.isControlledSubstance)
  };
}

function mapLabRequestDto(dto: LabRequestDto): LabRequest {
  return {
    id: dto.id,
    consultationId: normalizeString(dto.consultationId) || '',
    patientId: normalizeString(dto.patientId) || '',
    doctorId: normalizeString(dto.doctorId) || '',
    testName: normalizeString(dto.testName) || '',
    reason: normalizeString(dto.reason),
    status: normalizeLabRequestStatus(dto.status),
    requestedAt: normalizeString(dto.requestedAt) || new Date().toISOString()
  };
}

function mapLabResultDto(dto: LabResultDto): LabResult {
  return {
    id: dto.id,
    labRequestId: normalizeString(dto.labRequestId) || '',
    patientId: normalizeString(dto.patientId) || '',
    consultationId: normalizeString(dto.consultationId),
    fileName: normalizeString(dto.fileName) || '',
    resultDate: normalizeString(dto.resultDate) || '',
    notes: normalizeString(dto.notes)
  };
}

function mapAllergyDto(dto: AllergyDto): Allergy {
  return {
    id: dto.id,
    patientId: normalizeString(dto.patientId) || '',
    allergen: normalizeString(dto.allergen) || normalizeString(dto.allergenName) || '',
    reaction: normalizeString(dto.reaction) || '',
    severity: normalizeAllergySeverity(dto.severity),
    allergenName: normalizeString(dto.allergenName),
    allergenType: normalizeString(dto.allergenType) as Allergy['allergenType'],
    notes: normalizeString(dto.notes)
  };
}

function mapVaccinationDto(dto: VaccinationDto): VaccinationRecord {
  return {
    id: dto.id,
    patientId: normalizeString(dto.patientId) || '',
    vaccineName: normalizeString(dto.vaccineName) || '',
    brandName: normalizeString(dto.brandName),
    doseNumber: dto.doseNumber ?? undefined,
    lotNumber: normalizeString(dto.lotNumber),
    dateGiven: normalizeString(dto.dateGiven) || '',
    administeredBy: normalizeString(dto.administeredBy),
    dateAdministered: normalizeString(dto.dateAdministered),
    administeredByUserId: normalizeString(dto.administeredByUserId),
    nextDoseDate: normalizeString(dto.nextDoseDate),
    remarks: normalizeString(dto.remarks)
  };
}

function mapFollowUpDto(dto: FollowUpDto): FollowUp {
  return {
    id: dto.id,
    consultationId: normalizeString(dto.consultationId) || '',
    patientId: normalizeString(dto.patientId) || '',
    doctorId: normalizeString(dto.doctorId) || '',
    followUpDate: normalizeString(dto.followUpDate) || '',
    reason: normalizeString(dto.reason) || '',
    status: normalizeFollowUpStatus(dto.status),
    reminderEnabled: dto.reminderEnabled ?? undefined
  };
}

function normalizeConsultationStatus(value: NullableString): Consultation['status'] {
  switch (value) {
    case 'Completed':
    case 'Locked':
    case 'Amended':
      return value;
    default:
      return 'Draft';
  }
}

function normalizeDiagnosisType(value: NullableString): Diagnosis['type'] {
  switch (value) {
    case 'Secondary':
    case 'Differential':
    case 'Comorbidity':
      return value;
    default:
      return 'Primary';
  }
}

function normalizePrescriptionStatus(value: NullableString): Prescription['status'] {
  switch (value) {
    case 'Completed':
    case 'Cancelled':
      return value;
    default:
      return 'Active';
  }
}

function normalizeLabRequestStatus(value: NullableString): LabRequest['status'] {
  switch (value) {
    case 'Completed':
    case 'Cancelled':
      return value;
    default:
      return 'Requested';
  }
}

function normalizeFollowUpStatus(value: NullableString): FollowUp['status'] {
  switch (value) {
    case 'Completed':
    case 'Cancelled':
      return value;
    default:
      return 'Pending';
  }
}

function normalizeAllergySeverity(value: NullableString): Allergy['severity'] {
  switch (value) {
    case 'Mild':
    case 'Severe':
      return value;
    default:
      return 'Moderate';
  }
}

function normalizeNumber(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeString(value: NullableString): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
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

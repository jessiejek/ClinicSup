export interface PatientClinicalHistoryDto {
  patient: PatientClinicalHistoryPatientDto;
  summary: PatientClinicalHistorySummaryDto;
  timeline: PatientClinicalHistoryTimelineItemDto[];
  appointments: PatientClinicalHistoryAppointmentDto[];
  consultations: PatientClinicalHistoryConsultationDto[];
  documents: PatientClinicalHistoryDocumentDto[];
  labResults: PatientClinicalHistoryLabResultDto[];
  vaccinations: PatientClinicalHistoryVaccinationDto[];
  followUps: PatientClinicalHistoryFollowUpDto[];
  prescriptions: PatientClinicalHistoryPrescriptionDto[];
}

export interface PatientClinicalHistoryPatientDto {
  id: string;
  patientCode: string;
  fullName: string;
  dateOfBirth?: string | null;
  sex?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  lastVisitDate?: string | null;
  nextAppointmentDate?: string | null;
}

export interface PatientClinicalHistorySummaryDto {
  totalAppointments: number;
  completedConsultations: number;
  activePrescriptions: number;
  labResultsCount: number;
  documentsCount: number;
  vaccinationsCount: number;
  lastVisitDate?: string | null;
  nextAppointmentDate?: string | null;
}

export interface PatientClinicalHistoryTimelineItemDto {
  id: string;
  type: string;
  date: string;
  title: string;
  description?: string | null;
  bookingId?: string | null;
  status?: string | null;
}

export interface PatientClinicalHistoryAppointmentDto {
  bookingId: string;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  doctorId: string;
  doctorName: string;
  serviceName: string;
  serviceNames: string[];
  queueNumber?: number | null;
  status: string;
  paymentStatus: string;
}

export interface PatientClinicalHistoryConsultationDto {
  bookingId: string;
  consultationId?: string | null;
  appointmentDate: string;
  appointmentTime: string;
  doctorName: string;
  generalNotes?: string | null;
  vitalSigns?: Record<string, any> | null;
  soap?: Record<string, string | null> | null;
  diagnosesSummary?: string | null;
  diagnoses: PatientClinicalHistoryDiagnosisItemDto[];
  prescription?: Record<string, any> | null;
  labOrders: PatientClinicalHistoryLabOrderItemDto[];
  followUp?: Record<string, string | null> | null;
}

export interface PatientClinicalHistoryDiagnosisItemDto {
  id: string;
  diagnosisText: string;
  diagnosisCode?: string | null;
  isPrimary: boolean;
  notes?: string | null;
}

export interface PatientClinicalHistoryLabOrderItemDto {
  id: string;
  notes?: string | null;
  items: PatientClinicalHistoryLabOrderTestItemDto[];
}

export interface PatientClinicalHistoryLabOrderTestItemDto {
  id: string;
  testName: string;
  testCode?: string | null;
  instructions?: string | null;
}

export interface PatientClinicalHistoryDocumentDto {
  id: string;
  bookingId?: string | null;
  consultationId?: string | null;
  documentType: string;
  title?: string | null;
  description?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileContentType?: string | null;
  createdAt: string;
}

export interface PatientClinicalHistoryLabResultDto {
  id: string;
  bookingId?: string | null;
  consultationId?: string | null;
  resultTitle?: string | null;
  resultText?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileContentType?: string | null;
  createdAt: string;
}

export interface PatientClinicalHistoryVaccinationDto {
  id: string;
  vaccineName: string;
  administeredDate: string;
  doseNumber?: string | null;
  manufacturer?: string | null;
  lotNumber?: string | null;
  status: string;
  source: string;
  nextDueDate?: string | null;
  notes?: string | null;
  reactionNotes?: string | null;
}

export interface PatientClinicalHistoryFollowUpDto {
  followUpDate?: string | null;
  instructions?: string | null;
  reason?: string | null;
}

export interface PatientClinicalHistoryPrescriptionDto {
  prescriptionDate?: string | null;
  notes?: string | null;
  items: PatientClinicalHistoryPrescriptionItemDto[];
}

export interface PatientClinicalHistoryPrescriptionItemDto {
  medicationName: string;
  strength?: string | null;
  dosage?: string | null;
  route?: string | null;
  frequency?: string | null;
  duration?: string | null;
  quantity?: string | null;
  instructions?: string | null;
}

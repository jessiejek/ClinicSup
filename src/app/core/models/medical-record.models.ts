export type PrescriptionStatus = 'Active' | 'Completed' | 'Filled' | 'Expired' | 'Cancelled';

export type DiagnosisType = 'Primary' | 'Secondary' | 'Differential' | 'Comorbidity';

export type AllergenType = 'Drug' | 'Food' | 'Environmental' | 'Other';

export type AllergySeverity = 'Mild' | 'Moderate' | 'Severe';

export type AttachmentType =
  | 'CBC'
  | 'Urinalysis'
  | 'XRay'
  | 'ECG'
  | 'Ultrasound'
  | 'ReferralLetter'
  | 'MedCert'
  | 'VisitSummary'
  | 'PaymentReceipt'
  | 'Other';

export interface Consultation {
  id: string;
  bookingId: string;
  patientId: string;
  doctorId: string;
  consultationDate: string;
  generalNotes?: string;
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitalSigns?: VitalSigns;
  diagnoses: Diagnosis[];
  prescriptionIds: string[];
  labRequestIds: string[];
  followUpDate?: string;
  status: 'Draft' | 'Completed' | 'Locked' | 'Amended';
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  consultationTime?: string;
  historyOfPresentIllness?: string;
  peGeneralFindings?: string;
  visitSummaryUrl?: string;
  prescriptions?: Prescription[];
  labRequests?: LabRequest[];
}

export interface VitalSigns {
  id?: string;
  consultationId?: string;
  patientId?: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperatureCelsius?: number;
  temperature?: number;
  oxygenSaturation?: number;
  weightKg?: number;
  weight?: number;
  heightCm?: number;
  height?: number;
  bmi?: number;
  painScore?: number;
  takenAt?: string;
  createdAt?: string;
}

export interface Diagnosis {
  id: string;
  code: string;
  description: string;
  type: DiagnosisType;
  consultationId?: string;
  patientId?: string;
  icd10Code?: string;
  icd10Description?: string;
}

export interface Prescription {
  id: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  issuedAt: string;
  status: 'Active' | 'Completed' | 'Cancelled';
  items: PrescriptionItem[];
  notes?: string;
  prescriptionDate?: string;
}

export interface PrescriptionItem {
  id: string;
  medicineName: string;
  genericName?: string;
  dosageForm: string;
  strength: string;
  quantity: number;
  sig: string;
  frequency?: string;
  frequencyCode?: string;
  duration?: string;
  route?: string;
  routeDescription?: string;
  unitOfMeasure?: string;
  unitOfMeasureDescription?: string;
  instructions?: string;
  isControlledSubstance?: boolean;
  prescriptionId?: string;
  brandName?: string;
}

export interface Allergy {
  id: string;
  patientId: string;
  allergen: string;
  reaction: string;
  severity: AllergySeverity;
  allergenName?: string;
  allergenType?: AllergenType;
  notes?: string;
}

export interface PatientAttachment {
  id: string;
  patientId: string;
  consultationId?: string;
  attachmentType: AttachmentType;
  dateTaken: string;
  remarks?: string;
  fileUrl: string;
  fileName: string;
  interpretationNotes?: string;
}

export interface VaccinationRecord {
  id: string;
  patientId: string;
  vaccineName: string;
  brandName?: string;
  doseNumber?: number | string;
  lotNumber?: string;
  dateGiven: string;
  administeredBy?: string;
  dateAdministered?: string;
  administeredByUserId?: string;
  nextDoseDate?: string;
  remarks?: string;
}

export interface LabRequest {
  id: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  testName: string;
  reason?: string;
  status: 'Requested' | 'Completed' | 'Cancelled';
  requestedAt: string;
}

export interface LabResult {
  id: string;
  labRequestId: string;
  patientId: string;
  fileName: string;
  resultDate: string;
  notes?: string;
  consultationId?: string;
}

export interface FollowUp {
  id: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  followUpDate: string;
  reason: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  reminderEnabled?: boolean;
}

export interface MockDrug {
  id: string;
  medicineName: string;
  genericName?: string;
}

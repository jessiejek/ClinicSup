export interface PatientMedicalRecord {
  id: string;
  bookingId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  diagnosis?: string;
  soapNotes?: string;
  doctorNotes?: string;
  followUpInstructions?: string;
  followUpDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientPrescriptionItem {
  id: string;
  medicineName: string;
  genericName?: string;
  dosageForm?: string;
  strength?: string;
  sig?: string;
  quantity: number;
  frequency?: string;
  duration?: string;
  instructions?: string;
  isControlledSubstance?: boolean;
  route?: string;
  routeDescription?: string;
  unitOfMeasure?: string;
  unitOfMeasureDescription?: string;
  brandName?: string;
  frequencyCode?: string;
}

export interface PatientPrescription {
  id: string;
  bookingId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  medicineName?: string;
  genericName?: string;
  strength?: string;
  unit?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  createdAt: string;
  items: PatientPrescriptionItem[];
}

export interface PatientFollowUp {
  id: string;
  bookingId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  followUpDate?: string;
  followUpInstructions?: string;
  notes?: string;
  createdAt: string;
}

export interface PatientDocument {
  id: string;
  patientId: string;
  bookingId?: string;
  consultationId?: string;
  documentType: string;
  title?: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileContentType?: string;
  fileSize?: number;
  source: string;
  uploadedByUserId?: string;
  uploadedAt: string;
  createdAt: string;
}

export interface PatientLabResult {
  id: string;
  patientId: string;
  bookingId?: string;
  consultationId?: string;
  labOrderItemId?: string;
  resultTitle?: string;
  resultText?: string;
  fileUrl: string;
  fileName: string;
  fileContentType?: string;
  status: string;
  uploadedByUserId?: string;
  uploadedAt: string;
  createdAt: string;
}

export interface PatientDocumentUploadRequest {
  file: File;
  bookingId?: string;
  consultationId?: string;
  documentType?: string;
  title?: string;
  description?: string;
}

export interface PatientLabResultUploadRequest {
  file: File;
  bookingId?: string;
  consultationId?: string;
  resultTitle?: string;
  resultText?: string;
}

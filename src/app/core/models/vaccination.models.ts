export interface PatientVaccinationDto {
  id: string;
  patientId: string;
  bookingId?: string | null;
  consultationId?: string | null;
  doctorId?: string | null;
  administeredByUserId?: string | null;
  vaccineName: string;
  vaccineCode?: string | null;
  manufacturer?: string | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
  administeredDate: string;
  doseNumber?: string | null;
  doseAmount?: number | null;
  doseUnit?: string | null;
  route?: string | null;
  site?: string | null;
  status: VaccinationStatus;
  source: VaccinationSource;
  nextDueDate?: string | null;
  visEditionDate?: string | null;
  visProvidedDate?: string | null;
  notes?: string | null;
  reactionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientVaccinationRequest {
  bookingId?: string | null;
  consultationId?: string | null;
  doctorId?: string | null;
  vaccineName: string;
  vaccineCode?: string | null;
  manufacturer?: string | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
  administeredDate: string;
  doseNumber?: string | null;
  doseAmount?: number | null;
  doseUnit?: string | null;
  route?: string | null;
  site?: string | null;
  status: VaccinationStatus;
  source: VaccinationSource;
  nextDueDate?: string | null;
  visEditionDate?: string | null;
  visProvidedDate?: string | null;
  notes?: string | null;
  reactionNotes?: string | null;
}

export type UpdatePatientVaccinationRequest = CreatePatientVaccinationRequest;

export type VaccinationStatus = 'Completed' | 'NotDone' | 'EnteredInError';
export type VaccinationSource = 'AdministeredInClinic' | 'Historical' | 'PatientReported' | 'ExternalRecord';

export const VACCINATION_STATUS_OPTIONS: VaccinationStatus[] = [
  'Completed',
  'NotDone',
  'EnteredInError'
];

export const VACCINATION_SOURCE_OPTIONS: VaccinationSource[] = [
  'AdministeredInClinic',
  'Historical',
  'PatientReported',
  'ExternalRecord'
];

export const VACCINATION_ROUTE_OPTIONS = [
  'Oral',
  'Intramuscular (IM)',
  'Subcutaneous (SC)',
  'Intradermal (ID)',
  'Intranasal',
  'Topical'
];

export const VACCINATION_SITE_OPTIONS = [
  'Left Deltoid',
  'Right Deltoid',
  'Left Thigh',
  'Right Thigh',
  'Left Gluteal',
  'Right Gluteal',
  'Oral',
  'Nasal'
];

export const VACCINATION_DOSE_UNIT_OPTIONS = [
  'mL',
  'mg',
  'mcg',
  'IU',
  'Dose'
];

export function defaultCreateVaccinationPayload(): CreatePatientVaccinationRequest {
  const today = new Date().toISOString().slice(0, 10);
  return {
    vaccineName: '',
    administeredDate: today,
    status: 'Completed',
    source: 'AdministeredInClinic',
    bookingId: null,
    consultationId: null,
    doctorId: null,
    vaccineCode: null,
    manufacturer: null,
    lotNumber: null,
    expirationDate: null,
    doseNumber: null,
    doseAmount: null,
    doseUnit: null,
    route: null,
    site: null,
    nextDueDate: null,
    visEditionDate: null,
    visProvidedDate: null,
    notes: null,
    reactionNotes: null
  };
}

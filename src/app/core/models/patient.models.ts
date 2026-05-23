export interface PatientSummary {
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

export interface PatientDetail {
  id: string;
  patientCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  civilStatus?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  contactNumber?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  emergencyContactRelationship?: string;
  bloodType?: string;
  philHealthNumber?: string;
  hmoProvider?: string;
  hmoCardNumber?: string;
  userId?: string;
  hasAccount?: boolean;
  isEmailVerified?: boolean;
  isGuest: boolean;
  consentedAt?: string;
  consentVersion?: string;
}

export interface CreatePatientRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  civilStatus?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  contactNumber?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  emergencyContactRelationship?: string;
  bloodType?: string;
  philHealthNumber?: string;
  hmoProvider?: string;
  hmoCardNumber?: string;
  userId?: string | null;
}

export type UpdatePatientRequest = Partial<CreatePatientRequest>;

export interface CreatePatientPortalAccountRequest {
  email: string;
  temporaryPassword: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount?: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type Patient = PatientDetail;

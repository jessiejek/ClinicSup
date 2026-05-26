import {
  Allergy,
  Booking,
  Consultation,
  Doctor,
  FollowUp,
  LabRequest,
  LabResult,
  Patient,
  Prescription,
  VaccinationRecord
} from '../../../core/models';
import { CreatePatientVaccinationRequest } from '../../../core/models/vaccination.models';
import { FollowUpDraftView } from '../components/follow-up-form/follow-up-form.component';
import { LabRequestDraftView } from '../components/lab-request-form/lab-request-form.component';
import { SoapFormValue } from '../components/soap-form/soap-form.component';

export interface ConsultationPageVm {
  booking: Booking;
  patient: Patient;
  doctor: Doctor;
  consultation: Consultation | null;
  soap: SoapFormValue;
  existingPrescription: Prescription | null;
  allergies: Allergy[];
  labRequests: LabRequest[];
  labResults: LabResult[];
  vaccinations: VaccinationRecord[];
  followUps: FollowUp[];
  labRequestDrafts: LabRequestDraftView[];
  followUpDraft: FollowUpDraftView | null;
  pendingVaccinations: CreatePatientVaccinationRequest[];
  recentConsultations: Consultation[];
}

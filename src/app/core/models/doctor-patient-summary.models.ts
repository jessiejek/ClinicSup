export interface DoctorPatientSummaryDto {
  patientId: string;
  patientName: string;
  patientCode?: string | null;
  latestDate: string;
  latestTime?: string | null;
  services: string;
  status: string;
  queueNumber?: number | null;
  latestBookingId: string;
}

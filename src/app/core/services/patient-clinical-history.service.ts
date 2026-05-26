import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, firstValueFrom, forkJoin, map, of } from 'rxjs';
import {
  Consultation,
  FollowUp,
  LabResult,
  PatientClinicalHistoryAppointmentDto,
  PatientClinicalHistoryConsultationDto,
  PatientClinicalHistoryDto,
  PatientClinicalHistoryPatientDto,
  PatientClinicalHistorySummaryDto,
  Prescription,
  VaccinationRecord
} from '../models';
import { MedicalRecordsService } from './medical-records.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class PatientClinicalHistoryService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly medicalRecords = inject(MedicalRecordsService);

  getPatientClinicalHistory(patientId: string): Observable<PatientClinicalHistoryDto | null> {
    return from(this.buildHistory(patientId)).pipe(
      catchError((error) => {
        console.error('[PatientClinicalHistoryService] failed to load history', error);
        return of(null);
      })
    );
  }

  private async buildHistory(patientId: string): Promise<PatientClinicalHistoryDto> {
    const { data: patientRow, error: patientError } = await this.supabase
      .from('patients')
      .select('id, patient_code, first_name, middle_name, last_name, date_of_birth, sex, contact_number, contact_email')
      .eq('id', patientId)
      .maybeSingle();

    if (patientError) {
      throw patientError;
    }

    const patient: PatientClinicalHistoryPatientDto = {
      id: patientId,
      patientCode: trimStr(patientRow?.patient_code) || patientId,
      fullName: composeName(patientRow?.first_name, patientRow?.middle_name, patientRow?.last_name),
      dateOfBirth: trimStr(patientRow?.date_of_birth),
      sex: trimStr(patientRow?.sex),
      contactNumber: trimStr(patientRow?.contact_number),
      email: trimStr(patientRow?.contact_email)
    };

    const [bookingRowsResult, records] = await Promise.all([
      this.supabase
        .from('patient_bookings_view')
        .select('*')
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false })
        .limit(50),
      firstValueFrom(
        forkJoin({
          consultations: this.medicalRecords.getConsultationsByPatientId(patientId),
          prescriptions: this.medicalRecords.getPrescriptionsByPatientId(patientId),
          labResults: this.medicalRecords.getLabResultsByPatientId(patientId),
          vaccinations: this.medicalRecords.getVaccinationsByPatientId(patientId),
          followUps: this.medicalRecords.getFollowUpsByPatientId(patientId)
        })
      )
    ]);

    const { data: bookingRows, error: bookingError } = bookingRowsResult;
    if (bookingError) {
      throw bookingError;
    }

    const bookings = (bookingRows ?? []) as Record<string, unknown>[];
    const bookingMap = new Map(bookings.map((row) => [trimStr(row['booking_id']) ?? '', row] as const));
    const consultations = records.consultations.slice(0, 10);

    const lastVisitDate = consultations[0]?.consultationDate ?? trimStr(bookings[0]?.['appointment_date']);
    const nextAppointmentDate = bookings.find((row) => ['Confirmed', 'CheckedIn'].includes(trimStr(row['booking_status']) ?? ''))?.['appointment_date'];

    const summary: PatientClinicalHistorySummaryDto = {
      totalAppointments: bookings.length,
      completedConsultations: consultations.length,
      activePrescriptions: records.prescriptions.length,
      labResultsCount: records.labResults.length,
      documentsCount: 0,
      vaccinationsCount: records.vaccinations.length,
      lastVisitDate,
      nextAppointmentDate: trimStr(nextAppointmentDate)
    };

    const appointments: PatientClinicalHistoryAppointmentDto[] = bookings.slice(0, 10).map((row) => ({
      bookingId: trimStr(row['booking_id']) ?? '',
      appointmentDate: trimStr(row['appointment_date']) ?? '',
      slotStartTime: trimStr(row['slot_start_time']) ?? '',
      slotEndTime: trimStr(row['slot_end_time']) ?? '',
      doctorId: trimStr(row['doctor_id']) ?? '',
      doctorName: trimStr(row['doctor_name']) ?? 'Doctor',
      serviceName: trimStr(row['service_name']) ?? '',
      serviceNames: (row['service_names'] as string[]) ?? [],
      queueNumber: normalizeNum(row['queue_number']),
      status: trimStr(row['booking_status']) ?? '',
      paymentStatus: trimStr(row['payment_status']) ?? ''
    }));

    const consultationsDto = consultations.map((consultation) => this.mapConsultation(consultation, bookingMap));
    const timeline = consultationsDto.map((consultation) => ({
      id: consultation.consultationId ?? consultation.bookingId,
      type: 'Consultation',
      date: consultation.appointmentDate,
      title: `${consultation.doctorName} - ${consultation.followUp?.['followUpDate'] ? 'Follow-up recorded' : 'Consultation'}`,
      description:
        consultation.diagnosesSummary || consultation.generalNotes || consultation.soap?.['chiefComplaint'] || 'Consultation record',
      bookingId: consultation.bookingId,
      status: consultation.followUp?.['followUpDate'] ? 'Follow-up' : consultation.generalNotes ? 'Completed' : 'Draft'
    }));

    return {
      patient,
      summary,
      timeline,
      appointments,
      consultations: consultationsDto,
      documents: [],
      labResults: records.labResults.map((item: LabResult) => ({
        id: item.id,
        bookingId: item.consultationId ?? null,
        consultationId: item.consultationId ?? null,
        resultTitle: item.fileName,
        resultText: item.notes,
        fileUrl: null,
        fileName: item.fileName,
        fileContentType: null,
        createdAt: item.resultDate
      })),
      vaccinations: records.vaccinations.map((item: VaccinationRecord) => ({
        id: item.id,
        vaccineName: item.vaccineName,
        administeredDate: item.dateGiven,
        doseNumber: item.doseNumber == null ? undefined : String(item.doseNumber),
        manufacturer: item.brandName,
        lotNumber: item.lotNumber,
        status: 'Recorded',
        source: 'supabase',
        nextDueDate: item.nextDoseDate,
        notes: item.remarks
      })),
      followUps: records.followUps.map((item: FollowUp) => ({
        followUpDate: item.followUpDate,
        instructions: item.reason,
        reason: item.reason
      })),
      prescriptions: records.prescriptions.map((item: Prescription) => ({
        prescriptionDate: item.issuedAt,
        notes: item.notes,
        items: item.items.map((entry) => ({
          medicationName: entry.medicineName,
          strength: entry.strength,
          dosage: entry.sig,
          route: entry.route ?? entry.routeDescription,
          frequency: entry.frequency ?? entry.frequencyCode,
          duration: entry.duration,
          quantity: entry.quantity == null ? null : String(entry.quantity),
          instructions: entry.instructions
        }))
      }))
    };
  }

  private mapConsultation(
    consultation: Consultation,
    bookingMap: Map<string, Record<string, unknown>>
  ): PatientClinicalHistoryConsultationDto {
    const booking = bookingMap.get(consultation.bookingId);
    const doctorName = booking ? trimStr(booking['doctor_name']) || 'Doctor' : 'Doctor';

    return {
      bookingId: consultation.bookingId,
      consultationId: consultation.id,
      appointmentDate: consultation.consultationDate,
      appointmentTime: consultation.consultationTime ?? '',
      doctorName,
      generalNotes: consultation.generalNotes ?? null,
      vitalSigns: consultation.vitalSigns ?? null,
      soap: {
        chiefComplaint: consultation['chiefComplaint'] ?? '',
        subjective: consultation['subjective'] ?? '',
        objective: consultation['objective'] ?? '',
        assessment: consultation['assessment'] ?? '',
        plan: consultation['plan'] ?? ''
      },
      diagnosesSummary: consultation.diagnoses.map((diagnosis) => `${diagnosis.code} - ${diagnosis.description}`).join(', '),
      diagnoses: consultation.diagnoses.map((diagnosis) => ({
        id: diagnosis.id,
        diagnosisText: diagnosis.description,
        diagnosisCode: diagnosis.code || diagnosis.icd10Code,
        isPrimary: diagnosis.type === 'Primary',
        notes: diagnosis.type === 'Primary' ? null : diagnosis.type
      })),
      prescription: consultation.prescriptions?.[0]
        ? {
            id: consultation.prescriptions[0].id,
            notes: consultation.prescriptions[0].notes ?? null,
            items: consultation.prescriptions[0].items.map((item) => ({
              id: item.id,
              medicationName: item.medicineName,
              strength: item.strength,
              dosage: item.sig,
              route: item.route ?? item.routeDescription,
              frequency: item.frequency ?? item.frequencyCode,
              duration: item.duration,
              quantity: item.quantity == null ? null : String(item.quantity),
              instructions: item.instructions
            }))
          }
        : null,
      labOrders: (consultation.labRequests ?? []).map((request) => ({
        id: request.id,
        notes: request.reason ?? null,
        items: [
          {
            id: request.id,
            testName: request.testName,
            testCode: request.testName,
            instructions: request.reason ?? null
          }
        ]
      })),
      followUp: consultation['followUpDate']
        ? {
            followUpDate: consultation['followUpDate'],
            instructions: consultation.generalNotes ?? null,
            reason: consultation.generalNotes ?? null
          }
        : null
    };
  }
}

function trimStr(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t || undefined;
}

function composeName(first: unknown, middle: unknown, last: unknown): string {
  const parts = [first, middle, last]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0);
  return parts.length ? parts.join(' ') : 'Patient';
}

function normalizeNum(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  return Number.isFinite(value) ? value : null;
}

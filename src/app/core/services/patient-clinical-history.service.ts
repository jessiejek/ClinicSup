import { Injectable, inject } from '@angular/core';
import { Observable, catchError, firstValueFrom, forkJoin, from, of } from 'rxjs';
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
import { ApiService } from './api.service';
import { MedicalRecordsService } from './medical-records.service';

@Injectable({ providedIn: 'root' })
export class PatientClinicalHistoryService {
  private readonly api = inject(ApiService);
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
    const [patientRow, bookingRows, records] = await Promise.all([
      this.api.get<any>(`patients/${patientId}`).toPromise(),
      this.api.get<any[]>(`bookings?patientId=${patientId}&pageSize=50`).toPromise(),
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

    const patient: PatientClinicalHistoryPatientDto = {
      id: patientId,
      patientCode: trimStr(patientRow?.patientCode) || patientId,
      fullName: composeName(patientRow?.firstName, patientRow?.middleName, patientRow?.lastName),
      dateOfBirth: trimStr(patientRow?.dateOfBirth),
      sex: trimStr(patientRow?.sex),
      contactNumber: trimStr(patientRow?.contactNumber),
      email: trimStr(patientRow?.email)
    };

    const bookingRowsArr = Array.isArray(bookingRows) ? bookingRows : [];
    const bookingMap = new Map(bookingRowsArr.map((row: any) => [trimStr(row['id'] ?? row['booking_id']) ?? '', row]));
    const consultations = records.consultations.slice(0, 10);

    const lastVisitDate = consultations[0]?.consultationDate ?? trimStr(bookingRowsArr[0]?.['appointmentDate']);
    const nextAppointmentDate = bookingRowsArr.find((row: any) =>
      ['Confirmed', 'CheckedIn'].includes(trimStr(row['status']) ?? '')
    )?.['appointmentDate'];

    const summary: PatientClinicalHistorySummaryDto = {
      totalAppointments: bookingRowsArr.length,
      completedConsultations: consultations.length,
      activePrescriptions: records.prescriptions.length,
      labResultsCount: records.labResults.length,
      documentsCount: 0,
      vaccinationsCount: records.vaccinations.length,
      lastVisitDate,
      nextAppointmentDate: trimStr(nextAppointmentDate)
    };

    const appointments: PatientClinicalHistoryAppointmentDto[] = bookingRowsArr.slice(0, 10).map((row: any) => ({
      bookingId: trimStr(row['id'] ?? row['booking_id']) ?? '',
      appointmentDate: trimStr(row['appointmentDate'] ?? row['appointment_date']) ?? '',
      slotStartTime: trimStr(row['slotStartTime'] ?? row['slot_start_time']) ?? '',
      slotEndTime: trimStr(row['slotEndTime'] ?? row['slot_end_time']) ?? '',
      doctorId: trimStr(row['doctorId'] ?? row['doctor_id']) ?? '',
      doctorName: trimStr(row['doctorName'] ?? row['doctor_name']) ?? 'Doctor',
      serviceName: trimStr(row['serviceName'] ?? row['service_name']) ?? '',
      serviceNames: (row['serviceNames'] ?? row['service_names'] ?? []) as string[],
      queueNumber: normalizeNum(row['queueNumber'] ?? row['queue_number']),
      status: trimStr(row['status'] ?? row['booking_status']) ?? '',
      paymentStatus: trimStr(row['paymentStatus'] ?? row['payment_status']) ?? ''
    }));

    // ... same mappings as before
    return {
      patient,
      summary,
      timeline: [],
      appointments,
      consultations: consultations.map((c: Consultation) => this.mapConsultation(c, bookingMap)),
      documents: [],
      labResults: records.labResults.map((item: LabResult) => ({
        id: item.id,
        bookingId: item.consultationId ?? null,
        consultationId: item.consultationId ?? null,
        resultTitle: item.fileName,
        resultText: (item as any).notes,
        fileUrl: null,
        fileName: item.fileName,
        fileContentType: null,
        createdAt: (item as any).resultDate
      })),
      vaccinations: records.vaccinations.map((item: VaccinationRecord) => ({
        id: item.id,
        vaccineName: item.vaccineName,
        administeredDate: item.dateGiven,
        doseNumber: item.doseNumber == null ? undefined : String(item.doseNumber),
        manufacturer: item.brandName,
        lotNumber: item.lotNumber,
        status: 'Recorded' as const,
        source: 'supabase' as const,
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
    const doctorName = booking ? trimStr(booking['doctorName'] ?? booking['doctor_name']) || 'Doctor' : 'Doctor';
    return {
      bookingId: consultation.bookingId,
      consultationId: consultation.id,
      appointmentDate: consultation.consultationDate,
      appointmentTime: consultation.consultationTime ?? '',
      doctorName,
      generalNotes: consultation.generalNotes ?? null,
      vitalSigns: consultation.vitalSigns ?? null,
      soap: {
        chiefComplaint: (consultation as any).chiefComplaint ?? '',
        subjective: consultation.subjective ?? '',
        objective: consultation.objective ?? '',
        assessment: consultation.assessment ?? '',
        plan: consultation.plan ?? ''
      },
      diagnosesSummary: consultation.diagnoses.map((d) => `${d.code} - ${d.description}`).join(', '),
      diagnoses: consultation.diagnoses.map((d) => ({
        id: d.id,
        diagnosisText: d.description,
        diagnosisCode: d.code || d.icd10Code,
        isPrimary: d.type === 'Primary',
        notes: d.type === 'Primary' ? null : d.type
      })),
      prescription: consultation.prescriptions?.[0] ? {
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
      } : null,
      labOrders: (consultation.labRequests ?? []).map((request) => ({
        id: request.id,
        notes: (request as any).reason ?? null,
        items: [{ id: request.id, testName: request.testName, testCode: request.testName, instructions: (request as any).reason ?? null }]
      })),
      followUp: (consultation as any).followUpDate ? {
        followUpDate: (consultation as any).followUpDate,
        instructions: consultation.generalNotes ?? null,
        reason: consultation.generalNotes ?? null
      } : null
    };
  }
}

function trimStr(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t || undefined;
}

function composeName(first: unknown, middle: unknown, last: unknown): string {
  const parts = [first, middle, last].map((v) => (typeof v === 'string' ? v.trim() : '')).filter((v) => v.length > 0);
  return parts.length ? parts.join(' ') : 'Patient';
}

function normalizeNum(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  return Number.isFinite(value) ? value : null;
}

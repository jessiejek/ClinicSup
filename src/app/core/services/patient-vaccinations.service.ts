import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  PatientVaccinationDto,
  CreatePatientVaccinationRequest,
  UpdatePatientVaccinationRequest
} from '../models/vaccination.models';

/**
 * Vaccination feature — Supabase patient_vaccinations table is planned but not yet deployed.
 * Until the table is available, this service returns empty arrays and throws safe errors
 * for mutations to prevent old .NET API calls.
 */
@Injectable({ providedIn: 'root' })
export class PatientVaccinationsService {

  getPatientVaccinations(patientId: string): Observable<PatientVaccinationDto[]> {
    console.info('PatientVaccinationsService: not available yet — patient_vaccinations table not deployed.');
    return of([]);
  }

  createPatientVaccination(
    patientId: string,
    payload: CreatePatientVaccinationRequest
  ): Observable<PatientVaccinationDto> {
    throw new Error('Vaccination create is not available until patient_vaccinations table is deployed.');
  }

  updatePatientVaccination(
    patientId: string,
    vaccinationId: string,
    payload: UpdatePatientVaccinationRequest
  ): Observable<PatientVaccinationDto> {
    throw new Error('Vaccination update is not available until patient_vaccinations table is deployed.');
  }

  deletePatientVaccination(patientId: string, vaccinationId: string): Observable<void> {
    throw new Error('Vaccination delete is not available until patient_vaccinations table is deployed.');
  }

  getMyVaccinations(): Observable<PatientVaccinationDto[]> {
    console.info('PatientVaccinationsService: not available yet — patient_vaccinations table not deployed.');
    return of([]);
  }
}

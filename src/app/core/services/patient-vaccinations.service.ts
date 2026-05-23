import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  PatientVaccinationDto,
  CreatePatientVaccinationRequest,
  UpdatePatientVaccinationRequest
} from '../models/vaccination.models';

@Injectable({ providedIn: 'root' })
export class PatientVaccinationsService {
  private readonly api = inject(ApiService);

  getPatientVaccinations(patientId: string): Observable<PatientVaccinationDto[]> {
    return this.api.get<PatientVaccinationDto[]>(`/patients/${encodeURIComponent(patientId)}/vaccinations`);
  }

  createPatientVaccination(
    patientId: string,
    payload: CreatePatientVaccinationRequest
  ): Observable<PatientVaccinationDto> {
    return this.api.post<PatientVaccinationDto>(
      `/patients/${encodeURIComponent(patientId)}/vaccinations`,
      payload
    );
  }

  updatePatientVaccination(
    patientId: string,
    vaccinationId: string,
    payload: UpdatePatientVaccinationRequest
  ): Observable<PatientVaccinationDto> {
    return this.api.put<PatientVaccinationDto>(
      `/patients/${encodeURIComponent(patientId)}/vaccinations/${encodeURIComponent(vaccinationId)}`,
      payload
    );
  }

  deletePatientVaccination(patientId: string, vaccinationId: string): Observable<void> {
    return this.api.delete<void>(
      `/patients/${encodeURIComponent(patientId)}/vaccinations/${encodeURIComponent(vaccinationId)}`
    );
  }

  getMyVaccinations(): Observable<PatientVaccinationDto[]> {
    return this.api.get<PatientVaccinationDto[]>('/patients/me/vaccinations');
  }
}

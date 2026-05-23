import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Patient } from '../models';
import { MockDataService } from './mock-data.service';

const toPatientCode = (count: number): string =>
  `PT-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;

@Injectable({ providedIn: 'root' })
export class PatientStateService {
  private readonly mockData = inject(MockDataService);
  private readonly patientsSubject = new BehaviorSubject<Patient[]>(this.mockData.getPatients());
  private readonly loadingSubject = new BehaviorSubject(false);

  readonly patients$ = this.patientsSubject.asObservable();
  readonly isLoading$ = this.loadingSubject.asObservable();

  refresh(): void {
    this.patientsSubject.next(this.mockData.getPatients());
  }

  getPatients(): Observable<Patient[]> {
    return this.patients$;
  }

  getPatientById(id: string): Observable<Patient | undefined> {
    return this.patients$.pipe(map((patients) => patients.find((patient) => patient.id === id)));
  }

  getPatientByUserId(userId: string): Observable<Patient | undefined> {
    return this.patients$.pipe(
      map((patients) => patients.find((patient) => patient.userId === userId))
    );
  }

  getFilteredPatients(query: string): Observable<Patient[]> {
    return this.patients$.pipe(map((patients) => this.filterPatients(patients, query)));
  }

  addPatient(patient: Omit<Patient, 'id' | 'patientCode'>): Patient {
    const saved: Patient = {
      ...patient,
      id: `pat-${Date.now()}`,
      patientCode: toPatientCode(this.patientsSubject.value.length + 1)
    };
    this.upsert(saved);
    return saved;
  }

  savePatient(patient: Patient): void {
    this.mockData.updatePatient(patient);
    this.upsert(patient);
  }

  updatePatientConsent(patientId: string, consentVersion: string): void {
    this.mockData.updatePatientConsent(patientId, consentVersion);
    this.patientsSubject.next(this.mockData.getPatients());
  }

  private upsert(patient: Patient): void {
    this.patientsSubject.next([
      ...this.patientsSubject.value.filter((item) => item.id !== patient.id),
      { ...patient }
    ]);
  }

  private filterPatients(patients: Patient[], query: string): Patient[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return patients;
    }

    return patients.filter((patient) =>
      [
        patient.firstName,
        patient.lastName,
        patient.patientCode,
        patient.email ?? '',
        patient.contactNumber ?? ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }
}

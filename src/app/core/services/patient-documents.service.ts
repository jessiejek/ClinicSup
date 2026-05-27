import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PatientDocument, PatientLabResult, PatientDocumentUploadRequest, PatientLabResultUploadRequest } from '../models';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PatientDocumentsService {
  private readonly apiService = inject(ApiService);

  // ── List methods ──

  getPatientDocuments(patientId: string, bookingId?: string): Observable<PatientDocument[]> {
    let endpoint = `patients/${patientId}/documents`;
    if (bookingId) endpoint += `?bookingId=${bookingId}`;
    return this.apiService.get<PatientDocument[]>(endpoint);
  }

  getPatientLabResults(patientId: string, bookingId?: string): Observable<PatientLabResult[]> {
    let endpoint = `patients/${patientId}/lab-results`;
    if (bookingId) endpoint += `?bookingId=${bookingId}`;
    return this.apiService.get<PatientLabResult[]>(endpoint);
  }

  getMyDocuments(bookingId?: string): Observable<PatientDocument[]> {
    let endpoint = 'patients/me/documents';
    if (bookingId) endpoint += `?bookingId=${bookingId}`;
    return this.apiService.get<PatientDocument[]>(endpoint);
  }

  getMyLabResults(bookingId?: string): Observable<PatientLabResult[]> {
    let endpoint = 'patients/me/lab-results';
    if (bookingId) endpoint += `?bookingId=${bookingId}`;
    return this.apiService.get<PatientLabResult[]>(endpoint);
  }

  getMyMedicalRecords(): Observable<any[]> {
    return this.apiService.get<any[]>('medical-records/me');
  }

  getMyPrescriptions(): Observable<any[]> {
    return this.apiService.get<any[]>('prescriptions/me');
  }

  // ── Upload methods ──

  uploadPatientDocument(patientId: string, request: PatientDocumentUploadRequest): Observable<PatientDocument> {
    const formData = this.buildFormData(request);
    return this.apiService.postFormData<PatientDocument>(`patients/${patientId}/documents`, formData);
  }

  uploadPatientLabResult(patientId: string, request: PatientLabResultUploadRequest): Observable<PatientLabResult> {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.bookingId) formData.append('bookingId', request.bookingId);
    if (request.resultTitle) formData.append('resultTitle', request.resultTitle);
    if (request.resultText) formData.append('resultText', request.resultText);
    return this.apiService.postFormData<PatientLabResult>(`patients/${patientId}/lab-results`, formData);
  }

  uploadMyDocument(request: PatientDocumentUploadRequest): Observable<PatientDocument> {
    const formData = this.buildFormData(request);
    return this.apiService.postFormData<PatientDocument>('patients/me/documents', formData);
  }

  uploadMyLabResult(request: PatientLabResultUploadRequest): Observable<PatientLabResult> {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.bookingId) formData.append('bookingId', request.bookingId);
    if (request.resultTitle) formData.append('resultTitle', request.resultTitle);
    if (request.resultText) formData.append('resultText', request.resultText);
    return this.apiService.postFormData<PatientLabResult>('patients/me/lab-results', formData);
  }

  // ── PDF / download methods ──

  downloadAllClinicalRecordsPdf(): Observable<Blob> {
    return this.apiService.getBlob('patient-documents/me/all.pdf');
  }

  downloadPrescriptionPdf(prescriptionId: string): Observable<Blob> {
    return this.apiService.getBlob(`patient-documents/me/prescriptions/${prescriptionId}/pdf`);
  }

  downloadMedicalRecordPdf(recordId: string): Observable<Blob> {
    return this.apiService.getBlob(`patient-documents/me/medical-records/${recordId}/pdf`);
  }

  downloadConsultationSummaryPdf(bookingId: string): Observable<Blob> {
    return this.apiService.getBlob(`patient-documents/me/bookings/${bookingId}/pdf`);
  }

  downloadFile(src: string): Observable<Blob> {
    return this.apiService.getBlob(src);
  }

  downloadMediaFile(item: any, kind: string, patientId?: string): Observable<Blob> {
    const pid = patientId || 'me';
    if (kind === 'document') {
      return this.apiService.getBlob(`patients/${pid}/documents/${item.id}/file`);
    }
    return this.apiService.getBlob(`patients/${pid}/lab-results/${item.id}/file`);
  }

  getDownloadUrl(patientId: string, documentId: string): string {
    const baseUrl = (environment.apiUrl || environment.apiBaseUrl || '').replace(/\/+$/, '');
    return `${baseUrl}/patients/${patientId}/documents/${documentId}/file`;
  }

  // ── Helpers ──

  private buildFormData(request: PatientDocumentUploadRequest): FormData {
    const fd = new FormData();
    fd.append('file', request.file);
    if (request.bookingId) fd.append('bookingId', request.bookingId);
    if (request.documentType) fd.append('documentType', request.documentType);
    if (request.title) fd.append('title', request.title);
    if (request.description) fd.append('description', request.description);
    return fd;
  }
}

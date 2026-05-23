import { Injectable, inject } from '@angular/core';
import { from, map, Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  PatientDocument,
  PatientDocumentUploadRequest,
  PatientFollowUp,
  PatientLabResult,
  PatientLabResultUploadRequest,
  PatientMedicalRecord,
  PatientPrescription
} from '../models';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class PatientDocumentsService {
  private readonly supabase = inject(SupabaseService);

  getMyMedicalRecords(): Observable<PatientMedicalRecord[]> {
    return of([]);
  }

  getMyPrescriptions(): Observable<PatientPrescription[]> {
    return of([]);
  }

  getMyFollowUps(): Observable<PatientFollowUp[]> {
    return of([]);
  }

  // ── Documents ────────────────────────────────────

  getMyDocuments(bookingId?: string): Observable<PatientDocument[]> {
    return from(this.loadDocuments(undefined, bookingId));
  }

  getPatientDocuments(patientId: string, bookingId?: string): Observable<PatientDocument[]> {
    return from(this.loadDocuments(patientId, bookingId));
  }

  uploadMyDocument(request: PatientDocumentUploadRequest): Observable<PatientDocument> {
    return from(this.uploadAndRegister(request, undefined));
  }

  uploadPatientDocument(patientId: string, request: PatientDocumentUploadRequest): Observable<PatientDocument> {
    return from(this.uploadAndRegister(request, patientId));
  }

  // ── Lab Results ──────────────────────────────────

  getMyLabResults(bookingId?: string): Observable<PatientLabResult[]> {
    return from(this.loadLabResults(undefined, bookingId));
  }

  getPatientLabResults(patientId: string, bookingId?: string): Observable<PatientLabResult[]> {
    return from(this.loadLabResults(patientId, bookingId));
  }

  uploadMyLabResult(request: PatientLabResultUploadRequest): Observable<PatientLabResult> {
    return from(this.uploadAndRegisterLab(request, undefined));
  }

  uploadPatientLabResult(patientId: string, request: PatientLabResultUploadRequest): Observable<PatientLabResult> {
    return from(this.uploadAndRegisterLab(request, patientId));
  }

  // ── Download / File Access ───────────────────────

  downloadFile(url: string): Observable<Blob> {
    return from(this.fetchBlob(url));
  }

  downloadMedicalRecordPdf(_recordId: string): Observable<Blob> {
    return throwError(() => new Error('PDF download not available in Supabase yet.'));
  }

  downloadConsultationSummaryPdf(_bookingId: string): Observable<Blob> {
    return throwError(() => new Error('PDF download not available in Supabase yet.'));
  }

  downloadPrescriptionPdf(_prescriptionId: string): Observable<Blob> {
    return throwError(() => new Error('PDF download not available in Supabase yet.'));
  }

  downloadAllClinicalRecordsPdf(): Observable<Blob> {
    return throwError(() => new Error('PDF download not available in Supabase yet.'));
  }

  /**
   * Download a media file. If fileUrl is a signed URL, uses it directly.
   * Otherwise generates a fresh signed URL from the stored file path.
   */
  downloadMediaFile(
    item: { id: string; fileUrl?: string; fileName?: string; fileContentType?: string; filePath?: string },
    kind: 'document' | 'lab-result',
    _patientId?: string
  ): Observable<Blob> {
    const url = item.fileUrl;
    if (url) return from(this.fetchBlob(url));
    if (item.filePath) {
      const bucket = kind === 'document' ? 'patient-documents' : 'lab-results';
      return from(this.downloadViaSignedUrl(bucket, item.filePath));
    }
    return throwError(() => new Error('No file URL or path available.'));
  }

  // ── Internal ─────────────────────────────────────

  private async loadDocuments(patientId?: string, bookingId?: string): Promise<PatientDocument[]> {
    try {
      const rows = await this.supabase.getPatientDocuments(patientId || '', bookingId);
      return Promise.all(rows.map((r: any) => this.mapDocRow(r)));
    } catch {
      return [];
    }
  }

  private async loadLabResults(patientId?: string, bookingId?: string): Promise<PatientLabResult[]> {
    try {
      const rows = await this.supabase.getPatientLabResults(patientId || '', bookingId);
      return Promise.all(rows.map((r: any) => this.mapLabRow(r)));
    } catch {
      return [];
    }
  }

  private async mapDocRow(r: any): Promise<PatientDocument> {
    const bucket = 'patient-documents';
    const filePath = r.file_path || '';
    const signedUrl = filePath ? await this.supabase.getSignedUrl(bucket, filePath, 3600) : '';
    return {
      id: r.id,
      patientId: r.patient_id,
      bookingId: r.booking_id,
      consultationId: r.consultation_id,
      documentType: r.document_type || 'Other',
      title: r.title,
      description: r.description,
      fileUrl: signedUrl || '',
      fileName: r.file_name || '',
      fileContentType: r.file_content_type,
      fileSize: r.file_size,
      source: r.source || 'StaffUpload',
      uploadedByUserId: r.uploaded_by_user_id,
      uploadedAt: r.uploaded_at,
      createdAt: r.created_at,
    };
  }

  private async mapLabRow(r: any): Promise<PatientLabResult> {
    const bucket = 'lab-results';
    const filePath = r.file_path || '';
    const signedUrl = filePath ? await this.supabase.getSignedUrl(bucket, filePath, 3600) : '';
    return {
      id: r.id,
      patientId: r.patient_id,
      bookingId: r.booking_id,
      consultationId: r.consultation_id,
      labOrderItemId: r.lab_order_item_id,
      resultTitle: r.result_title,
      resultText: r.result_text,
      fileUrl: signedUrl || '',
      fileName: r.file_name || '',
      fileContentType: r.file_content_type,
      status: r.status || 'Uploaded',
      uploadedByUserId: r.uploaded_by_user_id,
      uploadedAt: r.uploaded_at,
      createdAt: r.created_at,
    };
  }

  private async uploadAndRegister(
    request: PatientDocumentUploadRequest,
    patientId?: string
  ): Promise<PatientDocument> {
    const { data: { user } } = await this.supabase.client.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const bucket = 'patient-documents';
    const filePath = `${user.id}/${Date.now()}_${request.file.name}`;

    const upload = await this.supabase.uploadFile(bucket, filePath, request.file);
    if (upload.error) throw new Error(upload.error);

    const signedUrl = await this.supabase.getSignedUrl(bucket, filePath, 3600);
    const reg = await this.supabase.registerPatientDocument({
      p_patient_id: patientId || user.id,
      p_booking_id: request.bookingId || '',
      p_file_path: filePath,
      p_file_name: request.file.name,
      p_file_size: request.file.size,
      p_content_type: request.file.type,
      p_title: request.title || null,
      p_description: request.description || null,
      p_document_type: request.documentType || null,
      p_consultation_id: request.consultationId || null,
    });
    if (reg.error) throw new Error(reg.error);

    return {
      id: reg.data?.id || '',
      patientId: patientId || user.id,
      bookingId: request.bookingId,
      consultationId: request.consultationId,
      documentType: request.documentType || 'Other',
      title: request.title,
      description: request.description,
      fileUrl: signedUrl || '',
      fileName: request.file.name,
      fileContentType: request.file.type,
      fileSize: request.file.size,
      source: 'PatientUpload',
      uploadedByUserId: user.id,
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  private async uploadAndRegisterLab(
    request: PatientLabResultUploadRequest,
    patientId?: string
  ): Promise<PatientLabResult> {
    const { data: { user } } = await this.supabase.client.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const bucket = 'lab-results';
    const filePath = `${user.id}/${Date.now()}_${request.file.name}`;

    const upload = await this.supabase.uploadFile(bucket, filePath, request.file);
    if (upload.error) throw new Error(upload.error);

    const signedUrl = await this.supabase.getSignedUrl(bucket, filePath, 3600);
    const reg = await this.supabase.registerLabResult({
      p_patient_id: patientId || user.id,
      p_booking_id: request.bookingId || '',
      p_file_path: filePath,
      p_file_name: request.file.name,
      p_file_size: request.file.size,
      p_content_type: request.file.type,
      p_title: request.resultTitle || null,
      p_notes: request.resultText || null,
      p_consultation_id: request.consultationId || null,
    });
    if (reg.error) throw new Error(reg.error);

    return {
      id: reg.data?.id || '',
      patientId: patientId || user.id,
      bookingId: request.bookingId,
      consultationId: request.consultationId,
      resultTitle: request.resultTitle,
      resultText: request.resultText,
      fileUrl: signedUrl || '',
      fileName: request.file.name,
      fileContentType: request.file.type,
      status: 'Uploaded',
      uploadedByUserId: user.id,
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  private async downloadViaSignedUrl(bucket: string, filePath: string): Promise<Blob> {
    const url = await this.supabase.getSignedUrl(bucket, filePath, 60);
    if (!url) throw new Error('Failed to generate download URL.');
    return this.fetchBlob(url);
  }

  private async fetchBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to download file.');
    return response.blob();
  }
}

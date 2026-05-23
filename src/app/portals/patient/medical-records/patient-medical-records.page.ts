import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { IonSearchbar, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PatientMedicalRecord } from '../../../core/models';
import { PatientDocumentsService } from '../../../core/services/patient-documents.service';

@Component({
  selector: 'app-patient-medical-records-page',
  standalone: true,
  imports: [DatePipe, NgFor, NgIf, IonSearchbar, IonSpinner, EmptyStateComponent],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Medical Records</h2>
          <p class="page-subtitle">Review your completed consultations and clinical notes.</p>
        </div>

        <button
          type="button"
          class="btn-outline page-action"
          *ngIf="filteredRecords.length > 0 && !loading"
          (click)="downloadAllRecords()"
        >
          Download All PDF
        </button>
      </div>

      <ion-searchbar
        class="page-search"
        placeholder="Search by doctor, diagnosis, soap notes, or follow-up"
        [value]="searchTerm"
        (ionInput)="onSearchChange($event.detail.value ?? '')"
      ></ion-searchbar>

      <div class="page-summary" *ngIf="!loading && !error">
        Showing {{ filteredRecords.length }} of {{ records.length }} medical records
      </div>

      <div class="page-loading" *ngIf="loading">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading medical records...</p>
      </div>

      <div class="page-error" *ngIf="error">
        <div class="page-error__title">{{ errorTitle }}</div>
        <p>{{ error }}</p>
        <button type="button" class="btn-primary" (click)="loadRecords()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <ng-container *ngIf="filteredRecords.length > 0; else emptyTpl">
          <article class="record-card clinic-card" *ngFor="let record of filteredRecords">
            <div class="record-card__header">
              <div>
                <div class="record-card__date">{{ record.appointmentDate | date : 'MMM d, y' }}</div>
                <h3>{{ record.doctorName }}</h3>
              </div>
              <div class="record-card__tag">Completed Consultation</div>
            </div>

            <div class="record-card__grid">
              <div>
                <span>Diagnosis</span>
                <p>{{ record.diagnosis || 'No diagnosis recorded yet.' }}</p>
              </div>
              <div>
                <span>SOAP Notes</span>
                <p>{{ record.soapNotes || 'No SOAP notes recorded yet.' }}</p>
              </div>
              <div>
                <span>Doctor Notes</span>
                <p>{{ record.doctorNotes || 'No doctor notes recorded yet.' }}</p>
              </div>
              <div>
                <span>Follow-up</span>
                <p>
                  <ng-container *ngIf="record.followUpDate; else noFollowUpTpl">
                    {{ record.followUpDate | date : 'MMM d, y' }}
                    <br />
                    {{ record.followUpInstructions || 'No instructions recorded.' }}
                  </ng-container>
                </p>
              </div>
              <div class="record-card__wide">
                <span>Additional Notes</span>
                <p>{{ record.notes || 'No additional notes recorded yet.' }}</p>
              </div>
            </div>

            <div class="record-card__meta">
              <span>Created {{ record.createdAt | date : 'MMM d, y, h:mm a' }}</span>
              <span>Updated {{ record.updatedAt | date : 'MMM d, y, h:mm a' }}</span>
            </div>

            <div class="record-card__actions">
              <button
                type="button"
                class="btn-outline"
                [disabled]="isDownloading(record.id)"
                (click)="downloadMedicalRecord(record)"
              >
                {{ isDownloading(record.id) ? 'Downloading...' : 'Download Medical Record PDF' }}
              </button>
              <button
                type="button"
                class="btn-primary"
                [disabled]="isDownloadingSummary(record.bookingId)"
                (click)="downloadConsultationSummary(record)"
              >
                {{ isDownloadingSummary(record.bookingId) ? 'Downloading...' : 'Download Summary PDF' }}
              </button>
            </div>
          </article>
        </ng-container>
      </ng-container>

      <ng-template #emptyTpl>
        <app-empty-state
          icon="document-text-outline"
          title="No medical records yet"
          description="Completed consultations will appear here once your doctor saves clinical notes."
        ></app-empty-state>
      </ng-template>

      <ng-template #noFollowUpTpl>
        <span>No follow-up scheduled.</span>
      </ng-template>
    </section>
  `,
  styleUrl: './patient-medical-records.page.scss'
})
export class PatientMedicalRecordsPage implements OnInit {
  private readonly documents = inject(PatientDocumentsService);
  private readonly toastCtrl = inject(ToastController);

  records: PatientMedicalRecord[] = [];
  filteredRecords: PatientMedicalRecord[] = [];
  loading = false;
  error = '';
  errorTitle = 'Unable to load records';
  searchTerm = '';
  private readonly downloading = new Set<string>();
  private readonly downloadingSummary = new Set<string>();

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.loading = true;
    this.error = '';

    this.documents.getMyMedicalRecords().subscribe({
      next: (records) => {
        this.records = records;
        this.applyFilter();
        this.loading = false;
      },
      error: (error) => {
        this.records = [];
        this.filteredRecords = [];
        this.loading = false;
        this.error = extractMessage(error, 'Unable to load records. Please try again.');
        this.errorTitle = normalizeErrorTitle(this.error);
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.applyFilter();
  }

  downloadMedicalRecord(record: PatientMedicalRecord): void {
    if (this.downloading.has(record.id)) {
      return;
    }

    this.downloading.add(record.id);
    this.documents.downloadMedicalRecordPdf(record.id).subscribe({
      next: (blob) => {
        this.saveBlob(blob, `medical-record-${record.appointmentDate}-${record.id}.pdf`);
        this.downloading.delete(record.id);
      },
      error: (error) => {
        this.downloading.delete(record.id);
        void this.showToast(extractMessage(error, 'Document not available yet.'));
      }
    });
  }

  downloadConsultationSummary(record: PatientMedicalRecord): void {
    if (this.downloadingSummary.has(record.bookingId)) {
      return;
    }

    this.downloadingSummary.add(record.bookingId);
    this.documents.downloadConsultationSummaryPdf(record.bookingId).subscribe({
      next: (blob) => {
        this.saveBlob(blob, `consultation-summary-${record.appointmentDate}-${record.bookingId}.pdf`);
        this.downloadingSummary.delete(record.bookingId);
      },
      error: (error) => {
        this.downloadingSummary.delete(record.bookingId);
        void this.showToast(extractMessage(error, 'Document not available yet.'));
      }
    });
  }

  downloadAllRecords(): void {
    this.documents.downloadAllClinicalRecordsPdf().subscribe({
      next: (blob) => this.saveBlob(blob, `clinical-records-${new Date().toISOString().slice(0, 10)}.pdf`),
      error: (error) => void this.showToast(extractMessage(error, 'Document not available yet.'))
    });
  }

  isDownloading(id: string): boolean {
    return this.downloading.has(id);
  }

  isDownloadingSummary(bookingId: string): boolean {
    return this.downloadingSummary.has(bookingId);
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredRecords = [...this.records];
      return;
    }

    this.filteredRecords = this.records.filter((record) => {
      const haystack = [
        record.doctorName,
        record.diagnosis,
        record.soapNotes,
        record.doctorNotes,
        record.followUpInstructions,
        record.notes,
        record.appointmentDate
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2400,
      position: 'top'
    });
    await toast.present();
  }
}

function extractMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as { error?: { message?: unknown }; message?: unknown };
    const direct = apiError.error?.message ?? apiError.message;
    if (typeof direct === 'string' && direct.trim()) {
      return direct;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function normalizeErrorTitle(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('not linked') || lower.includes('patient profile not found')) {
    return 'Patient profile not linked';
  }

  if (lower.includes('unauthorized') || lower.includes('forbidden')) {
    return 'Please sign in again';
  }

  return 'Unable to load records';
}

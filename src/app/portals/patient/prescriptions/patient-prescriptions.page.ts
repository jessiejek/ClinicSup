import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { IonSearchbar, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PatientPrescription } from '../../../core/models';
import { PatientDocumentsService } from '../../../core/services/patient-documents.service';

@Component({
  selector: 'app-patient-prescriptions-page',
  standalone: true,
  imports: [DatePipe, NgFor, NgIf, IonSearchbar, IonSpinner, EmptyStateComponent],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Prescriptions</h2>
          <p class="page-subtitle">View medicines prescribed during your consultations.</p>
        </div>

        <button
          type="button"
          class="btn-outline page-action"
          *ngIf="filteredPrescriptions.length > 0 && !loading"
          (click)="downloadAllRecords()"
        >
          Download All PDF
        </button>
      </div>

      <ion-searchbar
        class="page-search"
        placeholder="Search by doctor, medicine, route, or instructions"
        [value]="searchTerm"
        (ionInput)="onSearchChange($event.detail.value ?? '')"
      ></ion-searchbar>

      <div class="page-summary" *ngIf="!loading && !error">
        Showing {{ filteredPrescriptions.length }} of {{ prescriptions.length }} prescriptions
      </div>

      <div class="page-loading" *ngIf="loading">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading prescriptions...</p>
      </div>

      <div class="page-error" *ngIf="error">
        <div class="page-error__title">{{ errorTitle }}</div>
        <p>{{ error }}</p>
        <button type="button" class="btn-primary" (click)="loadPrescriptions()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <ng-container *ngIf="filteredPrescriptions.length > 0; else emptyTpl">
          <article class="prescription-card clinic-card" *ngFor="let prescription of filteredPrescriptions">
            <div class="prescription-card__header">
              <div>
                <div class="prescription-card__date">{{ prescription.appointmentDate | date : 'MMM d, y' }}</div>
                <h3>{{ prescription.doctorName }}</h3>
              </div>
              <div class="prescription-card__tag">{{ prescription.items.length }} medicine(s)</div>
            </div>

            <div class="prescription-card__items">
              <div class="prescription-item" *ngFor="let item of prescription.items">
                <div class="prescription-item__title">{{ item.medicineName }}</div>
                <div class="prescription-item__meta">
                  <span *ngIf="item.genericName">{{ item.genericName }}</span>
                  <span *ngIf="item.strength">{{ item.strength }}</span>
                  <span *ngIf="item.route">{{ item.route }}</span>
                  <span *ngIf="item.frequency">{{ item.frequency }}</span>
                  <span *ngIf="item.duration">{{ item.duration }}</span>
                </div>
                <div class="prescription-item__sig" *ngIf="item.sig">{{ item.sig }}</div>
                <div class="prescription-item__sig" *ngIf="item.instructions">
                  {{ item.instructions }}
                </div>
              </div>
            </div>

            <div class="prescription-card__summary" *ngIf="prescription.medicineName || prescription.instructions">
              <span>Primary Medicine</span>
              <p>{{ prescription.medicineName || (prescription.items.length > 0 ? prescription.items[0].medicineName : '') }}</p>
              <p>{{ prescription.instructions || 'No extra instructions recorded.' }}</p>
            </div>

            <div class="prescription-card__meta">
              <span>Created {{ prescription.createdAt | date : 'MMM d, y, h:mm a' }}</span>
            </div>

            <div class="prescription-card__actions">
              <button
                type="button"
                class="btn-outline"
                [disabled]="isDownloading(prescription.id)"
                (click)="downloadPrescription(prescription)"
              >
                {{ isDownloading(prescription.id) ? 'Downloading...' : 'Download Prescription PDF' }}
              </button>
              <button
                type="button"
                class="btn-primary"
                [disabled]="isDownloadingSummary(prescription.bookingId)"
                (click)="downloadConsultationSummary(prescription)"
              >
                {{ isDownloadingSummary(prescription.bookingId) ? 'Downloading...' : 'Download Summary PDF' }}
              </button>
            </div>
          </article>
        </ng-container>
      </ng-container>

      <ng-template #emptyTpl>
        <app-empty-state
          icon="medkit-outline"
          title="No prescriptions yet"
          description="Prescribed medicines will appear here after your consultation."
        ></app-empty-state>
      </ng-template>
    </section>
  `,
  styleUrl: './patient-prescriptions.page.scss'
})
export class PatientPrescriptionsPage implements OnInit {
  private readonly documents = inject(PatientDocumentsService);
  private readonly toastCtrl = inject(ToastController);

  prescriptions: PatientPrescription[] = [];
  filteredPrescriptions: PatientPrescription[] = [];
  loading = false;
  error = '';
  errorTitle = 'Unable to load prescriptions';
  searchTerm = '';
  private readonly downloading = new Set<string>();
  private readonly downloadingSummary = new Set<string>();

  ngOnInit(): void {
    this.loadPrescriptions();
  }

  loadPrescriptions(): void {
    this.loading = true;
    this.error = '';

    this.documents.getMyPrescriptions().subscribe({
      next: (records) => {
        this.prescriptions = records;
        this.applyFilter();
        this.loading = false;
      },
      error: (error) => {
        this.prescriptions = [];
        this.filteredPrescriptions = [];
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

  downloadPrescription(prescription: PatientPrescription): void {
    if (this.downloading.has(prescription.id)) {
      return;
    }

    this.downloading.add(prescription.id);
    this.documents.downloadPrescriptionPdf(prescription.id).subscribe({
      next: (blob) => {
        this.saveBlob(blob, `prescription-${prescription.appointmentDate}-${prescription.id}.pdf`);
        this.downloading.delete(prescription.id);
      },
      error: (error) => {
        this.downloading.delete(prescription.id);
        void this.showToast(extractMessage(error, 'Document not available yet.'));
      }
    });
  }

  downloadConsultationSummary(prescription: PatientPrescription): void {
    if (this.downloadingSummary.has(prescription.bookingId)) {
      return;
    }

    this.downloadingSummary.add(prescription.bookingId);
    this.documents.downloadConsultationSummaryPdf(prescription.bookingId).subscribe({
      next: (blob) => {
        this.saveBlob(blob, `consultation-summary-${prescription.appointmentDate}-${prescription.bookingId}.pdf`);
        this.downloadingSummary.delete(prescription.bookingId);
      },
      error: (error) => {
        this.downloadingSummary.delete(prescription.bookingId);
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
      this.filteredPrescriptions = [...this.prescriptions];
      return;
    }

    this.filteredPrescriptions = this.prescriptions.filter((prescription) => {
      const haystack = [
        prescription.doctorName,
        prescription.medicineName,
        prescription.genericName,
        prescription.strength,
        prescription.route,
        prescription.frequency,
        prescription.duration,
        prescription.instructions,
        ...prescription.items.flatMap((item) => [
          item.medicineName,
          item.genericName,
          item.strength,
          item.route,
          item.frequency,
          item.duration,
          item.instructions,
          item.sig
        ])
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

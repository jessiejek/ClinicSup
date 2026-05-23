import { DatePipe, NgIf } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  documentTextOutline,
  downloadOutline,
  flaskOutline
} from 'ionicons/icons';
import { Booking, PatientDocument, PatientLabResult } from '../../../core/models';
import { PatientDocumentsService } from '../../../core/services/patient-documents.service';
import { SecureImageComponent } from '../secure-image/secure-image.component';

type MediaKind = 'document' | 'lab-result';
type PatientMediaItem = PatientDocument | PatientLabResult;

@Component({
  selector: 'app-patient-media-preview-modal',
  standalone: true,
  imports: [
    DatePipe,
    NgIf,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    SecureImageComponent
  ],
  template: `
    <ion-header class="ion-no-border preview-modal-header">
      <ion-toolbar>
        <ion-title>{{ activeTitle }}</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" class="preview-close-btn" (click)="close()" aria-label="Close preview">
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="preview-modal-body">
      <div class="preview-shell" *ngIf="activeItem">
        <div class="preview-stage" *ngIf="isImage(activeItem); else filePreviewTpl">
          <app-secure-image
            [src]="activeItem.fileUrl"
            [mediaId]="activeItem.id"
            [mediaKind]="kind"
            [patientId]="patientId"
            fit="contain"
            [alt]="displayTitle(activeItem)"
          ></app-secure-image>
        </div>

        <ng-template #filePreviewTpl>
          <div class="preview-file-card">
            <div class="preview-file-card__icon">
              <ion-icon [name]="kind === 'document' ? 'document-text-outline' : 'flask-outline'"></ion-icon>
            </div>
            <h2>{{ displayTitle(activeItem) }}</h2>
            <p>{{ activeItem.fileName }}</p>
            <button
              type="button"
              class="btn-primary preview-download-btn"
              [disabled]="isDownloading(activeItem.id)"
              (click)="download(activeItem)"
            >
              <ion-icon name="download-outline"></ion-icon>
              {{ isDownloading(activeItem.id) ? 'Downloading...' : 'Download File' }}
            </button>
          </div>
        </ng-template>

        <div class="preview-meta-card">
          <div class="preview-meta-row">
            <span>Uploaded</span>
            <strong>{{ activeItem.uploadedAt | date: 'medium' }}</strong>
          </div>
          <div class="preview-meta-row" *ngIf="activeItem.bookingId">
            <span>Booking</span>
            <strong>{{ formatPreviewBooking(activeItem.bookingId) }}</strong>
          </div>
          <div class="preview-meta-row" *ngIf="detailText(activeItem)">
            <span>Notes</span>
            <strong>{{ detailText(activeItem) }}</strong>
          </div>
        </div>

        <div class="preview-nav" *ngIf="items.length > 1">
          <button type="button" class="preview-nav-btn" (click)="prev()" [disabled]="activeIndex === 0">
            <ion-icon name="chevron-back-outline"></ion-icon>
            Previous
          </button>
          <span class="preview-nav-count">{{ activeIndex + 1 }} / {{ items.length }}</span>
          <button
            type="button"
            class="preview-nav-btn"
            (click)="next()"
            [disabled]="activeIndex === items.length - 1"
          >
            Next
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .preview-modal-header ion-toolbar {
        --background: #ffffff;
        --color: #0f172a;
        --border-color: #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
      }

      .preview-modal-header ion-title {
        font-size: 1rem;
        font-weight: 600;
        padding-inline: 0.5rem;
      }

      .preview-close-btn {
        --color: #475569;
      }

      .preview-modal-body {
        --background: #f5f2fa;
      }

      .preview-shell {
        max-width: 960px;
        margin: 0 auto;
        padding: 1.25rem 1rem 2rem;
        display: grid;
        gap: 1rem;
      }

      .preview-stage {
        min-height: min(62vh, 560px);
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(93, 62, 142, 0.12);
        box-shadow: 0 18px 40px rgba(93, 62, 142, 0.1);
        background: #111827;
      }

      .preview-stage app-secure-image {
        display: block;
        width: 100%;
        height: min(62vh, 560px);
      }

      .preview-file-card {
        display: grid;
        gap: 0.85rem;
        justify-items: center;
        text-align: center;
        padding: 2.5rem 1.5rem;
        border-radius: 16px;
        background: #ffffff;
        border: 1px solid rgba(93, 62, 142, 0.1);
        box-shadow: 0 10px 24px rgba(93, 62, 142, 0.06);
      }

      .preview-file-card__icon {
        width: 72px;
        height: 72px;
        border-radius: 18px;
        display: grid;
        place-items: center;
        background: rgba(93, 62, 142, 0.1);
        color: #5d3e8e;
        font-size: 2rem;
      }

      .preview-file-card h2 {
        margin: 0;
        font-size: 1.15rem;
        color: #0f172a;
      }

      .preview-file-card p {
        margin: 0;
        color: #64748b;
        word-break: break-word;
      }

      .preview-download-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
      }

      .preview-meta-card {
        display: grid;
        gap: 0.75rem;
        padding: 1rem 1.1rem;
        border-radius: 14px;
        background: #ffffff;
        border: 1px solid rgba(93, 62, 142, 0.1);
      }

      .preview-meta-row {
        display: grid;
        gap: 0.2rem;
      }

      .preview-meta-row span {
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #64748b;
      }

      .preview-meta-row strong {
        color: #0f172a;
        font-weight: 600;
        line-height: 1.45;
      }

      .preview-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.35rem 0.25rem;
      }

      .preview-nav-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        min-height: 42px;
        padding: 0.55rem 0.95rem;
        border: 1px solid rgba(93, 62, 142, 0.2);
        border-radius: 999px;
        background: #ffffff;
        color: #0f172a;
        font-weight: 600;
        font-size: 0.88rem;
        transition: border-color var(--transition-fast), background var(--transition-fast);
      }

      .preview-nav-btn:hover:not(:disabled) {
        border-color: #5d3e8e;
        background: rgba(93, 62, 142, 0.04);
      }

      .preview-nav-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .preview-nav-count {
        color: #475569;
        font-size: 0.9rem;
        font-weight: 600;
      }

      @media (max-width: 640px) {
        .preview-shell {
          padding-inline: 0.75rem;
        }

        .preview-nav {
          flex-direction: column;
        }

        .preview-nav-btn {
          width: 100%;
          justify-content: center;
        }
      }
    `
  ]
})
export class PatientMediaPreviewModalComponent implements OnInit {
  @Input() items: PatientMediaItem[] = [];
  @Input() startIndex = 0;
  @Input() kind: MediaKind = 'document';
  @Input() bookings: Booking[] = [];
  @Input() patientId?: string;

  private readonly modalCtrl = inject(ModalController);
  private readonly documentsService = inject(PatientDocumentsService);
  private readonly downloading = new Set<string>();

  activeIndex = 0;

  constructor() {
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      closeOutline,
      documentTextOutline,
      downloadOutline,
      flaskOutline
    });
  }

  ngOnInit(): void {
    this.activeIndex = Math.min(Math.max(this.startIndex, 0), Math.max(this.items.length - 1, 0));
  }

  get activeItem(): PatientMediaItem | null {
    return this.items[this.activeIndex] ?? null;
  }

  get activeTitle(): string {
    const item = this.activeItem;
    return item ? this.displayTitle(item) : 'Preview';
  }

  close(): void {
    void this.modalCtrl.dismiss();
  }

  prev(): void {
    if (this.activeIndex > 0) {
      this.activeIndex--;
    }
  }

  next(): void {
    if (this.activeIndex < this.items.length - 1) {
      this.activeIndex++;
    }
  }

  isImage(item: PatientMediaItem): boolean {
    if (item.fileContentType?.startsWith('image/')) {
      return true;
    }

    const name = (item.fileName || '').toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some((ext) => name.endsWith(ext));
  }

  displayTitle(item: PatientMediaItem): string {
    if (this.kind === 'document') {
      const document = item as PatientDocument;
      return document.title || document.fileName || 'Document';
    }

    const labResult = item as PatientLabResult;
    return labResult.resultTitle || labResult.fileName || 'Lab Result';
  }

  detailText(item: PatientMediaItem): string {
    const text =
      this.kind === 'document'
        ? (item as PatientDocument).description
        : (item as PatientLabResult).resultText;

    return text?.trim() ?? '';
  }

  formatPreviewBooking(bookingId: string): string {
    const booking = this.bookings.find((entry) => entry.id === bookingId);
    if (!booking) {
      return 'Linked appointment';
    }

    const date = new Date(`${booking.appointmentDate}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const doctor = booking.doctorName || 'Doctor';
    const start = booking.slotStartTime?.trim() ?? '';
    const end = booking.slotEndTime?.trim() ?? '';
    const time = !start ? 'Time not available' : !end || end === start ? start : `${start} - ${end}`;
    return `${date} — ${doctor} — ${time}`;
  }

  download(item: PatientMediaItem): void {
    if (this.isDownloading(item.id) || !item.fileUrl) {
      return;
    }

    this.downloading.add(item.id);
    this.documentsService.downloadMediaFile(item, this.kind, this.patientId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = item.fileName || `${item.id}.bin`;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        this.downloading.delete(item.id);
      },
      error: () => {
        this.downloading.delete(item.id);
      }
    });
  }

  isDownloading(id: string): boolean {
    return this.downloading.has(id);
  }
}

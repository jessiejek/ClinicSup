import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientDocumentsService } from '../../../core/services/patient-documents.service';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imageOutline } from 'ionicons/icons';

type MediaKind = 'document' | 'lab-result';

@Component({
  selector: 'app-secure-image',
  standalone: true,
  imports: [CommonModule, IonSpinner, IonIcon],
  template: `
    <div
      class="secure-image-container"
      [class.secure-image-container--preview]="fit === 'contain'"
      [class.loaded]="loaded"
      [class.error]="error"
    >
      <ion-spinner *ngIf="loading" name="crescent"></ion-spinner>
      <img
        *ngIf="objectUrl && !error"
        [src]="objectUrl"
        [style.object-fit]="fit"
        (load)="onLoad()"
        (error)="onImageRenderError()"
        [attr.alt]="alt"
      />
      <div class="secure-image-error" *ngIf="error && !loading">
        <ion-icon name="image-outline"></ion-icon>
        <span>Image unavailable</span>
      </div>
    </div>
  `,
  styles: [
    `
      .secure-image-container {
        width: 100%;
        height: 100%;
        min-height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--clinic-bg-elevated);
        overflow: hidden;
        position: relative;
      }

      .secure-image-container--preview {
        min-height: 280px;
        background: #111827;
      }

      img {
        display: block;
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
      }

      .secure-image-container:not(.secure-image-container--preview) img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .secure-image-error {
        display: grid;
        gap: 0.5rem;
        place-items: center;
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.9rem;
        text-align: center;
        padding: 1rem;
      }

      .secure-image-container:not(.secure-image-container--preview) .secure-image-error {
        color: var(--color-text-muted);
      }

      .secure-image-error ion-icon {
        font-size: 2rem;
      }
    `
  ]
})
export class SecureImageComponent implements OnChanges, OnDestroy {
  @Input() src?: string | null;
  @Input() mediaId?: string;
  @Input() mediaKind?: MediaKind;
  @Input() patientId?: string;
  @Input() fit: 'cover' | 'contain' = 'cover';
  @Input() alt = 'Uploaded image';

  private readonly documentsService = inject(PatientDocumentsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  objectUrl?: string;
  loading = true;
  loaded = false;
  error = false;

  constructor() {
    addIcons({ imageOutline });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['src'] || changes['mediaId'] || changes['mediaKind'] || changes['patientId']) {
      this.revokeObjectUrl();
      this.loading = true;
      this.loaded = false;
      this.error = false;
      this.loadSource();
    }
  }

  onLoad(): void {
    this.loaded = true;
    this.loading = false;
    this.error = false;
    this.cdr.markForCheck();
  }

  onImageRenderError(): void {
    this.error = true;
    this.loading = false;
    this.loaded = false;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.revokeObjectUrl();
  }

  private loadSource(): void {
    const request$ =
      this.mediaId && this.mediaKind
        ? this.documentsService.downloadMediaFile(
            { id: this.mediaId, fileUrl: this.src ?? undefined },
            this.mediaKind,
            this.patientId
          )
        : this.src?.trim()
          ? this.documentsService.downloadFile(this.src)
          : null;

    if (!request$) {
      this.error = true;
      this.loading = false;
      return;
    }

    request$
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => {
          this.error = true;
          this.loading = false;
          this.cdr.markForCheck();
          return of(null);
        })
      )
      .subscribe((blob) => {
        if (!blob || blob.size === 0) {
          this.error = true;
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }

        const typedBlob =
          blob.type && blob.type.startsWith('image/')
            ? blob
            : new Blob([blob], { type: inferImageMimeType(this.src, this.alt) });

        this.objectUrl = URL.createObjectURL(typedBlob);
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = undefined;
    }
  }
}

function inferImageMimeType(src?: string | null, alt?: string): string {
  const name = `${src ?? ''} ${alt ?? ''}`.toLowerCase();
  if (name.includes('.png')) {
    return 'image/png';
  }
  if (name.includes('.gif')) {
    return 'image/gif';
  }
  if (name.includes('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

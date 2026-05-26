import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { IonSearchbar, IonSpinner, ToastController, IonIcon, ModalController, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  documentTextOutline,
  flaskOutline,
  cloudUploadOutline,
  documentAttachOutline,
  imageOutline,
  searchOutline,
  calendarOutline,
  checkmarkCircleOutline,
  eyeOutline
} from 'ionicons/icons';
import {
  PatientDocument,
  PatientDocumentUploadRequest,
  PatientLabResult,
  PatientLabResultUploadRequest,
  Booking
} from '../../../core/models';
import { PatientDocumentsService } from '../../../core/services/patient-documents.service';
import { BookingService } from '../../../core/services/booking.service';
import { SecureImageComponent } from '../secure-image/secure-image.component';
import { PatientMediaPreviewModalComponent } from './patient-media-preview.modal';

type MediaKind = 'document' | 'lab-result';
type PatientMediaItem = PatientDocument | PatientLabResult;

@Component({
  selector: 'app-patient-media-panel',
  standalone: true,
  imports: [DatePipe, NgFor, NgIf, ReactiveFormsModule, IonSearchbar, IonSpinner, SecureImageComponent, IonIcon, IonSelect, IonSelectOption],
  template: `
    <section class="patient-media-panel clinic-card">
      <div class="patient-media-panel__header">
        <div>
          <p class="section-heading">{{ eyebrow }}</p>
          <h3 class="patient-media-panel__title">
            <i *ngIf="headingIcon" [class]="headingIcon"></i>
            <span>{{ heading }}</span>
          </h3>
          <p class="patient-media-panel__subtitle">{{ subheading }}</p>
        </div>

        <div class="patient-media-panel__count" *ngIf="!loading && !error">
          {{ filteredItems.length }} shown
        </div>
      </div>

      <form *ngIf="allowUpload" class="patient-media-panel__upload" [formGroup]="form" (ngSubmit)="upload()">
        <div class="upload-section-header">
          <div class="upload-section-header__icon">
            <ion-icon [name]="kind === 'document' ? 'cloud-upload-outline' : 'flask-outline'"></ion-icon>
          </div>
          <div>
            <h4>{{ kind === 'document' ? 'Upload a document' : 'Upload a lab result' }}</h4>
            <p>Files should be linked to the correct booking.</p>
          </div>
        </div>

        <div class="patient-media-panel__upload-grid">
          <label class="media-field media-field--full">
            <span>{{ fileFieldLabel }}</span>
            <div class="file-picker" (click)="fileInput.click()">
              <ion-icon [name]="selectedFileName ? 'document-attach-outline' : 'cloud-upload-outline'"></ion-icon>
              <div class="file-picker__text">
                <strong>{{ selectedFileName || 'Choose a file' }}</strong>
                <small>Images and PDF files are recommended.</small>
              </div>
            </div>
            <input #fileInput type="file" class="visually-hidden" (change)="onFileSelected($event)" />
          </label>

          <label class="media-field">
            <span>{{ titleFieldLabel }}</span>
            <input class="filter-input" [formControl]="form.controls.title" [placeholder]="titlePlaceholder" />
          </label>

          <label class="media-field">
            <span>{{ notesFieldLabel }}</span>
            <textarea class="filter-input" rows="3" [formControl]="form.controls.notes"></textarea>
          </label>

          <label class="media-field media-field--full">
            <span>Related Booking</span>
            <ion-select class="filter-input" [interface]="selectInterface" [formControl]="form.controls.bookingId">
              <ion-select-option value="">Select a booking</ion-select-option>
              <ion-select-option *ngFor="let booking of bookings" [value]="booking.id">
                {{ formatBooking(booking) }}
              </ion-select-option>
            </ion-select>
            <div class="booking-helper-row">
              <small class="booking-helper" *ngIf="fromQueryParam">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
                Booking preselected from appointment details.
              </small>
              <small class="booking-helper">{{ helperText }}</small>
            </div>
          </label>
        </div>

        <div class="patient-media-panel__actions">
          <button type="submit" class="btn-primary" [disabled]="uploading || !canSubmitUpload">
            {{ uploading ? uploadButtonLabel + '...' : uploadButtonLabel }}
          </button>
          <button type="button" class="btn-outline" (click)="resetUpload()" [disabled]="uploading && !selectedFile">
            Reset
          </button>
        </div>
      </form>

      <ion-searchbar
        *ngIf="allowUpload"
        class="patient-media-panel__search"
        placeholder="Search by file name, title, notes, or linked IDs"
        [value]="searchTerm"
        (ionInput)="onSearchChange($event.detail.value ?? '')"
      ></ion-searchbar>

      <div class="patient-media-panel__loading" *ngIf="loading">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading {{ kindLabelLower }}...</p>
      </div>

      <div class="patient-media-panel__error" *ngIf="error">
        <div class="patient-media-panel__error-title">{{ errorHeader }}</div>
        <p>{{ error }}</p>
        <button type="button" class="btn-primary" (click)="loadRecords()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <ng-container *ngIf="filteredItems.length > 0; else emptyTpl">
          <div class="media-gallery-grid">
            <article class="gallery-card" *ngFor="let item of filteredItems">
              <div class="gallery-card__thumb" (click)="openPreview(item)">
                <app-secure-image
                  *ngIf="isImage(item)"
                  [src]="item.fileUrl"
                  [mediaId]="item.id"
                  [mediaKind]="kind"
                  [patientId]="patientId || undefined"
                  [alt]="displayTitle(item)"
                ></app-secure-image>
                <div class="gallery-card__icon" *ngIf="!isImage(item)">
                  <ion-icon [name]="kind === 'document' ? 'document-text-outline' : 'flask-outline'"></ion-icon>
                </div>
                <div class="gallery-card__preview-hint" *ngIf="isImage(item)">
                  <ion-icon name="eye-outline"></ion-icon>
                </div>
              </div>
              <div class="gallery-card__info" (click)="openPreview(item)">
                <div class="gallery-card__meta-row">
                  <span class="gallery-card__date">{{ item.uploadedAt | date : 'MMMM d, y (EEE)' }}</span>
                  <span class="gallery-card__type-badge">{{ tagLabel(item) }}</span>
                </div>
                <h4>{{ displayTitle(item) }}</h4>
                <div class="gallery-card__booking-row" *ngIf="bookingLabelFor(item)">
                  <ion-icon name="calendar-outline"></ion-icon>
                  <span>{{ bookingLabelFor(item) }}</span>
                </div>
              </div>
            </article>
          </div>
        </ng-container>
      </ng-container>

      <ng-template #emptyTpl>
        <div class="patient-media-panel__empty">
          <ion-icon [name]="kind === 'document' ? 'document-text-outline' : 'flask-outline'"></ion-icon>
          <p class="patient-media-panel__empty-title">{{ emptyTitle }}</p>
          <p>{{ emptyDescription }}</p>
        </div>
      </ng-template>
    </section>
  `,
  styleUrl: './patient-media-panel.component.scss'
})
export class PatientMediaPanelComponent implements OnInit, OnChanges {
  @Input() kind: MediaKind = 'document';
  @Input() patientId = '';
  @Input() allowUpload = true;
  @Input() heading = '';
  @Input() subheading = '';
  @Input() headingIcon = '';
  @Input() errorTitle = '';
  @Input() bookingIdFilter?: string;
  /** When false (doctor view), show all patient uploads instead of filtering to one booking. */
  @Input() filterByBooking = true;

  private readonly documentsService = inject(PatientDocumentsService);
  private readonly fb = inject(FormBuilder);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly bookingService = inject(BookingService);
  private readonly modalCtrl = inject(ModalController);

  readonly form = this.fb.nonNullable.group({
    title: [''],
    notes: [''],
    bookingId: [''],
    consultationId: ['']
  });

  items: PatientMediaItem[] = [];
  filteredItems: PatientMediaItem[] = [];
  bookings: Booking[] = [];
  loading = false;
  uploading = false;
  error = '';
  searchTerm = '';
  selectedFile: File | null = null;
  selectedFileName = '';
  fromQueryParam = false;
  private pendingBookingId = '';
  private queryBookingId = '';

  private readonly downloading = new Set<string>();
  private loadToken = 0;

  constructor() {
    addIcons({
      documentTextOutline,
      flaskOutline,
      cloudUploadOutline,
      documentAttachOutline,
      imageOutline,
      searchOutline,
      calendarOutline,
      checkmarkCircleOutline,
      eyeOutline
    });
  }

  get canSubmitUpload(): boolean {
    return !!this.selectedFile && !!normalizeOptionalString(this.form.controls.bookingId.value);
  }

  ngOnInit(): void {
    this.syncBookingContextFromRoute(this.route.snapshot.queryParamMap.get('bookingId'));
    this.loadRecords();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.syncBookingContextFromRoute(params.get('bookingId'));
    });

    if (this.allowUpload) {
      const bookings$ = this.patientId
        ? this.bookingService.getBookingsByPatientId(this.patientId).pipe(catchError(() => of([])))
        : this.bookingService.getMyBookings(1, 100).pipe(
            map((result) => result.items),
            catchError(() => of([]))
          );

      bookings$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
        this.bookings = items;
        this.applyPendingBookingSelection();
      });
    } else if (this.patientId) {
      this.bookingService
        .getBookingsByPatientId(this.patientId)
        .pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef))
        .subscribe((items) => {
          this.bookings = items;
        });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bookingIdFilter']) {
      this.applyFilter();
    }

    if (changes['kind'] || changes['patientId'] || changes['bookingIdFilter'] || changes['filterByBooking']) {
      this.loadRecords();
      if (this.allowUpload) {
        this.resetUpload();
      }
    }
  }

  get eyebrow(): string {
    return this.kind === 'document' ? 'Uploads' : 'Lab Records';
  }

  get selectInterface(): 'action-sheet' | 'popover' {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'action-sheet' : 'popover';
  }

  get kindLabelLower(): string {
    return this.kind === 'document' ? 'documents' : 'lab results';
  }

  get titleFieldLabel(): string {
    return this.kind === 'document' ? 'Document Title' : 'Result Title';
  }

  get titlePlaceholder(): string {
    return this.kind === 'document' ? 'Optional document title' : 'Optional result title';
  }

  get notesFieldLabel(): string {
    return this.kind === 'document' ? 'Description' : 'Result Notes';
  }

  get recordDetailLabel(): string {
    return this.kind === 'document' ? 'Description' : 'Notes';
  }

  get fileFieldLabel(): string {
    return this.kind === 'document' ? 'Select Document File' : 'Select Lab Result File';
  }

  get uploadButtonLabel(): string {
    return this.kind === 'document' ? 'Upload Document' : 'Upload Result';
  }

  get emptyTitle(): string {
    if (!this.allowUpload && !this.filterByBooking) {
      return this.kind === 'document' ? 'No documents uploaded yet' : 'No lab results uploaded yet';
    }

    if (this.bookingIdFilter && !this.allowUpload && this.filterByBooking) {
      return 'No patient uploads yet';
    }

    if (this.activeBookingFilter) {
      return this.kind === 'document' ? 'No documents for this booking' : 'No lab results for this booking';
    }

    return this.kind === 'document' ? 'No documents yet' : 'No lab results yet';
  }

  get emptyDescription(): string {
    if (!this.allowUpload && !this.filterByBooking) {
      return 'The patient has not uploaded any files in this category yet.';
    }

    if (this.bookingIdFilter && !this.allowUpload && this.filterByBooking) {
      return 'No patient uploads linked to this booking yet.';
    }

    if (this.activeBookingFilter) {
      return this.kind === 'document'
        ? 'No documents uploaded for this booking yet.'
        : 'No lab results uploaded for this booking yet.';
    }

    return this.kind === 'document'
      ? 'Upload supporting documents and link them to the correct appointment.'
      : 'Upload lab result files and link them to the correct appointment.';
  }

  get activeBookingFilter(): string | undefined {
    if (!this.filterByBooking) {
      return undefined;
    }

    return this.bookingIdFilter || this.queryBookingId || undefined;
  }

  get errorHeader(): string {
    return this.errorTitle || (this.kind === 'document' ? 'Unable to load documents' : 'Unable to load lab results');
  }

  get helperText(): string {
    return this.kind === 'document'
      ? 'Upload documents that are relevant to this booking, such as referrals, medical certificates, previous prescriptions, or supporting files.'
      : 'Upload lab results that are relevant to this booking so your doctor and clinic staff can review them properly.';
  }

  get secondaryMetaLabel(): string {
    return this.kind === 'document' ? 'Source' : 'Status';
  }

  formatBooking(booking: Booking): string {
    const date = new Date(`${booking.appointmentDate}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const doctor = booking.doctorName || 'Doctor';
    const time = this.formatTimeRange(booking);
    return `${date} — ${doctor} — ${time}`;
  }

  formatTimeRange(booking: Booking): string {
    const start = booking.slotStartTime?.trim() ?? '';
    const end = booking.slotEndTime?.trim() ?? '';

    if (!start) {
      return 'Time not available';
    }

    if (!end || end === start) {
      return start;
    }

    return `${start} - ${end}`;
  }

  bookingLabelFor(item: PatientMediaItem): string {
    if (!item.bookingId) {
      return '';
    }

    return this.formatPreviewBooking(item.bookingId);
  }

  formatPreviewBooking(bookingId: string): string {
    const booking = this.bookings.find((entry) => entry.id === bookingId);
    return booking ? this.formatBooking(booking) : 'Linked appointment';
  }

  isImage(item: PatientMediaItem): boolean {
    if (item.fileContentType && item.fileContentType.startsWith('image/')) return true;
    const name = (item.fileName || '').toLowerCase();
    return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp');
  }

  async openPreview(item: PatientMediaItem): Promise<void> {
    const previewItems = this.isImage(item)
      ? this.filteredItems.filter((entry) => this.isImage(entry))
      : [item];
    const startIndex = this.isImage(item) ? previewItems.findIndex((entry) => entry.id === item.id) : 0;

    const modal = await this.modalCtrl.create({
      component: PatientMediaPreviewModalComponent,
      componentProps: {
        items: previewItems.length > 0 ? previewItems : [item],
        startIndex: startIndex >= 0 ? startIndex : 0,
        kind: this.kind,
        bookings: this.bookings,
        patientId: this.patientId || undefined
      },
      cssClass: 'patient-media-preview-modal'
    });

    await modal.present();
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.applyFilter();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedFile = file;
    this.selectedFileName = file?.name ?? '';
  }

  resetUpload(): void {
    const bookingId = this.fromQueryParam
      ? this.pendingBookingId || normalizeOptionalString(this.form.controls.bookingId.value) || ''
      : '';

    this.form.reset({
      title: '',
      notes: '',
      bookingId,
      consultationId: ''
    });
    this.selectedFile = null;
    this.selectedFileName = '';
  }

  upload(): void {
    if (!this.allowUpload || this.uploading || !this.selectedFile) {
      return;
    }

    const values = this.form.getRawValue();
    const bookingId = normalizeOptionalString(values.bookingId);

    if (!bookingId) {
      void this.presentToast('Please select the booking this file belongs to.', 'danger');
      return;
    }

    const consultationId = normalizeOptionalString(values.consultationId);

    this.uploading = true;
    
    const title = normalizeOptionalString(values.title) || this.selectedFileName;

    if (this.kind === 'document') {
      const request: PatientDocumentUploadRequest = {
        file: this.selectedFile,
        bookingId,
        consultationId,
        title,
        description: normalizeOptionalString(values.notes)
      };

      const upload$ = this.patientId
        ? this.documentsService.uploadPatientDocument(this.patientId, request)
        : this.documentsService.uploadMyDocument(request);

      upload$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => this.finishUpload('Document uploaded successfully.'),
        error: (error) => this.failUpload(extractMessage(error, 'Failed to upload document.'))
      });
      return;
    }

    const request: PatientLabResultUploadRequest = {
      file: this.selectedFile,
      bookingId,
      consultationId,
      resultTitle: title,
      resultText: normalizeOptionalString(values.notes)
    };

    const upload$ = this.patientId
      ? this.documentsService.uploadPatientLabResult(this.patientId, request)
      : this.documentsService.uploadMyLabResult(request);

    upload$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.finishUpload('Lab result uploaded successfully.'),
      error: (error) => this.failUpload(extractMessage(error, 'Failed to upload lab result.'))
    });
  }

  download(item: PatientMediaItem): void {
    if (this.isDownloading(item.id) || !item.fileUrl) {
      return;
    }

    this.downloading.add(item.id);
    this.documentsService
      .downloadMediaFile(item, this.kind, this.patientId || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (blob) => {
        this.saveBlob(blob, item.fileName || `${item.id}.bin`);
        this.downloading.delete(item.id);
      },
      error: async (error) => {
        this.downloading.delete(item.id);
        await this.presentToast(extractMessage(error, 'Document not available yet.'));
      }
    });
  }

  isDownloading(id: string): boolean {
    return this.downloading.has(id);
  }

  displayTitle(item: PatientMediaItem): string {
    if (this.kind === 'document') {
      const document = item as PatientDocument;
      return document.title || document.fileName || 'Document';
    }

    const labResult = item as PatientLabResult;
    return labResult.resultTitle || labResult.fileName || 'Lab Result';
  }

  tagLabel(item: PatientMediaItem): string {
    return this.kind === 'document'
      ? (item as PatientDocument).documentType || 'Other'
      : (item as PatientLabResult).status || 'Uploaded';
  }

  secondaryMetaValue(item: PatientMediaItem): string {
    if (this.kind === 'document') {
      const source = (item as PatientDocument).source;
      if (!source) {
        return 'Unknown';
      }

      if (source === 'PatientPortal') {
        return 'Patient Portal';
      }

      if (source === 'StaffUpload') {
        return 'Staff Upload';
      }

      return source;
    }

    return (item as PatientLabResult).status || 'Uploaded';
  }

  recordDetailText(item: PatientMediaItem): string {
    if (this.kind === 'document') {
      return (item as PatientDocument).description || 'No description recorded.';
    }

    return (item as PatientLabResult).resultText || 'No notes recorded.';
  }

  loadRecords(): void {
    const version = ++this.loadToken;
    this.loading = true;
    this.error = '';

    const bookingFilter = this.activeBookingFilter;

    if (this.kind === 'document') {
      const request$ = this.patientId
        ? this.documentsService.getPatientDocuments(this.patientId, bookingFilter)
        : this.documentsService.getMyDocuments(bookingFilter);

      request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (records: PatientDocument[]) => {
          if (version !== this.loadToken) {
            return;
          }

          this.items = records;
          this.applyFilter();
          this.loading = false;
        },
        error: (error: unknown) => {
          if (version !== this.loadToken) {
            return;
          }

          this.items = [];
          this.filteredItems = [];
          this.loading = false;
          this.error = extractMessage(error, `Unable to load ${this.kindLabelLower}. Please try again.`);
        }
      });
      return;
    }

    const request$ = this.patientId
      ? this.documentsService.getPatientLabResults(this.patientId, bookingFilter)
      : this.documentsService.getMyLabResults(bookingFilter);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (records: PatientLabResult[]) => {
        if (version !== this.loadToken) {
          return;
        }

        this.items = records;
        this.applyFilter();
        this.loading = false;
      },
      error: (error: unknown) => {
        if (version !== this.loadToken) {
          return;
        }

        this.items = [];
        this.filteredItems = [];
        this.loading = false;
        this.error = extractMessage(error, `Unable to load ${this.kindLabelLower}. Please try again.`);
      }
    });
  }

  private syncBookingContextFromRoute(bookingId: string | null): void {
    const normalized = bookingId?.trim();
    if (!normalized) {
      return;
    }

    this.pendingBookingId = normalized;
    this.queryBookingId = normalized;
    this.fromQueryParam = true;
    this.applyPendingBookingSelection();
    this.applyFilter();
  }

  private applyPendingBookingSelection(): void {
    if (!this.pendingBookingId) {
      return;
    }

    this.form.patchValue({ bookingId: this.pendingBookingId });
  }

  private applyFilter(): void {
    let source = this.items;
    const bookingFilter = this.activeBookingFilter;

    if (bookingFilter) {
      source = source.filter((item) => item.bookingId === bookingFilter);
    }
  
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredItems = [...source];
      return;
    }

    this.filteredItems = source.filter((item) => {
      const values =
        this.kind === 'document'
          ? [
              (item as PatientDocument).title,
              (item as PatientDocument).documentType,
              (item as PatientDocument).description,
              (item as PatientDocument).fileName,
              (item as PatientDocument).bookingId,
              (item as PatientDocument).consultationId,
              (item as PatientDocument).source
            ]
          : [
              (item as PatientLabResult).resultTitle,
              (item as PatientLabResult).resultText,
              (item as PatientLabResult).fileName,
              (item as PatientLabResult).bookingId,
              (item as PatientLabResult).consultationId,
              (item as PatientLabResult).status
            ];

      const haystack = values
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }

  private finishUpload(message: string): void {
    this.uploading = false;
    this.resetUpload();
    this.applyPendingBookingSelection();
    this.loadRecords();
    void this.presentToast(message);
  }

  private failUpload(message: string): void {
    this.uploading = false;
    void this.presentToast(message, 'danger');
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

  private async presentToast(message: string, color: 'success' | 'danger' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2200,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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

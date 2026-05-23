import { NgFor, NgIf } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ElementRef,
  inject,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonButton, IonInput, IonItem, IonLabel, IonTextarea } from '@ionic/angular/standalone';

export interface LabRequestDraftView {
  id: string;
  testName: string;
  reason?: string;
  fileName?: string;
}

@Component({
  selector: 'app-lab-request-form',
  standalone: true,
  imports: [NgFor, NgIf, ReactiveFormsModule, IonButton, IonInput, IonItem, IonLabel, IonTextarea],
  template: `
    <section class="clinic-card section-card">
      <div class="section-card__head">
        <h3>Labs</h3>
        <p>Create mock lab requests and capture a fake attachment name when needed.</p>
      </div>

      <form class="lab-grid" [formGroup]="form">
        <div class="quick-buttons">
          <button type="button" class="btn-ghost" *ngFor="let quick of quickTests" (click)="setQuickTest(quick)">
            {{ quick }}
          </button>
        </div>

        <ion-item class="field">
          <ion-label position="stacked">Test Name</ion-label>
          <ion-input formControlName="testName" [disabled]="locked"></ion-input>
        </ion-item>
        <ion-item class="field">
          <ion-label position="stacked">Reason</ion-label>
          <ion-textarea formControlName="reason" autoGrow="true" [disabled]="locked"></ion-textarea>
        </ion-item>
        <ion-item class="field">
          <ion-label position="stacked">Attachment File Name</ion-label>
          <ion-input formControlName="fileName" readonly="true" [disabled]="locked"></ion-input>
        </ion-item>

        <input #fileInput type="file" hidden (change)="onFileChange($event)" />
        <div class="attachment-row">
          <button type="button" class="btn-outline" [disabled]="locked" (click)="fileInput.click()">
            Choose File Name
          </button>
          <span>{{ form.get('fileName')?.value || 'No file selected' }}</span>
        </div>

        <button type="button" class="btn-primary" [disabled]="locked" (click)="editIndex >= 0 ? updateRequest() : addRequest()">
          {{ editIndex >= 0 ? 'Update Request' : 'Add Request' }}
        </button>
      </form>

      <div class="request-list" *ngIf="requests.length > 0">
        <article class="request-item" *ngFor="let request of requests; let i = index">
          <div class="request-item__info">
            <strong>{{ request.testName }}</strong>
            <p>{{ request.reason || 'No reason provided' }}</p>
            <span *ngIf="request.fileName">Attachment: {{ request.fileName }}</span>
          </div>
          <div class="request-item__actions">
            <button type="button" class="btn-ghost" [disabled]="locked" (click)="editRequest(i)">Edit</button>
            <button type="button" class="btn-ghost" [disabled]="locked" (click)="removeRequest(i)" style="color:#dc2626">Remove</button>
          </div>
        </article>
      </div>
    </section>
  `,
  styleUrl: './lab-request-form.component.scss'
})
export class LabRequestFormComponent implements OnChanges {
  @Input() value: LabRequestDraftView[] = [];
  @Input() locked = false;
  @Output() requestsChange = new EventEmitter<LabRequestDraftView[]>();

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly quickTests = ['CBC', 'Urinalysis', 'Chest X-ray', 'Fasting Blood Sugar', 'Lipid Profile'];

  readonly form = this.fb.group({
    testName: [''],
    reason: [''],
    fileName: ['']
  });

  requests: LabRequestDraftView[] = [];
  editIndex = -1;

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      // Draft form only; emit happens on add.
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.requests = this.value.map((request) => ({ ...request }));
      this.requestsChange.emit([...this.requests]);
    }

    if (changes['locked']) {
      if (this.locked) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    }
  }

  setQuickTest(value: string): void {
    if (this.locked) {
      return;
    }
    this.form.patchValue({ testName: value });
  }

  onFileChange(event: Event): void {
    if (this.locked) {
      return;
    }
    const input = event.target as HTMLInputElement;
    const fileName = input.files?.[0]?.name ?? '';
    this.form.patchValue({ fileName });
    input.value = '';
  }

  addRequest(): void {
    if (this.locked) {
      return;
    }
    const value = this.form.getRawValue();
    if (!value.testName) {
      return;
    }
    this.requests = [
      ...this.requests,
      {
        id: `labreq-${Date.now()}-${this.requests.length + 1}`,
        testName: value.testName,
        reason: value.reason || undefined,
        fileName: value.fileName || undefined
      }
    ];
    this.requestsChange.emit([...this.requests]);
    this.clearForm();
  }

  editRequest(index: number): void {
    const req = this.requests[index];
    if (!req) return;
    this.editIndex = index;
    this.form.patchValue({ testName: req.testName, reason: req.reason || '', fileName: req.fileName || '' });
  }

  updateRequest(): void {
    if (this.editIndex < 0 || this.editIndex >= this.requests.length) return;
    const v = this.form.getRawValue();
    if (!v.testName) return;
    this.requests = this.requests.map((r, i) => i === this.editIndex
      ? { ...r, testName: v.testName || '', reason: v.reason || undefined, fileName: v.fileName || undefined }
      : r);
    this.requestsChange.emit([...this.requests]);
    this.editIndex = -1;
    this.clearForm();
  }

  removeRequest(index: number): void {
    this.requests = this.requests.filter((_, i) => i !== index);
    if (this.editIndex === index) this.editIndex = -1;
    else if (this.editIndex > index) this.editIndex--;
    this.requestsChange.emit([...this.requests]);
  }

  private clearForm(): void {
    this.form.patchValue({ testName: '', reason: '', fileName: '' }, { emitEvent: false });
  }
}

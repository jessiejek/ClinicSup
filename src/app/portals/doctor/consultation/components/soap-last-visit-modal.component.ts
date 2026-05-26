import { NgIf } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ModalController, IonButton, IonItem, IonLabel, IonTextarea } from '@ionic/angular/standalone';
import { SoapFormValue } from '../../components/soap-form/soap-form.component';

@Component({
  selector: 'app-soap-last-visit-modal',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, IonButton, IonItem, IonLabel, IonTextarea],
  template: `
    <div class="lv-modal">
      <div class="lv-modal__head">
        <h2>Load from last visit</h2>
        <p>Review the previous SOAP note and adjust anything before applying it.</p>
      </div>

      <form class="lv-grid" [formGroup]="form">
        <ion-item class="field">
          <ion-label position="stacked">Chief Complaint</ion-label>
          <ion-textarea formControlName="chiefComplaint" autoGrow="true"></ion-textarea>
        </ion-item>
        <ion-item class="field">
          <ion-label position="stacked">Subjective</ion-label>
          <ion-textarea formControlName="subjective" autoGrow="true"></ion-textarea>
        </ion-item>
        <ion-item class="field">
          <ion-label position="stacked">Objective</ion-label>
          <ion-textarea formControlName="objective" autoGrow="true"></ion-textarea>
        </ion-item>
        <ion-item class="field">
          <ion-label position="stacked">Assessment</ion-label>
          <ion-textarea formControlName="assessment" autoGrow="true"></ion-textarea>
        </ion-item>
        <ion-item class="field field--full">
          <ion-label position="stacked">Plan</ion-label>
          <ion-textarea formControlName="plan" autoGrow="true"></ion-textarea>
        </ion-item>
      </form>

      <div class="lv-actions">
        <button type="button" class="btn-outline" (click)="dismiss()">Cancel</button>
        <button type="button" class="btn-primary" (click)="accept()">Use This Note</button>
      </div>
    </div>
  `,
  styles: [`
    .lv-modal{display:grid;gap:var(--space-4);padding:var(--space-4);min-width:min(720px,calc(100vw - 24px));max-width:900px}
    .lv-modal__head h2{margin:0;font-size:1.2rem}
    .lv-modal__head p{margin:4px 0 0;color:#64748b}
    .lv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-3)}
    .field{--background:transparent;--border-radius:var(--radius-lg)}
    .field--full{grid-column:1/-1}
    .lv-actions{display:flex;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap}
    @media(max-width:720px){.lv-modal{min-width:auto}.lv-grid{grid-template-columns:1fr}}
  `]
})
export class SoapLastVisitModalComponent implements OnChanges {
  @Input() soap: SoapFormValue | null = null;

  private readonly fb = inject(FormBuilder);
  private readonly modalCtrl = inject(ModalController);

  readonly form = this.fb.group({
    chiefComplaint: [''],
    subjective: [''],
    objective: [''],
    assessment: [''],
    plan: ['']
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['soap']) {
      this.form.patchValue(
        {
          chiefComplaint: this.soap?.chiefComplaint ?? '',
          subjective: this.soap?.subjective ?? '',
          objective: this.soap?.objective ?? '',
          assessment: this.soap?.assessment ?? '',
          plan: this.soap?.plan ?? ''
        },
        { emitEvent: false }
      );
    }
  }

  dismiss(): Promise<boolean> {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  accept(): Promise<boolean> {
    return this.modalCtrl.dismiss({ soap: this.form.getRawValue() as SoapFormValue }, 'confirm');
  }
}

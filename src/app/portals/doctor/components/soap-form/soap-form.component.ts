import { NgFor, NgIf } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BannerComponent } from '../../../../shared/components/banner/banner.component';
import { IonItem, IonLabel, IonTextarea } from '@ionic/angular/standalone';

export interface SoapFormValue {
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

@Component({
  selector: 'app-soap-form',
  standalone: true,
  imports: [NgFor, NgIf, ReactiveFormsModule, BannerComponent, IonItem, IonLabel, IonTextarea],
  template: `
    <section class="clinic-card section-card" [class.section-card--locked]="locked" aria-labelledby="soap-notes-heading">
      <div class="section-card__head">
        <div class="section-card__title-row">
          <div>
            <h3 id="soap-notes-heading">SOAP Notes <i *ngIf="locked" class="ti ti-lock section-card__lock"></i></h3>
            <p>Document the consultation in a structured format.</p>
          </div>
          <button type="button" class="section-card__action" [disabled]="!lastVisitSoap" (click)="loadFromLastVisit.emit()">
            Load from last visit
          </button>
        </div>
      </div>

      <app-banner
        *ngIf="locked"
        variant="warning"
        message="This consultation is locked. Create an amendment for changes."
      ></app-banner>

      <form class="soap-grid" [formGroup]="form">
        <div class="soap-field">
          <div class="soap-field__head">
            <ion-label position="stacked">Chief Complaint *</ion-label>
            <button type="button" class="soap-template-btn" [disabled]="locked" (click)="toggleTemplate('chiefComplaint', $event)">⌘</button>
          </div>
          <ion-item class="field" [disabled]="locked">
            <ion-textarea #chiefComplaintInput formControlName="chiefComplaint" autoGrow="true" placeholder="Required"></ion-textarea>
          </ion-item>
          <div class="soap-error" *ngIf="validationRequested && form.get('chiefComplaint')?.invalid">
            Chief Complaint is required.
          </div>
          <div class="soap-template-panel" *ngIf="openTemplateFor === 'chiefComplaint'">
            <button type="button" *ngFor="let phrase of templatePhrases.chiefComplaint" (click)="insertTemplatePhrase('chiefComplaint', phrase)">{{ phrase }}</button>
          </div>
          <div class="soap-meta" [class.soap-meta--warn]="charCount('chiefComplaint') >= 500">
            {{ charCount('chiefComplaint') }} characters
            <span *ngIf="charCount('chiefComplaint') >= 500">Long note - consider being concise.</span>
          </div>
        </div>

        <div class="soap-field">
          <div class="soap-field__head">
            <ion-label position="stacked">Subjective</ion-label>
            <button type="button" class="soap-template-btn" [disabled]="locked" (click)="toggleTemplate('subjective', $event)">⌘</button>
          </div>
          <ion-item class="field" [disabled]="locked">
            <ion-textarea #subjectiveInput formControlName="subjective" autoGrow="true"></ion-textarea>
          </ion-item>
          <div class="soap-template-panel" *ngIf="openTemplateFor === 'subjective'">
            <button type="button" *ngFor="let phrase of templatePhrases.subjective" (click)="insertTemplatePhrase('subjective', phrase)">{{ phrase }}</button>
          </div>
          <div class="soap-meta" [class.soap-meta--warn]="charCount('subjective') >= 500">
            {{ charCount('subjective') }} characters
            <span *ngIf="charCount('subjective') >= 500">Long note - consider being concise.</span>
          </div>
        </div>

        <div class="soap-field">
          <div class="soap-field__head">
            <ion-label position="stacked">Objective</ion-label>
            <button type="button" class="soap-template-btn" [disabled]="locked" (click)="toggleTemplate('objective', $event)">⌘</button>
          </div>
          <ion-item class="field" [disabled]="locked">
            <ion-textarea #objectiveInput formControlName="objective" autoGrow="true"></ion-textarea>
          </ion-item>
          <div class="soap-template-panel" *ngIf="openTemplateFor === 'objective'">
            <button type="button" *ngFor="let phrase of templatePhrases.objective" (click)="insertTemplatePhrase('objective', phrase)">{{ phrase }}</button>
          </div>
          <div class="soap-meta" [class.soap-meta--warn]="charCount('objective') >= 500">
            {{ charCount('objective') }} characters
            <span *ngIf="charCount('objective') >= 500">Long note - consider being concise.</span>
          </div>
        </div>

        <div class="soap-field">
          <div class="soap-field__head">
            <ion-label position="stacked">Assessment</ion-label>
            <button type="button" class="soap-template-btn" [disabled]="locked" (click)="toggleTemplate('assessment', $event)">⌘</button>
          </div>
          <ion-item class="field" [disabled]="locked">
            <ion-textarea #assessmentInput formControlName="assessment" autoGrow="true"></ion-textarea>
          </ion-item>
          <div class="soap-template-panel" *ngIf="openTemplateFor === 'assessment'">
            <button type="button" *ngFor="let phrase of templatePhrases.assessment" (click)="insertTemplatePhrase('assessment', phrase)">{{ phrase }}</button>
          </div>
          <div class="soap-meta" [class.soap-meta--warn]="charCount('assessment') >= 500">
            {{ charCount('assessment') }} characters
            <span *ngIf="charCount('assessment') >= 500">Long note - consider being concise.</span>
          </div>
        </div>

        <div class="soap-field field--full">
          <div class="soap-field__head">
            <ion-label position="stacked">Plan</ion-label>
            <button type="button" class="soap-template-btn" [disabled]="locked" (click)="toggleTemplate('plan', $event)">⌘</button>
          </div>
          <ion-item class="field" [disabled]="locked">
            <ion-textarea #planInput formControlName="plan" autoGrow="true"></ion-textarea>
          </ion-item>
          <div class="soap-template-panel" *ngIf="openTemplateFor === 'plan'">
            <button type="button" *ngFor="let phrase of templatePhrases.plan" (click)="insertTemplatePhrase('plan', phrase)">{{ phrase }}</button>
          </div>
          <div class="soap-meta" [class.soap-meta--warn]="charCount('plan') >= 500">
            {{ charCount('plan') }} characters
            <span *ngIf="charCount('plan') >= 500">Long note - consider being concise.</span>
          </div>
        </div>
      </form>

      <div class="section-card__footer">
        <span>{{ auditText }}</span>
      </div>
    </section>
  `,
  styleUrl: './soap-form.component.scss'
})
export class SoapFormComponent implements OnChanges {
  @Input() value: SoapFormValue | null = null;
  @Input() lastVisitSoap: SoapFormValue | null = null;
  @Input() auditText = 'Not yet edited this visit';
  @Input() locked = false;
  @Input() validationRequested = false;

  @Output() soapChange = new EventEmitter<SoapFormValue>();
  @Output() validityChange = new EventEmitter<boolean>();
  @Output() loadFromLastVisit = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  @ViewChild('chiefComplaintInput') chiefComplaintInput?: IonTextarea;
  @ViewChild('subjectiveInput') subjectiveInput?: IonTextarea;
  @ViewChild('objectiveInput') objectiveInput?: IonTextarea;
  @ViewChild('assessmentInput') assessmentInput?: IonTextarea;
  @ViewChild('planInput') planInput?: IonTextarea;

  readonly form = this.fb.group({
    chiefComplaint: ['', Validators.required],
    subjective: [''],
    objective: [''],
    assessment: [''],
    plan: ['']
  });

  readonly templatePhrases = {
    chiefComplaint: [
      'Fever and chills for 3 days',
      'Persistent cough',
      'Abdominal pain',
      'Follow-up for hypertension',
      'Routine check-up',
      'Headache with nausea',
      'Shortness of breath on exertion'
    ],
    subjective: [
      'Symptoms started gradually and have been worsening.',
      'Reports intermittent discomfort and poor sleep.',
      'Denies chest pain or syncope.',
      'States the medication helped initially but symptoms recurred.',
      'No known recent sick contacts.'
    ],
    objective: [
      'Alert, oriented, and not in acute distress.',
      'Lungs clear to auscultation bilaterally.',
      'Abdomen soft with mild tenderness.',
      'Mild erythema noted on examination.',
      'Vital signs reviewed and documented.'
    ],
    assessment: [
      'Likely viral upper respiratory infection.',
      'Hypertension, currently controlled.',
      'Gastritis versus peptic ulcer disease.',
      'Possible musculoskeletal strain.',
      'Improving clinical course with conservative care.'
    ],
    plan: [
      'Advised rest and increased fluid intake',
      'Prescribed medications as listed',
      'Referred to specialist',
      'Return if symptoms worsen',
      'Follow up in 1 week',
      'Monitor symptoms and keep a home log',
      'Counseled on warning signs and when to seek care'
    ]
  } as const;

  openTemplateFor: keyof SoapFormValue | null = null;

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.emitValue();
    });
    this.form.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.validityChange.emit(this.form.valid);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.form.patchValue(
        {
          chiefComplaint: this.value?.chiefComplaint ?? '',
          subjective: this.value?.subjective ?? '',
          objective: this.value?.objective ?? '',
          assessment: this.value?.assessment ?? '',
          plan: this.value?.plan ?? ''
        },
        { emitEvent: false }
      );
      this.emitValue();
    }

    if (changes['locked']) {
      if (this.locked) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.hostRef.nativeElement.contains(event.target as Node)) {
      this.openTemplateFor = null;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.openTemplateFor = null;
  }

  toggleTemplate(field: keyof SoapFormValue, event: MouseEvent): void {
    event.stopPropagation();
    this.openTemplateFor = this.openTemplateFor === field ? null : field;
  }

  async insertTemplatePhrase(field: keyof SoapFormValue, phrase: string): Promise<void> {
    if (this.locked) {
      return;
    }

    const controlMap: Record<keyof SoapFormValue, IonTextarea | undefined> = {
      chiefComplaint: this.chiefComplaintInput,
      subjective: this.subjectiveInput,
      objective: this.objectiveInput,
      assessment: this.assessmentInput,
      plan: this.planInput
    };

    const ctrl = controlMap[field];
    const input = ctrl ? await ctrl.getInputElement() : null;
    const current = String(this.form.get(field)?.value ?? '');
    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? current.length;
    const nextValue = `${current.slice(0, start)}${phrase}${current.slice(end)}`;

    this.form.patchValue({ [field]: nextValue } as Partial<SoapFormValue>);
    this.openTemplateFor = null;
    queueMicrotask(() => input?.setSelectionRange(start + phrase.length, start + phrase.length));
  }

  charCount(field: keyof SoapFormValue): number {
    return String(this.form.get(field)?.value ?? '').length;
  }

  private emitValue(): void {
    this.soapChange.emit(this.form.getRawValue() as SoapFormValue);
    this.validityChange.emit(this.form.valid);
  }
}

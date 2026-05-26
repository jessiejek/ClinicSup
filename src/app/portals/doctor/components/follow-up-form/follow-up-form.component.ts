import { NgIf } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
  OnChanges,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FollowUp } from '../../../../core/models';
import { IonCheckbox, IonInput, IonItem, IonLabel } from '@ionic/angular/standalone';

export interface FollowUpDraftView {
  id: string;
  followUpDate: string;
  reason: string;
  reminderEnabled: boolean;
}

@Component({
  selector: 'app-follow-up-form',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, IonCheckbox, IonInput, IonItem, IonLabel],
  template: `
    <section class="clinic-card section-card" [class.section-card--locked]="locked" aria-labelledby="followup-heading">
      <div class="section-card__head">
        <h3 id="followup-heading">Follow-up <i *ngIf="locked" class="ti ti-lock section-card__lock"></i></h3>
        <p>Add an optional follow-up appointment and reminder flag.</p>
      </div>

      <form class="follow-grid" [formGroup]="form">
        <ion-item class="field">
          <ion-label position="stacked">Follow-up Date</ion-label>
          <ion-input type="date" formControlName="followUpDate" [disabled]="locked"></ion-input>
        </ion-item>
        <ion-item class="field">
          <ion-label position="stacked">Reason</ion-label>
          <ion-input formControlName="reason" [disabled]="locked"></ion-input>
        </ion-item>
        <label class="reminder-row">
          <ion-checkbox formControlName="reminderEnabled" [disabled]="locked"></ion-checkbox>
          <span>Enable reminder</span>
        </label>
      </form>
    </section>
  `,
  styleUrl: './follow-up-form.component.scss'
})
export class FollowUpFormComponent implements OnChanges {
  @Input() value: FollowUpDraftView | null = null;
  @Input() locked = false;
  @Output() followUpChange = new EventEmitter<FollowUpDraftView | null>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    followUpDate: [this.getDefaultFollowUpDate()],
    reason: [''],
    reminderEnabled: [false]
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.emitValue();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.form.patchValue(
        {
          followUpDate: this.value?.followUpDate ?? this.getDefaultFollowUpDate(),
          reason: this.value?.reason ?? '',
          reminderEnabled: this.value?.reminderEnabled ?? false
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

  private emitValue(): void {
    const value = this.form.getRawValue();
    const followUpDate = value.followUpDate ?? '';
    const reason = value.reason ?? '';

    if (!followUpDate && !reason) {
      this.followUpChange.emit(null);
      return;
    }
    this.followUpChange.emit({
      id: `fu-${Date.now()}`,
      followUpDate,
      reason,
      reminderEnabled: Boolean(value.reminderEnabled)
    });
  }

  private getDefaultFollowUpDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [NgIf, FormsModule],
  template: `
    <div class="confirm-modal__backdrop" *ngIf="isOpen" (click)="cancel()">
      <section class="confirm-modal clinic-card" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <div class="confirm-modal__header">
          <h3 class="confirm-modal__title">{{ title }}</h3>
          <button class="btn-ghost" type="button" (click)="cancel()">Close</button>
        </div>
        <p class="confirm-modal__message">{{ message }}</p>
        <div *ngIf="requireReason" class="confirm-modal__field">
          <label class="confirm-modal__label">{{ reasonLabel }}</label>
          <textarea
            class="filter-input confirm-modal__textarea"
            rows="4"
            name="confirmModalReason"
            [(ngModel)]="reason"
            [ngModelOptions]="{ standalone: true }"
            [placeholder]="reasonLabel"
          ></textarea>
          <p class="confirm-modal__hint">
            Enter at least {{ reasonMinLength }} characters to continue.
          </p>
        </div>
        <div class="confirm-modal__actions">
          <button class="btn-ghost" type="button" (click)="cancel()">
            {{ cancelLabel }}
          </button>
          <button
            [class.btn-danger]="isDanger"
            [class.btn-primary]="!isDanger"
            type="button"
            [disabled]="requireReason && reasonTrimmed.length < reasonMinLength"
            (click)="onConfirm()"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </section>
    </div>
  `,
  styleUrl: './confirm-modal.component.scss'
})
export class ConfirmModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure?';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() isDanger = false;
  @Input() requireReason = false;
  @Input() reasonLabel = 'Reason (required)';
  @Input() reasonMinLength = 10;

  @Output() confirmed = new EventEmitter<string | undefined>();
  @Output() cancelled = new EventEmitter<void>();

  reason = '';

  get reasonTrimmed(): string {
    return this.reason.trim();
  }

  cancel(): void {
    this.reason = '';
    this.cancelled.emit();
  }

  onConfirm(): void {
    const reason = this.requireReason ? this.reasonTrimmed : undefined;
    this.reason = '';
    this.confirmed.emit(reason);
  }
}

import { CommonModule, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTextarea,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { Booking } from '../../../../core/models';

@Component({
  selector: 'app-waive-payment-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIf,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonTextarea
  ],
  template: `
    <ion-modal [isOpen]="isOpen" (didDismiss)="cancelled.emit()">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>Waive Payment</ion-title>
            <ion-buttons slot="end">
              <ion-button fill="clear" (click)="cancelled.emit()">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p class="helper-text">
            Booking {{ booking.id }}
            <span *ngIf="paymentId"> · Payment {{ paymentId }}</span>
          </p>
          <ion-textarea
            name="waiveReason"
            [(ngModel)]="reason"
            [ngModelOptions]="{ standalone: true }"
            label="Reason"
            labelPlacement="stacked"
            placeholder="Why is this payment being waived?"
            [autoGrow]="true"
          ></ion-textarea>
          <div class="modal-actions">
            <button class="btn-ghost" type="button" (click)="cancelled.emit()">Cancel</button>
            <button class="btn-danger" type="button" [disabled]="reasonTrimmed.length < 5" (click)="confirm()">
              Waive Payment
            </button>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styleUrl: './waive-payment-modal.component.scss'
})
export class WaivePaymentModalComponent {
  @Input() booking!: Booking;
  @Input() paymentId: string | null = null;
  @Input() isOpen = false;
  @Output() confirmed = new EventEmitter<{ bookingId: string; paymentId?: string | null; reason: string }>();
  @Output() cancelled = new EventEmitter<void>();

  reason = '';

  get reasonTrimmed(): string {
    return this.reason.trim();
  }

  confirm(): void {
    if (!this.booking || this.reasonTrimmed.length < 5) {
      return;
    }
    this.confirmed.emit({ bookingId: this.booking.id, paymentId: this.paymentId, reason: this.reasonTrimmed });
    this.reason = '';
  }
}

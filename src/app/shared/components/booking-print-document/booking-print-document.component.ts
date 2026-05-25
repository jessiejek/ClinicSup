import { DatePipe, NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PesoPipe } from '../../pipes/peso.pipe';

export type BookingPrintDocumentKind = 'receipt' | 'waived' | 'summary';

export interface BookingPrintDocumentData {
  kind: BookingPrintDocumentKind;
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  logoUrl?: string;
  title: string;
  generatedAt: string;
  bookingId: string;
  paymentId?: string;
  patientName: string;
  patientCode?: string;
  contactNumber?: string;
  email?: string;
  doctorName: string;
  services: string[];
  appointmentDate: string;
  slotStartTime?: string;
  slotEndTime?: string;
  queueNumber?: number | null;
  bookingStatus: string;
  paymentStatus: string;
  paymentMode: string;
  amountDue?: number | null;
  amountPaid?: number | null;
  orNumber?: string;
  referenceNumber?: string;
  paidAt?: string;
  cashierName?: string;
  verifiedByName?: string;
  doctorCompletedAt?: string;
  isWaived: boolean;
  waivedReason?: string;
  waivedByName?: string;
  waivedAt?: string;
}

@Component({
  selector: 'app-booking-print-document',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, UpperCasePipe, PesoPipe],
  template: `
    <section class="booking-print-document" *ngIf="data">
      <div class="booking-print-document__page">
        <header class="booking-print-document__header">
          <div class="booking-print-document__brand">
            <div class="booking-print-document__logo" *ngIf="data.logoUrl; else logoPlaceholder">
              <img [src]="data.logoUrl" [alt]="data.clinicName + ' logo'" />
            </div>
            <ng-template #logoPlaceholder>
              <div class="booking-print-document__logo booking-print-document__logo--placeholder">LOGO</div>
            </ng-template>

            <div class="booking-print-document__clinic">
              <h1>{{ data.clinicName }}</h1>
              <p *ngIf="data.clinicAddress">{{ data.clinicAddress }}</p>
              <p *ngIf="data.clinicPhone">{{ data.clinicPhone }}</p>
              <p *ngIf="data.clinicEmail">{{ data.clinicEmail }}</p>
            </div>
          </div>

          <div class="booking-print-document__meta">
            <div class="booking-print-document__eyebrow">{{ data.title }}</div>
            <div class="booking-print-document__reference" *ngIf="data.kind !== 'summary' && data.orNumber">
              OR # {{ data.orNumber }}
            </div>
            <div class="booking-print-document__timestamp">
              Generated {{ data.generatedAt | date : 'MMMM d, y (EEE) h:mm a' }}
            </div>
          </div>
        </header>

        <section class="booking-print-document__notice" *ngIf="data.kind === 'summary'">
          <strong>Booking Summary</strong>
          <p>This document is not an official receipt. It summarizes the booking and current payment state.</p>
        </section>

        <section class="booking-print-document__notice booking-print-document__notice--waived" *ngIf="data.kind === 'waived'">
          <strong>Waived Payment Summary</strong>
          <p>This record confirms that the clinic waived the professional fee for this booking.</p>
        </section>

        <section class="booking-print-document__section">
          <h2>Patient</h2>
          <dl class="booking-print-document__grid">
            <div>
              <dt>Name</dt>
              <dd>{{ data.patientName }}</dd>
            </div>
            <div *ngIf="data.patientCode">
              <dt>Patient Code</dt>
              <dd class="data-mono">{{ data.patientCode }}</dd>
            </div>
            <div *ngIf="data.contactNumber">
              <dt>Contact Number</dt>
              <dd>{{ data.contactNumber }}</dd>
            </div>
            <div *ngIf="data.email">
              <dt>Email</dt>
              <dd>{{ data.email }}</dd>
            </div>
          </dl>
        </section>

        <section class="booking-print-document__section">
          <h2>Booking</h2>
          <dl class="booking-print-document__grid">
            <div>
              <dt>Booking ID</dt>
              <dd class="data-mono">{{ data.bookingId }}</dd>
            </div>
            <div *ngIf="data.paymentId">
              <dt>Payment ID</dt>
              <dd class="data-mono">{{ data.paymentId }}</dd>
            </div>
            <div>
              <dt>Appointment Date</dt>
              <dd>{{ data.appointmentDate | date : 'MMMM d, y (EEE)' }}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{{ timeRangeLabel }}</dd>
            </div>
            <div *ngIf="data.queueNumber !== null && data.queueNumber !== undefined">
              <dt>Queue #</dt>
              <dd class="data-mono">#{{ data.queueNumber }}</dd>
            </div>
            <div>
              <dt>Doctor</dt>
              <dd>{{ data.doctorName }}</dd>
            </div>
            <div class="booking-print-document__grid-span">
              <dt>Services</dt>
              <dd>{{ servicesLabel }}</dd>
            </div>
            <div>
              <dt>Booking Status</dt>
              <dd>{{ data.bookingStatus }}</dd>
            </div>
            <div>
              <dt>Payment Status</dt>
              <dd>{{ data.paymentStatus }}</dd>
            </div>
            <div>
              <dt>Payment Mode</dt>
              <dd>{{ data.paymentMode }}</dd>
            </div>
            <div *ngIf="data.doctorCompletedAt">
              <dt>Doctor Completed</dt>
              <dd>{{ data.doctorCompletedAt | date : 'MMMM d, y (EEE) h:mm a' }}</dd>
            </div>
          </dl>
        </section>

        <section class="booking-print-document__section">
          <h2>Payment</h2>
          <dl class="booking-print-document__grid">
            <div *ngIf="data.kind === 'summary'">
              <dt>Amount Due</dt>
              <dd class="booking-print-document__amount">{{ data.amountDue | peso }}</dd>
            </div>
            <div *ngIf="data.kind !== 'summary'">
              <dt>{{ data.isWaived ? 'Waived Amount' : 'Amount Paid' }}</dt>
              <dd class="booking-print-document__amount">{{ (data.amountPaid ?? 0) | peso }}</dd>
            </div>
            <div>
              <dt>Payment Method</dt>
              <dd>{{ data.paymentMode }}</dd>
            </div>
            <div *ngIf="data.referenceNumber">
              <dt>Reference #</dt>
              <dd>{{ data.referenceNumber }}</dd>
            </div>
            <div *ngIf="data.orNumber && data.kind !== 'summary'">
              <dt>OR Number</dt>
              <dd class="data-mono">{{ data.orNumber }}</dd>
            </div>
            <div *ngIf="data.paidAt">
              <dt>Paid At</dt>
              <dd>{{ data.paidAt | date : 'MMMM d, y (EEE) h:mm a' }}</dd>
            </div>
            <div *ngIf="data.cashierName">
              <dt>Cashier</dt>
              <dd>{{ data.cashierName }}</dd>
            </div>
            <div *ngIf="data.verifiedByName">
              <dt>Verified By</dt>
              <dd>{{ data.verifiedByName }}</dd>
            </div>
            <div *ngIf="data.isWaived && data.waivedReason" class="booking-print-document__grid-span">
              <dt>Waived Reason</dt>
              <dd>{{ data.waivedReason }}</dd>
            </div>
            <div *ngIf="data.waivedByName">
              <dt>Waived By</dt>
              <dd>{{ data.waivedByName }}</dd>
            </div>
            <div *ngIf="data.waivedAt">
              <dt>Waived At</dt>
              <dd>{{ data.waivedAt | date : 'MMMM d, y (EEE) h:mm a' }}</dd>
            </div>
          </dl>
        </section>

        <footer class="booking-print-document__footer">
          <p>This document was generated by {{ data.clinicName }}.</p>
          <p>Printed {{ data.generatedAt | date : 'MMMM d, y (EEE) h:mm a' }}</p>
        </footer>
      </div>
    </section>
  `,
  styleUrls: ['./booking-print-document.component.scss']
})
export class BookingPrintDocumentComponent {
  @Input() data: BookingPrintDocumentData | null = null;

  get servicesLabel(): string {
    if (!this.data) {
      return 'No services listed';
    }

    return this.data.services.length > 0 ? this.data.services.join(', ') : 'No services listed';
  }

  get timeRangeLabel(): string {
    if (!this.data?.slotStartTime) {
      return 'Time not available';
    }

    if (!this.data.slotEndTime || this.data.slotEndTime === this.data.slotStartTime) {
      return this.data.slotStartTime;
    }

    return `${this.data.slotStartTime} - ${this.data.slotEndTime}`;
  }
}

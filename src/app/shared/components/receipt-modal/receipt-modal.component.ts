import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, printOutline } from 'ionicons/icons';
import { ReceiptData } from '../../../core/models';
import { ReceiptViewComponent } from '../receipt-view/receipt-view.component';

@Component({
  selector: 'app-receipt-modal',
  standalone: true,
  imports: [
    NgIf,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    ReceiptViewComponent
  ],
  template: `
    <ion-modal [isOpen]="isOpen" (didDismiss)="closed.emit()">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>Payment Receipt</ion-title>
            <ion-buttons slot="end">
              <ion-button fill="clear" (click)="closed.emit()">
                <ion-icon name="close-outline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <app-receipt-view *ngIf="data" [data]="data"></app-receipt-view>
          <div class="modal-actions no-print" style="margin-top: var(--space-6);">
            <button class="btn-ghost" type="button" (click)="closed.emit()">Close</button>
            <button class="btn-primary" type="button" (click)="print()">
              <ion-icon name="print-outline"></ion-icon>
              Print Receipt
            </button>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styleUrls: ['./receipt-modal.component.scss']
})
export class ReceiptModalComponent {
  @Input() isOpen = false;
  @Input() data: ReceiptData | null = null;
  @Output() closed = new EventEmitter<void>();

  constructor() {
    addIcons({ closeOutline, printOutline });
  }

  print(): void {
    if (!this.data) {
      return;
    }

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
    if (!popup) {
      window.print();
      return;
    }

    popup.document.open();
    popup.document.write(buildReceiptPrintHtml(this.data));
    popup.document.close();
    popup.focus();

    const triggerPrint = (): void => {
      popup.print();
      popup.close();
    };

    if (popup.document.readyState === 'complete') {
      window.setTimeout(triggerPrint, 0);
    } else {
      popup.onload = () => window.setTimeout(triggerPrint, 0);
    }
  }
}

function buildReceiptPrintHtml(data: ReceiptData): string {
  const title = data.isWaived ? 'WAIVED PAYMENT SUMMARY' : 'OFFICIAL RECEIPT';
  const statusLabel = data.isWaived ? 'Waived' : 'Paid';
  const amountLabel = data.isWaived ? 'Waived Amount' : 'Amount Paid';
  const services = (data.services ?? []).length > 0 ? (data.services ?? []).join(', ') : data.serviceName ?? 'No services listed';
  const timeRange = data.slotTime || data.slotStartTime || 'Time not available';
  const generatedAt = new Date().toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            background: #f8fafc;
            color: #111827;
          }
          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #fff;
            padding: 18mm 16mm;
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-start;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .brand {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            min-width: 0;
          }
          .logo {
            width: 56px;
            height: 56px;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            background: #f8fafc;
            display: grid;
            place-items: center;
            color: #64748b;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
          }
          .clinic h1,
          .clinic p,
          .meta p,
          .notice p,
          .section h2,
          .field dt,
          .field dd,
          .footer p {
            margin: 0;
          }
          .clinic h1 {
            font-size: 18px;
            line-height: 1.2;
            font-weight: 800;
          }
          .clinic p {
            margin-top: 4px;
            font-size: 12px;
            line-height: 1.4;
            color: #4b5563;
          }
          .meta {
            text-align: right;
          }
          .meta .eyebrow {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #0f172a;
          }
          .meta .or {
            margin-top: 4px;
            font-family: 'Courier New', monospace;
            font-size: 15px;
            font-weight: 700;
          }
          .meta .stamp {
            margin-top: 4px;
            font-size: 12px;
            color: #4b5563;
          }
          .notice {
            margin: 0 0 16px;
            padding: 12px 14px;
            border-radius: 12px;
            border: 1px solid #d1d5db;
            background: #f8fafc;
          }
          .section {
            margin-top: 14px;
          }
          .section h2 {
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #475569;
            padding-bottom: 6px;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 10px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px 16px;
          }
          .grid > div {
            min-width: 0;
          }
          .grid .span-2 {
            grid-column: 1 / -1;
          }
          .field dt {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 3px;
          }
          .field dd {
            font-size: 13px;
            line-height: 1.45;
            overflow-wrap: anywhere;
          }
          .amount {
            font-size: 16px;
            font-weight: 800;
          }
          .footer {
            margin-top: 18px;
            border-top: 1px solid #d1d5db;
            padding-top: 12px;
            font-size: 11px;
            color: #4b5563;
          }
          @media print {
            body { background: #fff; }
            .page { width: auto; min-height: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="header">
            <div class="brand">
              <div class="logo">LOGO</div>
              <div class="clinic">
                <h1>${escapeHtml(data.clinicName)}</h1>
                ${data.clinicAddress ? `<p>${escapeHtml(data.clinicAddress)}</p>` : ''}
              </div>
            </div>
            <div class="meta">
              <p class="eyebrow">${escapeHtml(title)}</p>
              ${data.orNumber ? `<p class="or">OR # ${escapeHtml(data.orNumber)}</p>` : ''}
              <p class="stamp">Generated ${escapeHtml(generatedAt)}</p>
            </div>
          </header>

          <section class="section">
            <h2>Patient</h2>
            <dl class="grid field">
              <div>
                <dt>Name</dt>
                <dd>${escapeHtml(data.patientName)}</dd>
              </div>
              ${data.patientCode ? `<div><dt>Patient Code</dt><dd>${escapeHtml(data.patientCode)}</dd></div>` : ''}
            </dl>
          </section>

          <section class="section">
            <h2>Booking</h2>
            <dl class="grid field">
              <div><dt>Booking ID</dt><dd>${escapeHtml(data.bookingId)}</dd></div>
              <div><dt>Doctor</dt><dd>${escapeHtml(data.doctorName)}</dd></div>
              <div><dt>Services</dt><dd>${escapeHtml(services)}</dd></div>
              <div><dt>Appointment Date</dt><dd>${escapeHtml(data.appointmentDate)}</dd></div>
              <div><dt>Time</dt><dd>${escapeHtml(timeRange)}</dd></div>
              ${data.doctorCompletedAt ? `<div><dt>Doctor Completed</dt><dd>${escapeHtml(data.doctorCompletedAt)}</dd></div>` : ''}
            </dl>
          </section>

          <section class="section">
            <h2>Payment</h2>
            <dl class="grid field">
              <div>
                <dt>Status</dt>
                <dd>${escapeHtml(statusLabel)}</dd>
              </div>
              <div>
                <dt>Payment Method</dt>
                <dd>${escapeHtml(data.paymentMethod)}</dd>
              </div>
              <div class="span-2">
                <dt>${escapeHtml(amountLabel)}</dt>
                <dd class="amount">${formatPeso(data.amountPaid ?? 0)}</dd>
              </div>
              ${data.referenceNumber ? `<div><dt>Reference #</dt><dd>${escapeHtml(data.referenceNumber)}</dd></div>` : ''}
              ${data.paidAt ? `<div><dt>Paid At</dt><dd>${escapeHtml(data.paidAt)}</dd></div>` : ''}
              ${data.cashierName ? `<div><dt>Cashier</dt><dd>${escapeHtml(data.cashierName)}</dd></div>` : ''}
              ${data.verifiedByName ? `<div><dt>Verified By</dt><dd>${escapeHtml(data.verifiedByName)}</dd></div>` : ''}
              ${data.isWaived && data.waivedReason ? `<div class="span-2"><dt>Waived Reason</dt><dd>${escapeHtml(data.waivedReason)}</dd></div>` : ''}
              ${data.waivedByName ? `<div><dt>Waived By</dt><dd>${escapeHtml(data.waivedByName)}</dd></div>` : ''}
              ${data.waivedAt ? `<div><dt>Waived At</dt><dd>${escapeHtml(data.waivedAt)}</dd></div>` : ''}
            </dl>
          </section>

          <footer class="footer">
            <p>This document was generated by ${escapeHtml(data.clinicName)}.</p>
          </footer>
        </main>
      </body>
    </html>
  `;
}

function formatPeso(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function escapeHtml(value: string | undefined | null): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

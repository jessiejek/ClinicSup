import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { BookingStatus, DoctorStatus, PaymentStatus } from '../../../core/models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="badge" [ngClass]="cssClass">{{ displayLabel }}</span>
  `,
  styleUrl: './status-badge.component.scss'
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: BookingStatus | PaymentStatus | DoctorStatus | string;
  @Input() labelOverride?: string;
  @Input() portal?: 'patient' | 'staff' | 'doctor' | 'admin';
  @Input() paymentStatus?: PaymentStatus | string | null;

  /** Compute CSS class based on portal, status and payment status */
  get cssClass(): string {
    const portalPrefix = this.portal ? `${this.portal}-` : '';
    const statusKey = this._statusKey();
    const kebab = statusKey
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .replace(/\//g, '-')
      .replace(/_/g, '-')
      .toLowerCase();
    return `badge--${portalPrefix}${kebab}`;
  }

  /** Resolve a unique key for CSS class generation */
  private _statusKey(): string {
    const raw = String(this.status);
    // For booking statuses that need payment status differentiation
    const payment = this.paymentStatus ? String(this.paymentStatus) : '';
    if (raw === 'Completed' && payment) {
      return `${raw}-${payment}`;
    }
    return raw;
  }

  get displayLabel(): string {
    const override = typeof this.labelOverride === 'string' ? this.labelOverride.trim() : '';
    if (override) {
      return override;
    }
    const raw = String(this.status);
    const portal = this.portal ?? 'admin';
    const payment = this.paymentStatus;

    // Booking status mapping
    const bookingMap: Record<string, string> = {
      Pending: 'Pending',
      ProofSubmitted: 'Proof Submitted',
      Confirmed: 'Confirmed',
      CheckedIn: 'Checked In',
      OnHold: 'On Hold',
      Cancelled: 'Cancelled',
      Completed: 'Completed',
      Expired: 'Expired',
      NoShow: 'No Show',
      Rescheduled: 'Rescheduled'
    };
    // Payment status mapping
    const paymentMap: Record<string, string> = {
      Unpaid: 'Unpaid',
      Paid: 'Paid',
      Waived: 'Waived',
      Refunded: 'Refunded'
    };

    // Portal‑specific display logic
    if (portal === 'patient') {
      if (raw === 'Confirmed') return 'Booked';
      if (raw === 'CheckedIn') return 'In Clinic';
      if (raw === 'Completed' && payment === 'Unpaid') return 'For Payment';
      if (raw === 'Completed' && payment === 'Paid') return 'Completed / Paid';
      if (raw === 'Completed' && payment === 'Waived') return 'PF Waived';
    }
    if (portal === 'staff') {
      if (raw === 'Confirmed') return 'Booked';
      if (raw === 'CheckedIn') return 'In Clinic';
      if (raw === 'Completed' && payment === 'Unpaid') return 'For Payment';
      if (raw === 'Paid') return 'Paid';
      if (raw === 'Waived') return 'PF Waived';
    }
    if (portal === 'doctor') {
      if (raw === 'Confirmed') return 'Waiting';
      if (raw === 'CheckedIn') return 'In Clinic';
      if (raw === 'Completed') return 'Completed';
    }
    if (portal === 'admin') {
      // Use generic readable mapping for admin
      return bookingMap[raw] || raw;
    }
    // Fallback generic mapping
    return bookingMap[raw] || paymentMap[raw] || raw;
  }
}

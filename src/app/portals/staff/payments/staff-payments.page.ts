import { DecimalPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastController } from '@ionic/angular/standalone';
import {
  BookingService,
  ConfirmPaymentRequest,
  PagedResult,
  StaffForPaymentItem
} from '../../../core/services/booking.service';
import { ClinicDashboardRealtimeService } from '../../../core/services/clinic-dashboard-realtime.service';
import { ReceiptData } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ReceiptModalComponent } from '../../../shared/components/receipt-modal/receipt-modal.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type CollectPaymentMethod = 'Cash' | 'GCash' | 'Maya' | 'BankTransfer';

interface CollectPaymentMethodOption {
  value: CollectPaymentMethod;
  label: string;
}

@Component({
  selector: 'app-staff-payments-page',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    NgFor,
    NgIf,
    FormsModule,
    PageHeaderComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    ConfirmModalComponent,
    ReceiptModalComponent
  ],
  template: `
    <section class="pp">
      <app-page-header
        title="Payment Queue"
        subtitle="Collect payment for completed consultations with an amount due"
      ></app-page-header>

      <div class="sg" *ngIf="!isLoading">
        <article class="stat-card stat-card--green">
          <div class="stat-card__accent"></div>
          <div class="stat-card__body">
            <p class="stat-card__label">Ready to collect</p>
            <div class="stat-card__value">{{ readyForPaymentCount }}</div>
            <p class="stat-card__trend">Completed consultations still waiting on payment.</p>
          </div>
        </article>
        <article class="stat-card stat-card--red">
          <div class="stat-card__accent"></div>
          <div class="stat-card__body">
            <p class="stat-card__label">Total due on page</p>
            <div class="stat-card__value">PHP {{ totalDueOnPage | number : '1.0-0' }}</div>
            <p class="stat-card__trend">Current batch only, before pagination.</p>
          </div>
        </article>
        <article class="stat-card stat-card--blue">
          <div class="stat-card__accent"></div>
          <div class="stat-card__body">
            <p class="stat-card__label">Page view</p>
            <div class="stat-card__value">{{ currentPage }} / {{ totalPages }}</div>
            <p class="stat-card__trend">Showing {{ items.length }} record(s) on this page.</p>
          </div>
        </article>
      </div>

      <div class="payment-loading" *ngIf="isLoading">Loading payment queue...</div>

      <ng-container *ngIf="!isLoading">
        <section class="pc" *ngIf="items.length > 0; else emptyState">
          <div class="pch">
            <div>
              <div class="section-heading">Outstanding professional fees</div>
              <p class="page-subtitle">Review completed consultations and collect or waive the professional fee.</p>
            </div>
            <div class="data-mono">Page {{ currentPage }} of {{ totalPages }}</div>
          </div>

        <div class="tw">
          <table class="pt">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor / Services</th>
                <th>Date / Time</th>
                <th>Queue</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Amount Due</th>
                <th>Dr Completed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of items">
                <td><strong>{{ patientLabel(item) }}</strong></td>
                <td>
                  <div class="cd"><span class="cn">{{ doctorLabel(item) }}</span><span class="cs">{{ servicesLabel(item) }}</span></div>
                </td>
                <td>
                  <div>{{ item.appointmentDate | date : 'MMM d, y' }}</div>
                  <div class="data-mono">{{ item.slotStartTime }}</div>
                </td>
                <td class="qn"><strong>{{ queueLabel(item) }}</strong></td>
                <td class="st">
                  <app-status-badge portal="staff" [status]="item.status"></app-status-badge>
                </td>
                <td class="pm">
                  <app-status-badge portal="staff" [status]="item.paymentStatus"></app-status-badge>
                </td>
                <td class="am">PHP {{ item.amountDue | number : '1.0-0' }}</td>
                <td class="dc">
                  {{ item.doctorCompletedAt ? (item.doctorCompletedAt | date : 'MMM d, y h:mm a') : '-' }}
                </td>
                <td class="ac">
                  <ng-container *ngIf="canTakePaymentAction(item); else noDesktopAction">
                    <div class="ar">
                      <button type="button" class="btn-primary" (click)="openPaymentModal(item)">Confirm Payment</button>
                      <button type="button" class="btn-outline" (click)="openWaiveModal(item)">Waive PF</button>
                    </div>
                  </ng-container>
                  <ng-template #noDesktopAction>&mdash;</ng-template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="ml">
          <div class="mc" *ngFor="let item of items">
            <div class="mch">
              <div class="mci">
                <strong>{{ patientLabel(item) }}</strong>
              </div>
              <div class="mcb">
                <app-status-badge portal="staff" [status]="item.status"></app-status-badge>
                <app-status-badge portal="staff" [status]="item.paymentStatus"></app-status-badge>
              </div>
            </div>
            <dl class="mcd">
              <div><dt>Doctor</dt><dd>{{ doctorLabel(item) }}</dd></div>
              <div><dt>Services</dt><dd>{{ servicesLabel(item) }}</dd></div>
              <div><dt>Date/Time</dt><dd>{{ item.appointmentDate | date : 'MMM d, y' }} {{ item.slotStartTime }}</dd></div>
              <div><dt>Amount Due</dt><dd>PHP {{ item.amountDue | number : '1.0-0' }}</dd></div>
              <div><dt>Completed</dt><dd>{{ item.doctorCompletedAt ? (item.doctorCompletedAt | date : 'MMM d, y h:mm a') : '-' }}</dd></div>
            </dl>
            <div class="mca">
              <ng-container *ngIf="canTakePaymentAction(item); else noMobileAction">
                <button type="button" class="btn-primary" (click)="openPaymentModal(item)">Confirm Payment</button>
                <button type="button" class="btn-outline" (click)="openWaiveModal(item)">Waive PF</button>
              </ng-container>
              <ng-template #noMobileAction>&mdash;</ng-template>
            </div>
          </div>
        </div>

        <div class="pg" *ngIf="totalPages > 1">
          <button type="button" class="btn-ghost" (click)="previousPage()" [disabled]="currentPage <= 1 || isLoading">Previous</button>
          <span>Page {{ currentPage }} of {{ totalPages }}</span>
          <button type="button" class="btn-ghost" (click)="nextPage()" [disabled]="currentPage >= totalPages || isLoading">Next</button>
        </div>
      </section>
      </ng-container>

      <ng-template #emptyState>
        <app-empty-state
          icon="cash-outline"
          title="No queue items for now."
          description="Completed bookings with an unpaid professional fee will appear here."
        ></app-empty-state>
      </ng-template>

      <div *ngIf="paymentModalOpen" class="pb" (click)="closePaymentModal()">
        <section class="pw" role="dialog" aria-modal="true" aria-labelledby="collect-payment-title" (click)="$event.stopPropagation()">
          <div class="ph">
            <h3 class="section-heading" id="collect-payment-title" style="margin-bottom:0">Collect Payment</h3>
            <button type="button" class="btn-ghost" (click)="closePaymentModal()">&times;</button>
          </div>
          <div class="ps" *ngIf="selectedItem as item">
            <div><small>Patient</small><strong>{{ item.patientName || 'Unknown Patient' }}</strong></div>
            <div><small>Doctor</small><strong>{{ item.doctorName || 'Doctor' }}</strong></div>
            <div><small>Services</small><strong>{{ servicesLabel(item) }}</strong></div>
            <div><small>Amount Due</small><strong>PHP {{ item.amountDue | number : '1.0-0' }}</strong></div>
            <div><small>Queue</small><strong>{{ queueLabel(item) }}</strong></div>
          </div>
          <div class="pf">
            <div class="pd"><label>Payment Method</label><select class="filter-input" name="paymentMethod" [(ngModel)]="paymentMethod" [ngModelOptions]="{ standalone: true }"><option *ngFor="let method of paymentMethods" [value]="method.value">{{ method.label }}</option></select></div>
            <div class="pd"><label>Amount Received</label><input class="filter-input" type="number" min="0" name="amountReceived" [(ngModel)]="amountReceived" [ngModelOptions]="{ standalone: true }" /></div>
            <div class="pd"><label>Reference Number <span style="color:#94a3b8;font-weight:400">(optional)</span></label><input class="filter-input" type="text" name="referenceNumber" [(ngModel)]="referenceNumber" [ngModelOptions]="{ standalone: true }" /></div>
            <div class="pd" style="grid-column:1/-1"><label>Notes <span style="color:#94a3b8;font-weight:400">(optional)</span></label><textarea class="filter-input" rows="3" name="paymentNotes" [(ngModel)]="notes" [ngModelOptions]="{ standalone: true }"></textarea></div>
          </div>
          <div class="flex" style="display:flex;gap:var(--space-3);margin-top:var(--space-6);justify-content:space-between">
            <button type="button" class="btn-outline" (click)="closePaymentModal()">Cancel</button>
            <button type="button" class="btn-primary" [disabled]="isSubmitting" (click)="confirmPayment()">{{ isSubmitting ? 'Confirming...' : 'Confirm Payment' }}</button>
          </div>
        </section>
      </div>

      <app-confirm-modal
        *ngIf="waiveModalOpen"
        [isOpen]="waiveModalOpen"
        title="Waive PF"
        message="Waive the professional fee for this completed consultation?"
        confirmLabel="Waive PF"
        [isDanger]="true"
        [requireReason]="true"
        [reasonMinLength]="waiverReasonMinLength"
        reasonLabel="Waive reason"
        (confirmed)="confirmWaive($event)"
        (cancelled)="closeWaiveModal()"
      ></app-confirm-modal>

      <app-receipt-modal [isOpen]="receiptModalOpen" [data]="receiptData" (closed)="receiptModalOpen = false"></app-receipt-modal>
    </section>
  `,
  styleUrl: './staff-payments.page.scss'
})
export class StaffPaymentsPage implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly realtime = inject(ClinicDashboardRealtimeService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  items: StaffForPaymentItem[] = [];
  isLoading = false;
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;

  paymentModalOpen = false;
  selectedItem: StaffForPaymentItem | null = null;
  paymentMethod: CollectPaymentMethod = 'Cash';
  amountReceived = 0;
  referenceNumber = '';
  notes = '';
  isSubmitting = false;
  waiveModalOpen = false;
  waiveTarget: StaffForPaymentItem | null = null;

  receiptModalOpen = false;
  receiptData: ReceiptData | null = null;

  readonly waiverReasonMinLength = 5;
  readonly paymentMethods: CollectPaymentMethodOption[] = [
    { value: 'Cash', label: 'Cash' },
    { value: 'GCash', label: 'GCash' },
    { value: 'Maya', label: 'Maya' },
    { value: 'BankTransfer', label: 'Bank Transfer' }
  ];

  ngOnInit(): void {
    this.loadQueue();
    void this.realtime.ensureConnected();
    this.realtime.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (
          ['DoctorCompletedConsultation', 'PaymentCompleted', 'PaymentWaived'].includes(event.eventName)
        ) {
          this.loadQueue();
        }
      });
  }

  previousPage(): void {
    if (this.currentPage <= 1 || this.isLoading) {
      return;
    }

    this.currentPage -= 1;
    this.loadQueue();
  }

  nextPage(): void {
    if (this.currentPage >= this.totalPages || this.isLoading) {
      return;
    }

    this.currentPage += 1;
    this.loadQueue();
  }

  get readyForPaymentCount(): number {
    return this.items.filter((item) => this.canTakePaymentAction(item)).length;
  }

  get totalDueOnPage(): number {
    return this.items.reduce((total, item) => total + (item.amountDue ?? 0), 0);
  }

  openPaymentModal(item: StaffForPaymentItem): void {
    if (!this.canTakePaymentAction(item)) {
      return;
    }

    this.waiveModalOpen = false;
    this.waiveTarget = null;
    this.selectedItem = item;
    this.paymentModalOpen = true;
    this.paymentMethod = 'Cash';
    this.amountReceived = item.amountDue;
    this.referenceNumber = '';
    this.notes = '';
  }

  closePaymentModal(): void {
    this.paymentModalOpen = false;
    this.selectedItem = null;
    this.isSubmitting = false;
  }

  openWaiveModal(item: StaffForPaymentItem): void {
    if (!this.canTakePaymentAction(item)) {
      return;
    }

    this.paymentModalOpen = false;
    this.selectedItem = null;
    this.waiveTarget = item;
    this.waiveModalOpen = true;
    this.isSubmitting = false;
  }

  closeWaiveModal(): void {
    this.waiveModalOpen = false;
    this.waiveTarget = null;
    this.isSubmitting = false;
  }

  confirmPayment(): void {
    if (!this.selectedItem || this.isSubmitting) {
      return;
    }

    if (!this.canTakePaymentAction(this.selectedItem)) {
      void this.presentToast('This payment is no longer available to collect.', 'warning');
      return;
    }

    if (this.amountReceived < this.selectedItem.amountDue) {
      void this.presentToast('Amount received must be equal to or greater than the amount due.', 'warning');
      return;
    }

    const payload: ConfirmPaymentRequest = {
      paymentMethod: this.paymentMethod,
      amountReceived: this.amountReceived
    };

    const referenceNumber = this.referenceNumber.trim();
    if (referenceNumber) {
      payload.referenceNumber = referenceNumber;
    }

    const notes = this.notes.trim();
    if (notes) {
      payload.notes = notes;
    }

    this.isSubmitting = true;
    this.bookingService.confirmPayment(this.selectedItem.paymentId, payload).subscribe({
      next: async (receipt) => {
        this.closePaymentModal();
        this.loadQueue();
        window.setTimeout(() => {
          this.receiptData = receipt;
          this.receiptModalOpen = true;
        }, 0);
        await this.presentToast('Payment confirmed.', 'success');
      },
      error: async (error) => {
        this.isSubmitting = false;
        await this.presentToast(extractApiErrorMessage(error, 'Failed to confirm payment.'), 'danger');
      }
    });
  }

  confirmWaive(reason?: string): void {
    if (!this.waiveTarget || this.isSubmitting) {
      return;
    }

    if (!this.canTakePaymentAction(this.waiveTarget)) {
      void this.presentToast('This payment is no longer available to waive.', 'warning');
      return;
    }

    const waiveReason = (reason ?? '').trim();
    if (waiveReason.length < this.waiverReasonMinLength) {
      void this.presentToast(
        `Please provide a waiver reason with at least ${this.waiverReasonMinLength} characters.`,
        'warning'
      );
      return;
    }

    this.isSubmitting = true;
    this.bookingService.waivePayment$(this.waiveTarget.bookingId, waiveReason).subscribe({
      next: async () => {
        this.closeWaiveModal();
        this.loadQueue();
        await this.presentToast('PF waived.', 'success');
      },
      error: async (error) => {
        this.isSubmitting = false;
        await this.presentToast(extractApiErrorMessage(error, 'Failed to waive PF.'), 'danger');
      }
    });
  }

  canTakePaymentAction(item: StaffForPaymentItem): boolean {
    return item.status === 'Completed' && item.paymentStatus === 'Unpaid' && Boolean(item.paymentId);
  }

  patientLabel(item: StaffForPaymentItem): string {
    return firstText(item.patientName, personLabel(getNestedValue(item, 'patient'))) || 'Unknown Patient';
  }

  doctorLabel(item: StaffForPaymentItem): string {
    return firstText(item.doctorName, personLabel(getNestedValue(item, 'doctor'))) || 'Doctor not assigned';
  }

  servicesLabel(item: StaffForPaymentItem): string {
    const fromServices = normalizeTextArray(item.services);
    if (fromServices.length > 0) {
      return fromServices.join(', ');
    }

    const fromServiceNames = normalizeTextArray(getNestedValue(item, 'serviceNames'));
    if (fromServiceNames.length > 0) {
      return fromServiceNames.join(', ');
    }

    const serviceName = trimText(getNestedValue(item, 'serviceName'));
    if (serviceName) {
      return serviceName;
    }

    const nestedServiceName = nestedText(getNestedValue(item, 'service'), ['name']);
    if (nestedServiceName) {
      return nestedServiceName;
    }

    return 'No service listed';
  }

  queueLabel(item: StaffForPaymentItem): string {
    return item.queueNumber !== null ? `#${item.queueNumber}` : '-';
  }

  private loadQueue(): void {
    this.isLoading = true;
    this.bookingService.getStaffForPayment(this.currentPage, this.pageSize).subscribe({
      next: (result: PagedResult<StaffForPaymentItem>) => {
        this.items = result.items;
        this.currentPage = result.page;
        this.pageSize = result.pageSize;
        this.totalPages = Math.max(1, Math.ceil(result.totalCount / result.pageSize));
        this.isLoading = false;
      },
      error: async (error) => {
        this.items = [];
        this.totalPages = 1;
        this.isLoading = false;
        await this.presentToast(extractApiErrorMessage(error, 'Failed to load payment queue.'), 'danger');
      }
    });
  }

  private async presentToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2200,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = trimText(value);
    if (text) {
      return text;
    }
  }

  return '';
}

function personLabel(value: unknown): string {
  if (!isRecord(value)) {
    return '';
  }

  const direct = trimText(value['fullName']) || trimText(value['name']);
  if (direct) {
    return direct;
  }

  const firstName = trimText(value['firstName']);
  const middleName = trimText(value['middleName']);
  const lastName = trimText(value['lastName']);
  const parts = [firstName, middleName, lastName].filter((part) => part.length > 0);
  return parts.join(' ').trim();
}

function nestedText(value: unknown, keys: string[]): string {
  if (!isRecord(value)) {
    return '';
  }

  for (const key of keys) {
    const text = trimText(value[key]);
    if (text) {
      return text;
    }
  }

  return '';
}

function normalizeTextArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => trimText(item)).filter((item): item is string => Boolean(item))
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNestedValue(record: unknown, key: string): unknown {
  if (!isRecord(record)) {
    return undefined;
  }

  return record[key];
}

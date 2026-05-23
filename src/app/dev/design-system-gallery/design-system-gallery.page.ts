import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  pulseOutline,
  shieldCheckmarkOutline,
  trendingUpOutline
} from 'ionicons/icons';
import {
  BookingStatus,
  DoctorStatus,
  PaymentStatus
} from '../../core/models';
import { PesoPipe } from '../../shared/pipes/peso.pipe';
import { TimeSlotPipe } from '../../shared/pipes/time-slot.pipe';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { BannerComponent } from '../../shared/components/banner/banner.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  standalone: true,
  selector: 'app-design-system-gallery',
  templateUrl: './design-system-gallery.page.html',
  styleUrl: './design-system-gallery.page.scss',
  imports: [
    NgFor,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonInput,
    PageHeaderComponent,
    SkeletonComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    ConfirmModalComponent,
    AvatarComponent,
    BannerComponent,
    PesoPipe,
    TimeSlotPipe
  ]
})
export class DesignSystemGalleryPage {
  confirmOpen = false;

  readonly colorTokens: string[] = [
    '--ion-color-primary',
    '--ion-color-primary-shade',
    '--ion-color-primary-tint',
    '--color-primary-50',
    '--color-primary-100',
    '--color-primary-200',
    '--color-primary-600',
    '--color-primary-700',
    '--color-primary-900',
    '--ion-color-secondary',
    '--ion-color-secondary-shade',
    '--ion-color-secondary-tint',
    '--color-secondary-50',
    '--color-secondary-100',
    '--ion-color-success',
    '--color-success-50',
    '--color-success-100',
    '--ion-color-warning',
    '--color-warning-50',
    '--color-warning-100',
    '--ion-color-danger',
    '--color-danger-50',
    '--color-danger-100',
    '--ion-color-medium',
    '--ion-color-light',
    '--color-neutral-50',
    '--color-neutral-100',
    '--color-neutral-200',
    '--color-neutral-300',
    '--color-neutral-400',
    '--color-neutral-500',
    '--color-neutral-600',
    '--color-neutral-700',
    '--color-neutral-800',
    '--color-neutral-900',
    '--clinic-bg',
    '--clinic-bg-elevated',
    '--clinic-border',
    '--clinic-border-strong',
    '--clinic-text-primary',
    '--clinic-text-secondary',
    '--clinic-text-muted',
    '--clinic-text-inverse'
  ];

  readonly typographyTokens: string[] = [
    '--text-xs',
    '--text-sm',
    '--text-base',
    '--text-lg',
    '--text-xl',
    '--text-2xl',
    '--text-3xl',
    '--text-4xl',
    '--text-5xl',
    '--text-6xl'
  ];

  readonly bookingStatuses: BookingStatus[] = [
    'Pending',
    'ProofSubmitted',
    'Confirmed',
    'OnHold',
    'Cancelled',
    'Completed',
    'Expired',
    'NoShow',
    'Rescheduled'
  ];

  readonly paymentStatuses: PaymentStatus[] = ['Paid', 'Unpaid', 'Waived', 'Refunded'];

  readonly doctorStatuses: DoctorStatus[] = ['Active', 'Inactive', 'OnLeave'];

  readonly avatarSizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;

  constructor() {
    addIcons({
      pulseOutline,
      barChartOutline,
      trendingUpOutline,
      shieldCheckmarkOutline
    });
  }

  onConfirmDismiss(): void {
    this.confirmOpen = false;
  }
}

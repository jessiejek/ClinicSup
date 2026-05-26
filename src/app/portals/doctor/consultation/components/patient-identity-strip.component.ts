import { DatePipe, NgIf, NgClass, NgStyle } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Allergy, Booking, Patient } from '../../../../core/models';
import { AllergyBadgeComponent, AllergyConfirmationState } from './allergy-badge.component';
import { buildPatientAvatarStyle } from './patient-avatar.util';

@Component({
  selector: 'app-patient-identity-strip',
  standalone: true,
  imports: [DatePipe, NgIf, NgClass, NgStyle, AllergyBadgeComponent],
  template: `
    <section
      class="pis"
      [class.pis--expanded]="expanded"
      role="region"
      aria-label="Patient identity"
      (click)="toggleExpanded()"
      (keydown.enter)="toggleExpanded()"
      (keydown.space)="$event.preventDefault(); toggleExpanded()"
      tabindex="0"
      role="button"
      [attr.aria-expanded]="expanded"
      [attr.title]="mobileHint"
    >
      <div class="pis__avatar" *ngIf="showDetails || isMobileViewport" [ngStyle]="avatarStyle">{{ initials }}</div>

      <div class="pis__main">
        <strong class="pis__name">{{ fullNameUpper }}</strong>
      <div class="pis__badges">
        <app-allergy-badge [allergies]="allergies" [confirmationState]="allergyConfirmationState"></app-allergy-badge>
        <button
          *ngIf="showDetails"
          type="button"
          class="pis__history"
          (click)="emitHistoryClick($event)"
        >
          <i class="ti ti-history"></i>
          <span>History</span>
        </button>
        <span
          *ngIf="showDetails"
          class="pis__payment"
            [class.pis__payment--paid]="isPaid"
            [class.pis__payment--unpaid]="!isPaid"
          >
            {{ paymentLabel }}
          </span>
        </div>
      </div>

      <div class="pis__details" *ngIf="showDetails">
        <span>{{ ageSexLabel }}</span>
        <span>DOB: {{ patient.dateOfBirth | date : 'MM/dd/yyyy' }}</span>
        <span>MRN: {{ mrnLabel }}</span>
        <span class="pis__duration" [ngClass]="durationToneClass">
          <i class="ti ti-clock"></i>
          Duration: {{ elapsedDuration }}
        </span>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        position: sticky;
        top: 0;
        z-index: 30;
      }

      .pis {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 16px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
        border: 1px solid #dbe3ee;
        border-radius: 18px;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
      }

      .pis__avatar {
        width: 52px;
        height: 52px;
        min-width: 52px;
        min-height: 52px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #dbeafe, #e0f2fe);
        color: #0f172a;
        font-weight: 800;
        font-size: 18px;
        letter-spacing: 0.04em;
        box-shadow: 0 10px 20px rgba(91, 33, 182, 0.2);
      }

      .pis__main {
        display: grid;
        gap: 4px;
        min-width: 0;
        flex: 1 1 auto;
      }

      .pis__name {
        font-size: 1rem;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.2;
        letter-spacing: 0.02em;
      }

      .pis__badges {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }

      .pis__history {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #334155;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
      }

      .pis__history i {
        font-size: 14px;
      }

      .pis__details {
        display: flex;
        flex-wrap: wrap;
        gap: 10px 14px;
        color: #475569;
        font-size: 0.78rem;
        font-weight: 600;
      }

      .pis__duration {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .pis__duration i {
        font-size: 14px;
      }

      .pis__duration--green {
        color: #166534;
      }

      .pis__duration--amber {
        color: #b45309;
      }

      .pis__duration--red {
        color: #dc2626;
      }

      .pis__payment {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 800;
        white-space: nowrap;
      }

      .pis__payment--paid {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #86efac;
      }

      .pis__payment--unpaid {
        background: #fee2e2;
        color: #b91c1c;
        border: 1px solid #fca5a5;
      }

      @media (max-width: 767px) {
        .pis {
          cursor: pointer;
          min-height: 48px;
          padding: 8px 12px;
          gap: 10px;
        }

        .pis__avatar {
          width: 36px;
          height: 36px;
          min-width: 36px;
          min-height: 36px;
          font-size: 16px;
        }

        .pis__details {
          display: none;
        }

        .pis--expanded .pis__details {
          display: flex;
        }

        .pis--expanded .pis__details {
          width: 100%;
          margin-top: 4px;
        }

        .pis--expanded {
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .pis__main {
          min-width: 0;
        }

        .pis__name {
          display: block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pis__badges {
          flex-wrap: nowrap;
          overflow: hidden;
        }

        .pis__history {
          min-height: 24px;
          padding: 0 8px;
        }
      }
    `
  ]
})
export class PatientIdentityStripComponent implements OnInit, OnDestroy {
  @Input({ required: true }) patient!: Patient;
  @Input({ required: true }) booking!: Booking;
  @Input() allergies: Allergy[] = [];
  @Input() allergyConfirmationState: AllergyConfirmationState = null;
  @Input() expanded = false;
  @Output() historyClick = new EventEmitter<void>();

  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private now = Date.now();

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.timerHandle = window.setInterval(() => {
      this.now = Date.now();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  get initials(): string {
    const first = this.patient.firstName?.trim().charAt(0) ?? '';
    const last = this.patient.lastName?.trim().charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || '??';
  }

  get fullNameUpper(): string {
    return [this.patient.firstName, this.patient.middleName, this.patient.lastName]
      .filter((part) => !!part && part.trim().length > 0)
      .join(' ')
      .toUpperCase() || 'PATIENT';
  }

  get ageSexLabel(): string {
    const sex = this.patient.sex?.trim() ? this.patient.sex.trim() : '--';
    const age = this.patient.dateOfBirth ? `${this.calculateAge(this.patient.dateOfBirth)}y` : '--';
    return `${this.capitalize(sex)}, ${age}`;
  }

  get mrnLabel(): string {
    return this.patient.patientCode || this.patient.id || 'Patient ID unavailable';
  }

  get paymentLabel(): string {
    return (this.booking.paymentStatus || 'Unpaid').toUpperCase();
  }

  get isPaid(): boolean {
    return String(this.booking.paymentStatus || '').toLowerCase() === 'paid';
  }

  get showDetails(): boolean {
    return this.isDesktopViewport() || this.expanded;
  }

  get isMobileViewport(): boolean {
    return !this.isDesktopViewport();
  }

  get avatarStyle(): Record<string, string> {
    const name = this.fullNameUpper || 'Patient';
    const avatarStyle = buildPatientAvatarStyle(name);
    return {
      background: avatarStyle['background'],
      color: avatarStyle['color']
    };
  }

  get elapsedDuration(): string {
    const start = new Date(this.booking.checkedInAt || this.booking.createdAt || Date.now()).getTime();
    const diff = Math.max(0, this.now - start);
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  }

  get durationToneClass(): string {
    const minutesElapsed = Math.floor((this.now - new Date(this.booking.checkedInAt || this.booking.createdAt || Date.now()).getTime()) / 60000);
    if (minutesElapsed >= 30) {
      return 'pis__duration--red';
    }
    if (minutesElapsed >= 15) {
      return 'pis__duration--amber';
    }
    return 'pis__duration--green';
  }

  get mobileHint(): string {
    return this.isDesktopViewport() ? '' : 'Tap to expand patient details';
  }

  toggleExpanded(): void {
    if (!this.isDesktopViewport()) {
      this.expanded = !this.expanded;
    }
  }

  emitHistoryClick(event: Event): void {
    event.stopPropagation();
    this.historyClick.emit();
  }

  private isDesktopViewport(): boolean {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  }

  private calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(age, 0);
  }

  private capitalize(value: string): string {
    if (!value || value === '--') {
      return value || '--';
    }

    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
}

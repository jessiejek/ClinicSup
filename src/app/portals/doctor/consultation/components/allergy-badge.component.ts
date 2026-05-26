import { NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Allergy } from '../../../../core/models';

export type AllergyBadgeState = 'NKDA' | 'ALLERGY' | 'UNCONFIRMED';
export type AllergyConfirmationState = 'confirmed-empty' | 'unconfirmed' | null | undefined;

@Component({
  selector: 'app-allergy-badge',
  standalone: true,
  imports: [NgIf, NgFor],
  template: `
    <span
      class="ab"
      [class.ab--nkda]="state === 'NKDA'"
      [class.ab--allergy]="state === 'ALLERGY'"
      [class.ab--unconfirmed]="state === 'UNCONFIRMED'"
      [attr.title]="tooltip"
    >
      {{ label }}
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .ab {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 800;
        line-height: 1;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }

      .ab--nkda {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #86efac;
      }

      .ab--allergy {
        background: #fee2e2;
        color: #b91c1c;
        border: 1px solid #fca5a5;
      }

      .ab--unconfirmed {
        background: #fef3c7;
        color: #b45309;
        border: 1px solid #fcd34d;
      }
    `
  ]
})
export class AllergyBadgeComponent {
  @Input() allergies: Allergy[] = [];
  @Input() confirmationState: AllergyConfirmationState = null;

  get state(): AllergyBadgeState {
    if (this.allergies.length > 0) {
      return 'ALLERGY';
    }

    if (this.confirmationState === 'confirmed-empty') {
      return 'NKDA';
    }

    return 'UNCONFIRMED';
  }

  get label(): string {
    switch (this.state) {
      case 'NKDA':
        return 'NKDA';
      case 'ALLERGY':
        return '⚠ ALLERGIES';
      default:
        return 'Allergies unconfirmed';
    }
  }

  get tooltip(): string {
    switch (this.state) {
      case 'NKDA':
        return 'No Known Drug Allergies — confirmed';
      case 'ALLERGY':
        return this.allergies
          .map((allergy) => {
            const reaction = allergy.reaction?.trim();
            const severity = allergy.severity?.trim();
            const details = [reaction, severity].filter(Boolean).join(' • ');
            return details ? `${allergy.allergen} (${details})` : allergy.allergen;
          })
          .join('\n');
      default:
        return 'Click to confirm allergy status before prescribing';
    }
  }
}

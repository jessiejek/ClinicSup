import { NgIf } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Allergy, PrescriptionItem } from '../../../../core/models';
import { BannerComponent } from '../../../../shared/components/banner/banner.component';

@Component({
  selector: 'app-allergy-warning-banner',
  standalone: true,
  imports: [NgIf, BannerComponent],
  template: `
    <app-banner
      *ngIf="visible && warningMessage"
      variant="warning"
      [message]="warningMessage"
      [dismissible]="true"
      (dismissed)="dismiss()"
    ></app-banner>
  `,
  styleUrl: './allergy-warning-banner.component.scss'
})
export class AllergyWarningBannerComponent implements OnChanges {
  @Input() allergies: Allergy[] = [];
  @Input() prescriptionItems: PrescriptionItem[] = [];

  visible = true;
  warningMessage = '';
  private warningSignature = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allergies'] || changes['prescriptionItems']) {
      const { message, signature } = this.buildWarning();
      if (signature !== this.warningSignature) {
        this.visible = true;
        this.warningSignature = signature;
      }
      this.warningMessage = message;
    }
  }

  dismiss(): void {
    this.visible = false;
  }

  private buildWarning(): { message: string; signature: string } {
    const matches: string[] = [];
    this.allergies.forEach((allergy) => {
      const allergen = [allergy.allergen, allergy.allergenName ?? ''].join(' ').trim().toLowerCase();
      if (!allergen) {
        return;
      }
      this.prescriptionItems.forEach((item) => {
        const haystack = [item.medicineName, item.genericName ?? ''].join(' ').toLowerCase();
        if (haystack.includes(allergen)) {
          matches.push(`${allergy.allergenName ?? allergy.allergen}:${item.medicineName}`);
        }
      });
    });

    const uniqueMatches = [...new Set(matches)];
    if (uniqueMatches.length === 0) {
      return { message: '', signature: '' };
    }
    const signature = uniqueMatches.join('|');
    const allergensOnly = [...new Set(uniqueMatches.map((match) => match.split(':')[0]))];
    if (allergensOnly.length === 1) {
      return {
        message: `Allergy warning: Patient is allergic to ${allergensOnly[0]}. Please review before prescribing.`,
        signature
      };
    }
    return {
      message: `Allergy warning: Patient is allergic to ${allergensOnly.join(', ')}. Please review before prescribing.`,
      signature
    };
  }
}

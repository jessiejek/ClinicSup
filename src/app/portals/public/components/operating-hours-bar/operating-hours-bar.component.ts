import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ClinicSettings } from '../../../../core/models';
import { formatClinicOperatingLines } from '../../utils/time-format';

@Component({
  selector: 'app-operating-hours-bar',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="hours-bar" *ngIf="settings">
      <div class="hours-item">
        <span>{{ lines[0] }}</span>
      </div>
      <span class="hours-divider">|</span>
      <div class="hours-item">
        <span>{{ lines[1] }}</span>
      </div>
      <span class="hours-divider">|</span>
      <div class="hours-item">
        <span>{{ lines[2] }}</span>
      </div>
    </div>
  `,
  styleUrl: './operating-hours-bar.component.scss'
})
export class OperatingHoursBarComponent {
  @Input() settings?: ClinicSettings;

  get lines(): [string, string, string] {
    if (!this.settings) {
      return ['', '', ''];
    }
    return formatClinicOperatingLines(this.settings);
  }
}

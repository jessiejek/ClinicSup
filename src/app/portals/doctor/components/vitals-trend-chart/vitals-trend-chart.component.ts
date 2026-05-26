import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Consultation } from '../../../../core/models';

interface TrendPoint {
  date: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  weightKg?: number;
  oxygenSaturation?: number;
}

interface TrendMetric {
  key: keyof Omit<TrendPoint, 'date'>;
  label: string;
  unit: string;
  color: string;
}

@Component({
  selector: 'app-vitals-trend-chart',
  standalone: true,
  imports: [DatePipe, NgFor, NgIf],
  template: `
    <section class="clinic-card section-card" [class.is-collapsed-mobile]="!expanded">
      <button type="button" class="section-card__head section-card__head--toggle" (click)="expanded = !expanded">
        <div>
          <h3>Vitals Trend</h3>
          <p>Last 5 consultations with recorded vitals.</p>
        </div>
        <span class="section-card__chevron">{{ expanded ? '▴' : '▾' }}</span>
      </button>

      <ng-container *ngIf="expanded || !isMobileViewport(); else collapsedMobileTpl">
        <ng-container *ngIf="points.length >= 2; else emptyTpl">
        <div class="vitals-grid">
          <article class="metric-card" *ngFor="let metric of metrics">
            <div class="metric-card__head">
              <div>
                <h4>{{ metric.label }}</h4>
                <p>{{ metric.unit }}</p>
              </div>
              <strong class="metric-card__value">{{ latestValue(metric.key) }}</strong>
            </div>

            <svg class="sparkline" viewBox="0 0 320 120" role="img" [attr.aria-label]="metric.label + ' trend'">
              <defs>
                <linearGradient [attr.id]="metric.key + '-fill'" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" [attr.stop-color]="metric.color" stop-opacity="0.24"></stop>
                  <stop offset="100%" [attr.stop-color]="metric.color" stop-opacity="0.02"></stop>
                </linearGradient>
              </defs>
              <path [attr.d]="areaPath(metric.key)" [attr.fill]="'url(#' + metric.key + '-fill)'" stroke="none"></path>
              <path [attr.d]="linePath(metric.key)" [attr.stroke]="metric.color" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
              <circle
                *ngFor="let point of linePoints(metric.key); let i = index"
                [attr.cx]="point.x"
                [attr.cy]="point.y"
                r="4"
                [attr.fill]="metric.color"
              ></circle>
            </svg>
          </article>
        </div>

        <div class="date-axis">
          <span *ngFor="let point of points">{{ point.date | date : 'MMM d' }}</span>
        </div>
      </ng-container>
      </ng-container>

      <ng-template #emptyTpl>
        <div class="empty-state">
          <svg class="empty-state__chart" viewBox="0 0 320 160" aria-hidden="true" focusable="false">
            <defs>
              <pattern id="vitals-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3 6"></path>
              </pattern>
            </defs>
            <rect x="12" y="12" width="296" height="116" rx="16" fill="url(#vitals-grid)"></rect>
            <g stroke="#e2e8f0" stroke-width="1">
              <line x1="28" y1="36" x2="292" y2="36"></line>
              <line x1="28" y1="60" x2="292" y2="60"></line>
              <line x1="28" y1="84" x2="292" y2="84"></line>
              <line x1="28" y1="108" x2="292" y2="108"></line>
            </g>
            <path d="M 32 96 C 64 88, 88 72, 120 74 S 180 86, 208 66 S 252 48, 288 56" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-dasharray="6 6" stroke-linecap="round"></path>
            <circle cx="120" cy="74" r="4" fill="#cbd5e1"></circle>
            <circle cx="208" cy="66" r="4" fill="#cbd5e1"></circle>
            <circle cx="288" cy="56" r="4" fill="#cbd5e1"></circle>
          </svg>
          <h4>No trend data yet</h4>
          <p>Vitals trend appears after 3 consultations with recorded vitals.</p>
        </div>
      </ng-template>

      <ng-template #collapsedMobileTpl>
        <div class="collapsed-mobile-state">
          <div class="collapsed-mobile-state__chart" aria-hidden="true"></div>
          <div>
            <h4>No trend data yet</h4>
            <p>Vitals trend appears after 3 consultations with recorded vitals.</p>
          </div>
        </div>
      </ng-template>
    </section>
  `,
  styleUrl: './vitals-trend-chart.component.scss'
})
export class VitalsTrendChartComponent implements OnChanges {
  @Input() consultations: Consultation[] = [];
  expanded = false;

  readonly metrics: TrendMetric[] = [
    { key: 'systolic', label: 'Blood Pressure Systolic', unit: 'mmHg', color: '#2563EB' },
    { key: 'diastolic', label: 'Blood Pressure Diastolic', unit: 'mmHg', color: '#7C3AED' },
    { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', color: '#DC2626' },
    { key: 'weightKg', label: 'Weight', unit: 'kg', color: '#059669' },
    { key: 'oxygenSaturation', label: 'Oxygen Saturation', unit: '%', color: '#D97706' }
  ];

  points: TrendPoint[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['consultations']) {
      this.points = this.buildPoints();
    }
  }

  isMobileViewport(): boolean {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  }

  latestValue(key: TrendMetric['key']): string {
    const values = this.points.map((point) => point[key]).filter((value): value is number => typeof value === 'number');
    const value = values[values.length - 1];
    return value === undefined ? '-' : this.formatValue(value, key);
  }

  linePoints(key: TrendMetric['key']): Array<{ x: number; y: number }> {
    const values = this.points.map((point) => point[key]).filter((value): value is number => typeof value === 'number');
    if (values.length < 2) {
      return [];
    }

    const range = this.getRange(values);
    const width = 288;
    const height = 88;
    const startX = 16;
    const startY = 16;
    const xStep = width / Math.max(this.points.length - 1, 1);

    return this.points.flatMap((point, index) => {
      const value = point[key];
      if (typeof value !== 'number') {
        return [];
      }
      return [
        {
          x: startX + xStep * index,
          y: startY + this.normalize(value, range.min, range.max, height)
        }
      ];
    });
  }

  linePath(key: TrendMetric['key']): string {
    const points = this.linePoints(key);
    if (points.length < 2) {
      return '';
    }
    return points.reduce((path, point, index) => `${path}${index === 0 ? 'M' : 'L'} ${point.x} ${point.y} `, '').trim();
  }

  areaPath(key: TrendMetric['key']): string {
    const points = this.linePoints(key);
    if (points.length < 2) {
      return '';
    }
    const first = points[0];
    const last = points[points.length - 1];
    return `${this.linePath(key)} L ${last.x} 104 L ${first.x} 104 Z`;
  }

  private buildPoints(): TrendPoint[] {
    return [...this.consultations]
      .filter((consultation) => Boolean(consultation.vitalSigns))
      .sort((a, b) => new Date(a.consultationDate).getTime() - new Date(b.consultationDate).getTime())
      .slice(-5)
      .map((consultation) => ({
        date: consultation.consultationDate,
        systolic: consultation.vitalSigns?.bloodPressureSystolic,
        diastolic: consultation.vitalSigns?.bloodPressureDiastolic,
        heartRate: consultation.vitalSigns?.heartRate,
        weightKg: consultation.vitalSigns?.weightKg,
        oxygenSaturation: consultation.vitalSigns?.oxygenSaturation
      }));
  }

  private getRange(values: number[]): { min: number; max: number } {
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      return { min: min - 1, max: max + 1 };
    }
    return { min, max };
  }

  private normalize(value: number, min: number, max: number, height: number): number {
    const ratio = (value - min) / (max - min);
    return height - ratio * height;
  }

  private formatValue(value: number, key: TrendMetric['key']): string {
    if (key === 'oxygenSaturation' || key === 'heartRate' || key === 'systolic' || key === 'diastolic') {
      return `${Math.round(value)}`;
    }
    return value.toFixed(1);
  }
}

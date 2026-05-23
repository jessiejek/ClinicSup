import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditLog } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AuditLogService } from '../services/audit-log.service';

type EntityFilter = 'All' | AuditLog['entityType'];

@Component({
  selector: 'app-admin-audit-logs-page',
  standalone: true,
  imports: [DatePipe, FormsModule, NgClass, NgFor, NgIf, EmptyStateComponent, SkeletonComponent],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Audit Logs</h2>
          <p class="page-subtitle">Track critical actions for bookings, payments, settings, and records.</p>
        </div>
      </div>

      <div class="clinic-card filters-card">
        <label class="field">
          <span>Entity Type</span>
          <select class="filter-input" [(ngModel)]="entityFilter" (ngModelChange)="applyFilters()">
            <option value="All">All</option>
            <option *ngFor="let option of entityOptions" [value]="option">{{ option }}</option>
          </select>
        </label>
        <label class="field">
          <span>Search</span>
          <input
            class="filter-input"
            [(ngModel)]="searchTerm"
            (ngModelChange)="applyFilters()"
            placeholder="Search action, user, or entity ID"
          />
        </label>
        <label class="field">
          <span>Date From</span>
          <input type="date" class="filter-input" [(ngModel)]="dateFrom" (ngModelChange)="applyFilters()" />
        </label>
        <label class="field">
          <span>Date To</span>
          <input type="date" class="filter-input" [(ngModel)]="dateTo" (ngModelChange)="applyFilters()" />
        </label>
      </div>

      <app-skeleton *ngIf="isLoading" variant="row" [count]="6"></app-skeleton>

      <div class="clinic-card" *ngIf="!isLoading">
        <table class="clinic-table" *ngIf="filteredLogs.length > 0; else emptyTpl">
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th>Action</th>
              <th>Performed By</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of filteredLogs">
              <td class="data-mono">{{ log.performedAt | date : 'MMM d, y h:mm a' }}</td>
              <td>
                <span class="entity-badge" [ngClass]="'entity-badge--' + log.entityType.toLowerCase()">
                  {{ log.entityType }}
                </span>
              </td>
              <td class="data-mono">{{ log.entityId }}</td>
              <td>{{ log.action }}</td>
              <td>{{ log.performedBy }}</td>
              <td>{{ log.details || '—' }}</td>
            </tr>
          </tbody>
        </table>

        <ng-template #emptyTpl>
          <app-empty-state
            icon="shield-checkmark-outline"
            title="No audit logs found"
            description="Try a broader filter or date range."
          ></app-empty-state>
        </ng-template>
      </div>
    </section>
  `,
  styleUrl: './audit-logs.page.scss'
})
export class AuditLogsPage implements OnInit {
  private readonly auditLogService = inject(AuditLogService);

  isLoading = true;
  logs: AuditLog[] = [];
  filteredLogs: AuditLog[] = [];
  entityOptions: AuditLog['entityType'][] = ['Booking', 'Patient', 'Doctor', 'Payment', 'Settings', 'Consultation'];
  entityFilter: EntityFilter = 'All';
  searchTerm = '';
  dateFrom = this.daysAgoIso(30);
  dateTo = this.todayIso();

  ngOnInit(): void {
    this.auditLogService.getAuditLogs().subscribe((logs) => {
      this.logs = logs;
      this.applyFilters();
      this.isLoading = false;
    });
  }

  applyFilters(): void {
    const query = this.searchTerm.trim().toLowerCase();
    this.filteredLogs = this.logs.filter((log) => {
      const matchesEntity = this.entityFilter === 'All' || log.entityType === this.entityFilter;
      const matchesQuery =
        !query ||
        [log.action, log.performedBy, log.entityId, log.details ?? ''].join(' ').toLowerCase().includes(query);
      const matchesDate = (!this.dateFrom || log.performedAt.slice(0, 10) >= this.dateFrom) && (!this.dateTo || log.performedAt.slice(0, 10) <= this.dateTo);
      return matchesEntity && matchesQuery && matchesDate;
    });
  }

  private todayIso(): string {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - offset).toISOString().slice(0, 10);
  }

  private daysAgoIso(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }
}

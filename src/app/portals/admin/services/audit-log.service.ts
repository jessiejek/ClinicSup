import { Injectable, inject } from '@angular/core';
import { Observable, map, timer } from 'rxjs';
import { AuditLog } from '../../../core/models';
import { MockDataService } from '../../../core/services/mock-data.service';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly mockData = inject(MockDataService);

  getAuditLogs(): Observable<AuditLog[]> {
    return timer(400).pipe(map(() => this.mockData.getAuditLogs()));
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { AuditLog } from '../../../core/models';
import { SupabaseService } from '../../../core/services/supabase.service';

interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  details?: string | null;
}

function rowToAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    entityType: row.entity_type as AuditLog['entityType'],
    entityId: row.entity_id,
    action: row.action,
    performedBy: row.performed_by,
    performedAt: row.performed_at,
    details: row.details ?? undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly supabase = inject(SupabaseService);

  getAuditLogs(): Observable<AuditLog[]> {
    return from(
      this.supabase.client
        .from('audit_logs')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(500)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('[AuditLogService] Failed to fetch audit logs:', error.message);
          return [];
        }
        return (data ?? []).map(rowToAuditLog);
      })
    );
  }
}

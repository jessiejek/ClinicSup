import { Injectable, inject } from '@angular/core';
import { Observable, map, timer } from 'rxjs';
import { ClinicSettings } from '../../../core/models';
import { MockDataService } from '../../../core/services/mock-data.service';

@Injectable({ providedIn: 'root' })
export class AdminSettingsService {
  private readonly mockData = inject(MockDataService);

  getSettings(): Observable<ClinicSettings> {
    return timer(400).pipe(map(() => this.mockData.getClinicSettings()));
  }

  updateSettings(settings: ClinicSettings): Observable<ClinicSettings> {
    return timer(400).pipe(map(() => this.mockData.updateClinicSettings(settings)));
  }

  bumpConsentVersion(): Observable<ClinicSettings> {
    return timer(400).pipe(map(() => this.mockData.bumpConsentVersion()));
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { IonApp, IonRouterOutlet, LoadingController } from '@ionic/angular/standalone';
import { filter } from 'rxjs';
import { ClinicSettingsService } from './core/services/clinic-settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly clinicSettingsService = inject(ClinicSettingsService);
  private readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);
  private loading: HTMLIonLoadingElement | null = null;
  private loadingTimer: any = null;

  ngOnInit(): void {
    void this.clinicSettingsService.getSettings().subscribe({ error: () => undefined });

    this.router.events.pipe(
      filter((e) => e instanceof NavigationStart || e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError)
    ).subscribe((e) => {
      if (e instanceof NavigationStart) {
        if (this.loadingTimer) clearTimeout(this.loadingTimer);
        this.loadingTimer = setTimeout(() => this.showLoading(), 400);
      } else {
        if (this.loadingTimer) clearTimeout(this.loadingTimer);
        this.dismissLoading();
      }
    });
  }

  private async showLoading(): Promise<void> {
    if (!this.loading) {
      this.loading = await this.loadingCtrl.create({ message: 'Loading...', spinner: 'crescent', duration: 10000 });
      await this.loading.present();
    }
  }

  private async dismissLoading(): Promise<void> {
    this.loadingTimer = null;
    if (this.loading) {
      await this.loading.dismiss();
      this.loading = null;
    }
  }
}

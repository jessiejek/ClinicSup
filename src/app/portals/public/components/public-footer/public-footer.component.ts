import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoFacebook, logoInstagram } from 'ionicons/icons';
import { ClinicSettingsService } from '../../../../core/services/clinic-settings.service';
import { PublicService } from '../../services/public.service';
import { formatClinicOperatingLines } from '../../utils/time-format';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, IonIcon, AsyncPipe],
  template: `
    <footer class="public-footer">
      <div class="content-container">
        <div class="footer-grid">
          <div>
            <div class="footer-brand">
              <img *ngIf="settings.logoUrl" [src]="settings.logoUrl" alt="" class="footer-logo" />
              <div>
                <div class="footer-brand-name">{{ settings.clinicName }}</div>
                <p class="footer-tagline">Compassionate care for your whole family.</p>
                <div class="footer-social">
                  <a
                    *ngIf="settings.facebookUrl"
                    [href]="settings.facebookUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                  >
                    <ion-icon name="logo-facebook"></ion-icon>
                  </a>
                  <a
                    *ngIf="settings.instagramUrl"
                    [href]="settings.instagramUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <ion-icon name="logo-instagram"></ion-icon>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="footer-heading">Quick Links</div>
            <a routerLink="/public" class="footer-link">Home</a>
            <a routerLink="/public/doctors" class="footer-link">Doctors</a>
            <a routerLink="/public/services" class="footer-link">Services</a>
            <a routerLink="/public/announcements" class="footer-link">Announcements</a>
          </div>

          <div>
            <div class="footer-heading">Our Doctors</div>
            <ng-container *ngIf="doctors$ | async as doctors">
              <a
                *ngFor="let doc of doctors.slice(0, 3)"
                [routerLink]="['/public/doctors', doc.id]"
                class="footer-link"
              >
                {{ doc.fullName }}
              </a>
            </ng-container>
          </div>

          <div>
            <div class="footer-heading">Contact</div>
            <p class="footer-contact" *ngIf="settings.address">{{ settings.address }}</p>
            <p class="footer-contact" *ngIf="settings.phone">{{ settings.phone }}</p>
            <p class="footer-contact" *ngIf="settings.email">{{ settings.email }}</p>
            <p class="footer-hours">{{ hoursSummary }}</p>
          </div>
        </div>

        <div class="footer-bottom">
          <span>© 2026 Dr. Grace E. Gavino Medical Clinic. All rights reserved.</span>
          <span class="footer-powered">Powered by ClinicSystem</span>
        </div>
      </div>
    </footer>
  `,
  styleUrl: './public-footer.component.scss'
})
export class PublicFooterComponent {
  private readonly clinicSettings = inject(ClinicSettingsService);
  private readonly publicService = inject(PublicService);

  readonly settings = this.clinicSettings.load();
  doctors$ = this.publicService.getDoctors();

  readonly hoursSummary: string;

  constructor() {
    const [mf, sat] = formatClinicOperatingLines(this.settings);
    this.hoursSummary = `${mf} · ${sat}`;
    addIcons({ logoFacebook, logoInstagram });
  }
}

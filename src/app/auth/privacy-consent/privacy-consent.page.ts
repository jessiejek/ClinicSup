import { NgFor } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthLayoutComponent } from '../components/auth-layout/auth-layout.component';
import { AuthUser } from '../../core/models';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ClinicSettingsService } from '../../core/services/clinic-settings.service';

@Component({
  standalone: true,
  selector: 'app-privacy-consent-page',
  imports: [NgFor, AuthLayoutComponent],
  templateUrl: './privacy-consent.page.html',
  styleUrl: './privacy-consent.page.scss'
})
export class PrivacyConsentPage implements AfterViewInit {
  @ViewChild('policyScroll') policyScroll?: ElementRef<HTMLDivElement>;

  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly clinicSettings = inject(ClinicSettingsService);
  private readonly currentUser = this.authState.currentUser;

  private readonly settings = this.clinicSettings.load();

  readonly consentVersion = this.settings.consentVersion;
  readonly policyParagraphs: string[] = this.splitPolicy(this.settings.privacyPolicyText);

  acceptEnabled = false;

  ngAfterViewInit(): void {
    setTimeout(() => this.updateScrollState(), 0);
  }

  onScroll(): void {
    this.updateScrollState();
  }

  private updateScrollState(): void {
    const el = this.policyScroll?.nativeElement;
    if (!el) {
      return;
    }
    const shortContent = el.scrollHeight <= el.clientHeight + 8;
    const scrolledFar =
      el.scrollTop + el.clientHeight >= el.scrollHeight * 0.9;
    this.acceptEnabled = shortContent || scrolledFar;
  }

  onAccept(): void {
    if (!this.acceptEnabled) {
      return;
    }
    const user = this.currentUser();
    if (!user) {
      void this.router.navigate(['/auth/login']);
      return;
    }
    const targetVersion = this.settings.consentVersion;
    const updated = {
      ...user,
      consentVersion: targetVersion
    } as AuthUser;
    this.authState.setUser(updated);
    void this.router.navigate(['/patient']);
  }

  private splitPolicy(text: string | undefined): string[] {
    if (!text?.trim()) {
      return ['No policy text configured.'];
    }
    return text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
}

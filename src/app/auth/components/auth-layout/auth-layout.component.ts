import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth-wrapper">
      <aside class="auth-left" aria-hidden="false">
        <div class="auth-left__logo">G</div>
        <h1 class="auth-left__title">Dr. Grace E. Gavino</h1>
        <p class="auth-left__tagline">Modern Healthcare. Simplified.</p>
        <div class="auth-badges">
          <span class="trust-pill">🏥 Licensed Clinic</span>
          <span class="trust-pill">🔒 HIPAA Compliant</span>
          <span class="trust-pill">⭐ 4.8 Patient Rating</span>
        </div>
      </aside>
      <div class="auth-right">
        <div class="auth-mobile-brand">Dr. Grace E. Gavino Medical Clinic</div>
        <div class="auth-form-container">
          <a routerLink="/public" class="auth-back-link">← Back</a>
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styleUrl: './auth-layout.component.scss'
})
export class AuthLayoutComponent {}

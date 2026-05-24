import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';
import { AuthCallbackPage } from './callback/auth-callback.page';
import { ForgotPasswordPage } from './forgot-password/forgot-password.page';
import { LoginPage } from './login/login.page';
import { PrivacyConsentPage } from './privacy-consent/privacy-consent.page';
import { RegisterPage } from './register/register.page';
import { ResetPasswordPage } from './reset-password/reset-password.page';
import { SetPasswordPage } from './set-password/set-password.page';

export const AUTH_ROUTES: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'callback', component: AuthCallbackPage },
  { path: 'forgot-password', component: ForgotPasswordPage },
  { path: 'reset-password', component: ResetPasswordPage },
  { path: 'set-password', component: SetPasswordPage, canActivate: [authGuard] },
  {
    path: 'privacy-consent',
    component: PrivacyConsentPage,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Patient'] }
  }
];

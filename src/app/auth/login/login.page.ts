import { AsyncPipe, NgIf } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  ViewChild,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline, closeOutline, eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { APP_VERSION } from '../../core/version';
import { environment } from '../../../environments/environment';
import { AuthLayoutComponent } from '../components/auth-layout/auth-layout.component';
import { BannerComponent } from '../../shared/components/banner/banner.component';
import { AuthStateService } from '../../core/services/auth-state.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    ReactiveFormsModule,
    RouterLink,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonSpinner,
    AuthLayoutComponent,
    BannerComponent
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  readonly appVersion = APP_VERSION;

  private readonly fb = inject(FormBuilder);
  private readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly toastController = inject(ToastController);

  readonly isProduction = environment.production;
  readonly isLoading$ = this.authState.isLoading$;
  readonly error$ = this.authState.error$;

  showPassword = false;
  devExpanded = false;

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  constructor() {
    addIcons({ alertCircleOutline, closeOutline, eyeOutline, eyeOffOutline });
  }

  fillCreds(email: string, password: string): void {
    this.loginForm.patchValue({ email, password });
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    const { email, password } = this.loginForm.getRawValue();
    this.authState.clearError();
    this.authState.login(email, password).subscribe({ error: () => undefined });
  }

  onGoogleLogin(): void {
    this.authState.clearError();
    // Supabase OAuth will redirect the page to Google, then back to the app.
    // The OAuth session is automatically handled by Supabase client (detectSessionInUrl: true).
    this.authService.loginWithGoogle().subscribe({
      error: () => { /* Redirect is happening */ }
    });
  }

  onFacebookLogin(): void {
    this.authState.clearError();
    this.presentFacebookRedirectToast();
    this.authService.loginWithFacebook().subscribe({
      error: () => { /* Redirect is happening */ }
    });
  }

  private async presentFacebookRedirectToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Redirecting to Facebook...',
      duration: 0, // stays until page navigates away
      position: 'top',
      cssClass: 'facebook-redirect-toast',
      buttons: [
        {
          icon: closeOutline,
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

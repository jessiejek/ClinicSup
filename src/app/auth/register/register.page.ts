import { AbstractControl, ValidationErrors } from '@angular/forms';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonCheckbox,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner
} from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { AuthLayoutComponent } from '../components/auth-layout/auth-layout.component';
import { BannerComponent } from '../../shared/components/banner/banner.component';
import { getPasswordStrength, passwordStrengthValidator } from '../../shared/validators/password-strength.validator';
import { AuthStateService } from '../../core/services/auth-state.service';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw === cpw ? null : { passwordMismatch: true };
}

@Component({
  standalone: true,
  selector: 'app-register-page',
  imports: [
    NgIf, NgFor, AsyncPipe, ReactiveFormsModule, RouterLink,
    AuthLayoutComponent, BannerComponent,
    IonItem, IonLabel, IonInput, IonNote, IonCheckbox, IonSpinner
  ],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss'
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly authState = inject(AuthStateService);


  readonly isProduction = environment.production;
  readonly isLoading$ = this.authState.isLoading$;
  readonly error$ = this.authState.error$;

  readonly strengthIndexes = [0, 1, 2, 3];
  passwordStrength: 0 | 1 | 2 | 3 | 4 = 0;

  registerForm = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      middleName: ['', [Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword: ['', Validators.required],
      consentAccepted: [false, Validators.requiredTrue]
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit(): void {
    this.registerForm.get('password')?.valueChanges.subscribe((v) => {
      this.passwordStrength = getPasswordStrength(String(v ?? ''));
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    const { firstName, middleName, lastName, email, password } = this.registerForm.getRawValue();
    this.authState.clearError();
    this.authState.register(firstName, middleName || undefined, lastName, email, password)
      .subscribe({ error: () => undefined });
  }

  onGoogleLogin(): void {
    this.authState.clearError();
    this.authState.loginWithGoogle().subscribe({ error: () => undefined });
  }

  onFacebookLogin(): void {
    this.authState.clearError();
    // Show a Facebook-blue toast while the redirect is in progress
    this.authState.loginWithFacebook().subscribe({ error: () => undefined });
  }

  get strengthLabel(): string {
    switch (this.passwordStrength) {
      case 0: return '';
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      default: return '';
    }
  }
}

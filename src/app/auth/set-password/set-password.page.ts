import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { IonInput, IonItem, IonLabel, ToastController } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ClinicSettingsService } from '../../core/services/clinic-settings.service';
import { passwordStrengthValidator } from '../../shared/validators/password-strength.validator';
import { AuthLayoutComponent } from '../components/auth-layout/auth-layout.component';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw === cpw ? null : { passwordMismatch: true };
}

@Component({
  standalone: true,
  selector: 'app-set-password-page',
  imports: [NgIf, ReactiveFormsModule, AuthLayoutComponent, IonItem, IonLabel, IonInput],
  templateUrl: './set-password.page.html',
  styleUrl: './set-password.page.scss'
})
export class SetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly clinicSettings = inject(ClinicSettingsService);
  private readonly toast = inject(ToastController);
  private readonly currentUser = this.authState.currentUser;

  readonly clinicName = this.clinicSettings.load().clinicName;
  saving = false;

  form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword: ['', Validators.required]
    },
    { validators: passwordMatchValidator }
  );

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const user = this.currentUser();
    if (!user) {
      return;
    }
    this.saving = true;
    const { newPassword, confirmPassword } = this.form.getRawValue();
    this.authState.setPassword(newPassword, confirmPassword).subscribe({
      next: async (user) => {
        this.saving = false;
        const t = await this.toast.create({
          message: 'Password set successfully. Welcome!',
          duration: 2500,
          color: 'success'
        });
        await t.present();
        this.authService.navigateByRole(user);
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}

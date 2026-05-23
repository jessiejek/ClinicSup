import { NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonInput, IonItem, IonLabel, ToastController } from '@ionic/angular/standalone';
import { timer } from 'rxjs';
import { AuthLayoutComponent } from '../components/auth-layout/auth-layout.component';
import { passwordStrengthValidator } from '../../shared/validators/password-strength.validator';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw === cpw ? null : { passwordMismatch: true };
}

@Component({
  standalone: true,
  selector: 'app-reset-password-page',
  imports: [NgIf, ReactiveFormsModule, RouterLink, AuthLayoutComponent, IonItem, IonLabel, IonInput],
  templateUrl: './reset-password.page.html',
  styleUrl: './reset-password.page.scss'
})
export class ResetPasswordPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);

  token = '';
  saving = false;

  form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword: ['', Validators.required]
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    timer(800).subscribe(async () => {
      this.saving = false;
      const t = await this.toast.create({
        message: 'Password changed successfully',
        duration: 2000,
        color: 'success'
      });
      await t.present();
      void this.router.navigate(['/auth/login']);
    });
  }
}

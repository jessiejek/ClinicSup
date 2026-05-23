import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonIcon, IonInput, IonItem, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle } from 'ionicons/icons';
import { timer } from 'rxjs';
import { AuthLayoutComponent } from '../components/auth-layout/auth-layout.component';

@Component({
  standalone: true,
  selector: 'app-forgot-password-page',
  imports: [
    NgIf,
    ReactiveFormsModule,
    RouterLink,
    AuthLayoutComponent,
    IonItem,
    IonLabel,
    IonInput,
    IonIcon
  ],
  templateUrl: './forgot-password.page.html',
  styleUrl: './forgot-password.page.scss'
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);

  showSuccess = false;
  submitting = false;
  submittedEmail = '';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  constructor() {
    addIcons({ checkmarkCircle });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.submittedEmail = this.form.getRawValue().email;
    timer(800).subscribe(() => {
      this.submitting = false;
      this.showSuccess = true;
    });
  }
}

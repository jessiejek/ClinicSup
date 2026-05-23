import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular/standalone';
import { timer } from 'rxjs';
import { AuthUser } from '../../../core/models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { passwordStrengthValidator, getPasswordStrength } from '../../../shared/validators/password-strength.validator';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw === cpw ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-staff-profile-page',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, ReactiveFormsModule, PageHeaderComponent],
  template: `
    <section class="page-shell">
      <app-page-header title="My Profile" subtitle="Update your name and change your password"></app-page-header>

      <div class="profile-grid">
        <div class="clinic-card">
          <div class="section-heading">Personal Info</div>
          <form class="profile-form" [formGroup]="personalForm" (ngSubmit)="saveProfile()">
            <label class="field-label">Full Name</label>
            <input class="filter-input" formControlName="fullName" />

            <label class="field-label">Contact Number</label>
            <input class="filter-input" formControlName="contactNumber" />

            <label class="field-label">Email</label>
            <input class="filter-input filter-input--readonly" [value]="currentUser()?.email ?? ''" readonly />

            <button class="btn-primary" type="submit">Save Changes</button>
          </form>
        </div>

        <div class="clinic-card">
          <div class="section-heading">Change Password</div>
          <form class="profile-form" [formGroup]="passwordForm" (ngSubmit)="changePassword()">
            <label class="field-label">Current Password</label>
            <input class="filter-input" type="password" formControlName="currentPassword" />

            <label class="field-label">New Password</label>
            <input class="filter-input" type="password" formControlName="newPassword" />

            <div class="strength-meter" aria-label="Password strength">
              <span
                *ngFor="let index of strengthIndexes"
                [class.is-active]="index < passwordStrength"
                [ngClass]="{
                  'strength-meter__bar--weak': passwordStrength === 1,
                  'strength-meter__bar--fair': passwordStrength === 2,
                  'strength-meter__bar--good': passwordStrength === 3,
                  'strength-meter__bar--strong': passwordStrength === 4
                }"
                class="strength-meter__bar"
              ></span>
            </div>
            <p class="strength-label" *ngIf="strengthLabel">{{ strengthLabel }}</p>

            <label class="field-label">Confirm Password</label>
            <input class="filter-input" type="password" formControlName="confirmPassword" />

            <div class="form-error-message" *ngIf="passwordForm.touched && passwordForm.hasError('passwordMismatch')">
              Passwords do not match
            </div>

            <button class="btn-primary" type="submit" [disabled]="changingPassword">Change Password</button>
          </form>
        </div>
      </div>
    </section>
  `,
  styleUrl: './staff-profile.page.scss'
})
export class StaffProfilePage implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly fb = inject(FormBuilder);
  private readonly toastCtrl = inject(ToastController);
  private readonly currentUserSignal = this.authState.currentUser;

  strengthIndexes = [0, 1, 2, 3];
  passwordStrength: 0 | 1 | 2 | 3 | 4 = 0;
  changingPassword = false;

  personalForm = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    contactNumber: ['']
  });

  passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword: ['', Validators.required]
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit(): void {
    const user = this.currentUser();
    if (user) {
      this.personalForm.patchValue({
        fullName: user.fullName,
        contactNumber: ''
      });
    }

    this.passwordForm.get('newPassword')?.valueChanges.subscribe((value) => {
      this.passwordStrength = getPasswordStrength(String(value ?? ''));
    });
  }

  currentUser(): AuthUser | null {
    return this.currentUserSignal();
  }

  get strengthLabel(): string {
    switch (this.passwordStrength) {
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return '';
    }
  }

  saveProfile(): void {
    const user = this.currentUser();
    if (!user || this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      return;
    }

    const { fullName } = this.personalForm.getRawValue();
    this.authState.setUser({ ...user, fullName });
    void this.presentToast('Profile updated');
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.changingPassword = true;
    timer(800).subscribe(async () => {
      this.changingPassword = false;
      this.passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      this.passwordStrength = 0;
      const toast = await this.toastCtrl.create({
        message: 'Password updated successfully',
        duration: 2200,
        color: 'success',
        position: 'top'
      });
      await toast.present();
    });
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2200,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }
}

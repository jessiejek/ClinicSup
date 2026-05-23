import { AbstractControl, ValidationErrors } from '@angular/forms';

export function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) {
    return null;
  }

  const errors: ValidationErrors = {};
  if (value.length < 8) {
    errors['minLength'] = true;
  }
  if (!/[A-Z]/.test(value)) {
    errors['requiresUppercase'] = true;
  }
  if (!/\d/.test(value)) {
    errors['requiresNumber'] = true;
  }
  if (!/[!@#$%^&*]/.test(value)) {
    errors['requiresSpecialChar'] = true;
  }

  return Object.keys(errors).length ? errors : null;
}

export function getPasswordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) {
    return 0;
  }
  const len = password.length >= 8;
  const upper = /[A-Z]/.test(password);
  const num = /\d/.test(password);
  const spec = /[!@#$%^&*]/.test(password);
  if (len && upper && num && spec) {
    return 4;
  }
  if (len && upper && num) {
    return 3;
  }
  if (len && upper) {
    return 2;
  }
  if (len) {
    return 1;
  }
  return 0;
}

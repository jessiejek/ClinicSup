import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'patientCode',
  standalone: true
})
export class PatientCodePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    return value.trim();
  }
}


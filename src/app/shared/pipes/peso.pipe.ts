import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'peso',
  standalone: true
})
export class PesoPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return this.formatter.format(value);
  }
}

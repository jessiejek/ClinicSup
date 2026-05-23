import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeSlot',
  standalone: true
})
export class TimeSlotPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const [hRaw, mRaw] = value.split(':');
    const h = Number(hRaw);
    const m = Number(mRaw ?? '0');
    if (!Number.isFinite(h) || !Number.isFinite(m)) {
      return value;
    }
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const mm = String(m).padStart(2, '0');
    return `${h12}:${mm} ${period}`;
  }
}

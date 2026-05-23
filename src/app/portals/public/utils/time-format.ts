import { ClinicSettings, DayOfWeek } from '../../../core/models';

const DAY_ORDER: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const DAY_SHORT: Record<DayOfWeek, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun'
};

/** Convert 24h "HH:mm" to e.g. "8:00 AM". */
export function formatTime24To12(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  let h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return hhmm;
  }
  const am = h < 12 || h === 24;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, '0');
  return `${hour12}:${mm} ${am ? 'AM' : 'PM'}`;
}

function formatDayRangeLabel(days: DayOfWeek[]): string {
  const sorted = [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const monFri: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  if (
    sorted.length === 5 &&
    monFri.every((d) => sorted.includes(d)) &&
    sorted.every((d) => monFri.includes(d))
  ) {
    return 'Mon–Fri';
  }
  return sorted.map((d) => DAY_SHORT[d]).join(', ');
}

/** Lines for clinic settings (Mon–Fri / Sat / Sun). */
export function formatClinicOperatingLines(settings: ClinicSettings): [string, string, string] {
  const oh = settings.operatingHours;
  const mf = oh.monday;
  const sat = oh.saturday;
  const sun = oh.sunday;

  let monFriLine: string;
  if (mf.isOpen) {
    monFriLine = `Mon-Fri: ${formatTime24To12(mf.openTime)} – ${formatTime24To12(mf.closeTime)}`;
  } else {
    monFriLine = 'Mon-Fri: Closed';
  }

  let satLine: string;
  if (sat.isOpen) {
    satLine = `Sat: ${formatTime24To12(sat.openTime)} – ${formatTime24To12(sat.closeTime)}`;
  } else {
    satLine = 'Sat: Closed';
  }

  const sunLine = !sun.isOpen ? 'Sun: Closed' : `Sun: ${formatTime24To12(sun.openTime)} – ${formatTime24To12(sun.closeTime)}`;

  return [monFriLine, satLine, sunLine];
}

/** One readable line per unique working block for a doctor. */
export function formatDoctorScheduleLines(
  schedules: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[]
): string[] {
  const grouped = new Map<string, DayOfWeek[]>();
  for (const s of schedules) {
    const key = `${s.startTime}|${s.endTime}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(s.dayOfWeek);
  }
  const lines: string[] = [];
  for (const [key, days] of grouped) {
    const [start, end] = key.split('|');
    const label = formatDayRangeLabel(days);
    lines.push(`${label}: ${formatTime24To12(start)} – ${formatTime24To12(end)}`);
  }
  return lines.sort((a, b) => a.localeCompare(b));
}

export function formatReviewDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function announcementDisplayDate(iso: string): string {
  return formatReviewDate(iso);
}

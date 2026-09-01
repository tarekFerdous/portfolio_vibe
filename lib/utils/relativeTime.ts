const DIVISIONS: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, unit: 'seconds' },
  { amount: 60, unit: 'minutes' },
  { amount: 24, unit: 'hours' },
  { amount: 7, unit: 'days' },
  { amount: 4.34524, unit: 'weeks' },
  { amount: 12, unit: 'months' },
  { amount: Number.POSITIVE_INFINITY, unit: 'years' },
];

const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/**
 * Formats an ISO timestamp as a relative string ("3 minutes ago"), walking up
 * the DIVISIONS table one unit at a time so a duration reports in the largest
 * whole unit that still reads as "at least 1" (avoids "60 minutes ago").
 */
export function formatRelativeTime(isoDate: string): string {
  let duration = (new Date(isoDate).getTime() - Date.now()) / 1000;

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }

  return formatter.format(Math.round(duration), 'years');
}

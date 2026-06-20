// Spaced-repetition schedule: expanding review intervals (in days) after the
// day you first study a topic. Recall success advances a stage; forgetting
// resets to the first interval. Completing every stage marks the topic mastered.
export const INTERVALS = [1, 3, 7, 14, 30, 60, 120] as const;

export const DEFAULT_REMINDER_HOUR = 9; // local time notifications fire

export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function intervalForStage(stage: number): number {
  return INTERVALS[Math.min(stage, INTERVALS.length - 1)];
}

export function dayDiff(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86400000);
}

export function formatRelativeDay(iso: string | null): string {
  if (!iso) return 'Done';
  const diff = dayDiff(new Date(), new Date(iso));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `in ${diff}d`;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatMinutes(ms: number): string {
  const m = Math.round(ms / 60000);
  return `${m}m`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

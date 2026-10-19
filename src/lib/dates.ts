import type { ISODate } from "./types";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
/** Monday-first, matching the stats screens. */
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const WEEKDAYS_SHORT = WEEKDAYS.map((d) => d.slice(0, 3));

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse at local noon so DST shifts never push us into a neighbouring day. */
export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function todayISO(now = new Date()): ISODate {
  return toISO(now);
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(iso: ISODate): number {
  return (fromISO(iso).getDay() + 6) % 7;
}

export function startOfWeek(iso: ISODate): ISODate {
  return addDays(iso, -weekdayIndex(iso));
}

export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7);
}

export function yearOf(iso: ISODate): number {
  return Number(iso.slice(0, 4));
}

export function monthIndex(iso: ISODate): number {
  return Number(iso.slice(5, 7)) - 1;
}

export function dayOfMonth(iso: ISODate): number {
  return Number(iso.slice(8, 10));
}

/** Season number = month (S1 = January), episode = day of month. */
export function episodeLabel(iso: ISODate): string {
  return `S${monthIndex(iso) + 1} E${dayOfMonth(iso)}`;
}

export function isoWeekNumber(iso: ISODate): number {
  const d = fromISO(iso);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4, 12);
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round((diff / 86_400_000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

export function formatLong(iso: ISODate): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${WEEKDAYS[weekdayIndex(iso)]}`;
}

export function formatShort(iso: ISODate): string {
  const d = fromISO(iso);
  return `${WEEKDAYS_SHORT[weekdayIndex(iso)]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonthDay(iso: ISODate): string {
  const d = fromISO(iso);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function formatRange(from: ISODate, to: ISODate): string {
  const a = fromISO(from);
  const b = fromISO(to);
  if (a.getFullYear() !== b.getFullYear()) return `${formatMonthDay(from)}, ${a.getFullYear()} – ${formatMonthDay(to)}, ${b.getFullYear()}`;
  if (a.getMonth() === b.getMonth()) return `${MONTHS_SHORT[a.getMonth()]} ${a.getDate()}–${b.getDate()}, ${a.getFullYear()}`;
  return `${formatMonthDay(from)} – ${formatMonthDay(to)}, ${a.getFullYear()}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

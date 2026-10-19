import { addDays, daysInMonth, formatRange, fromISO, isoWeekNumber, MONTHS, startOfWeek, toISO } from "./dates";
import type { ISODate } from "./types";

export type PeriodKind = "week" | "season" | "year";

export interface Period {
  kind: PeriodKind;
  key: string;
  start: ISODate;
  end: ISODate;
  title: string;
  subtitle: string;
  /** Word used in prose: "week", "season", "year". */
  noun: string;
}

export function periodContaining(kind: PeriodKind, iso: ISODate): Period {
  const d = fromISO(iso);
  if (kind === "week") {
    const start = startOfWeek(iso);
    const end = addDays(start, 6);
    return { kind, key: `week:${start}`, start, end, title: `Week ${isoWeekNumber(start)}`, subtitle: formatRange(start, end), noun: "week" };
  }
  if (kind === "season") {
    const y = d.getFullYear();
    const m = d.getMonth();
    const start = toISO(new Date(y, m, 1, 12));
    const end = toISO(new Date(y, m, daysInMonth(y, m), 12));
    return { kind, key: `season:${start.slice(0, 7)}`, start, end, title: `Season ${m + 1}`, subtitle: `${MONTHS[m]} ${y}`, noun: "season" };
  }
  const y = d.getFullYear();
  return { kind, key: `year:${y}`, start: `${y}-01-01`, end: `${y}-12-31`, title: `${y}`, subtitle: "The full series, so far", noun: "year" };
}

export function shiftPeriod(p: Period, steps: number): Period {
  if (p.kind === "week") return periodContaining("week", addDays(p.start, steps * 7));
  const d = fromISO(p.start);
  if (p.kind === "season") return periodContaining("season", toISO(new Date(d.getFullYear(), d.getMonth() + steps, 1, 12)));
  return periodContaining("year", toISO(new Date(d.getFullYear() + steps, 0, 1, 12)));
}

import { addDays, formatRange, isoWeekNumber, startOfWeek } from "./dates";
import { seasonOf, seasonRange, storyYearOf, type Series } from "./seasons";
import type { ISODate } from "./types";

export type PeriodKind = "week" | "season" | "year";

export interface Period {
  kind: PeriodKind;
  key: string;
  start: ISODate;
  end: ISODate;
  title: string;
  subtitle: string;
  /** Word used in prose: "week", "season", "semester", "year". */
  noun: string;
  series: Series;
}

export function periodContaining(kind: PeriodKind, iso: ISODate, series: Series): Period {
  if (kind === "week") {
    const start = startOfWeek(iso);
    const end = addDays(start, 6);
    return { kind, key: `week:${start}`, start, end, title: `Week ${isoWeekNumber(start)}`, subtitle: formatRange(start, end), noun: "week", series };
  }
  if (kind === "season") {
    const s = seasonOf(iso, series);
    const subtitle = series.format.mode === "school" ? `${s.name} · ${seasonRange(s)}` : s.name;
    return { kind, key: `season:${s.key}`, start: s.start, end: s.end, title: s.label, subtitle, noun: s.noun, series };
  }
  const y = storyYearOf(iso, series.format);
  const school = series.format.mode === "school";
  return { kind, key: `year:${y.key}`, start: y.start, end: y.end, title: y.label, subtitle: school ? "School year in review" : "Year in review", noun: school ? "school year" : "year", series };
}

export function shiftPeriod(p: Period, steps: number): Period {
  if (p.kind === "week") return periodContaining("week", addDays(p.start, steps * 7), p.series);
  let next = p;
  for (let i = 0; i < Math.abs(steps); i++) next = periodContaining(p.kind, steps > 0 ? addDays(next.end, 1) : addDays(next.start, -1), p.series);
  return next;
}

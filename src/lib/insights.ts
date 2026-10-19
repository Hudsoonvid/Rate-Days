import { addDays, weekdayIndex } from "./dates";
import { average, byWeekday } from "./stats";
import type { Day, ISODate, Tag } from "./types";

/** Days a tag needs before we call its effect. */
export const MIN_DAYS = 4;
/** Smallest same-day shift (in points) that counts as an effect. */
export const EFFECT = 0.3;
/** Next-day dip that turns a lift into a trade-off. */
export const HANGOVER = -0.7;

export type ImpactKind = "lever" | "drain" | "tradeoff" | "neutral" | "early";

export interface TagImpact {
  tag: Tag;
  kind: ImpactKind;
  count: number;
  avgWith: number;
  /** Same-day average minus the overall average. */
  delta: number;
  /**
   * How the following day compared with a typical day of its weekday (when
   * known). Weekday-adjusted so "Sunday tag → Monday dip" isn't blamed on the tag.
   */
  nextDelta: number | null;
  nextCount: number;
}

export interface ImpactReport {
  baseline: number;
  levers: TagImpact[];
  tradeoffs: TagImpact[];
  drains: TagImpact[];
  neutral: TagImpact[];
  early: TagImpact[];
}

export function tagImpact(days: Day[], tags: Tag[], byDate: Record<ISODate, Day>): ImpactReport {
  const baseline = average(days);
  const report: ImpactReport = { baseline, levers: [], tradeoffs: [], drains: [], neutral: [], early: [] };
  if (!days.length) return report;
  const weekdayAvg = byWeekday(days).map((b) => (b.count ? b.avg : baseline));

  for (const tag of tags) {
    const tagged = days.filter((d) => d.tags.includes(tag.id));
    if (!tagged.length) continue;
    const next = tagged.map((d) => byDate[addDays(d.date, 1)]).filter((d): d is Day => Boolean(d));
    const avgWith = average(tagged);
    const delta = avgWith - baseline;
    const nextDelta = next.length
      ? next.reduce((sum, d) => sum + d.rating - weekdayAvg[weekdayIndex(d.date)], 0) / next.length
      : null;
    const impact: TagImpact = { tag, kind: "neutral", count: tagged.length, avgWith, delta, nextDelta, nextCount: next.length };

    if (tagged.length < MIN_DAYS) impact.kind = "early";
    else if (delta > 0 && nextDelta !== null && next.length >= 3 && nextDelta <= HANGOVER) impact.kind = "tradeoff";
    else if (delta >= EFFECT) impact.kind = "lever";
    else if (delta <= -EFFECT) impact.kind = "drain";

    const bucket = { lever: report.levers, tradeoff: report.tradeoffs, drain: report.drains, neutral: report.neutral, early: report.early }[impact.kind];
    bucket.push(impact);
  }

  report.levers.sort((a, b) => b.delta - a.delta);
  report.tradeoffs.sort((a, b) => (a.nextDelta ?? 0) - (b.nextDelta ?? 0));
  report.drains.sort((a, b) => a.delta - b.delta);
  report.neutral.sort((a, b) => b.count - a.count);
  report.early.sort((a, b) => b.count - a.count || a.tag.name.localeCompare(b.tag.name));
  return report;
}

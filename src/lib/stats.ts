import { addDays, daysBetween, monthKey, weekdayIndex } from "./dates";
import { TIERS, tierFor, type Tier } from "./ratings";
import type { Day, ISODate, Person, Place, Tag } from "./types";

export function sortedDays(days: Record<ISODate, Day> | Day[]): Day[] {
  const list = Array.isArray(days) ? days.slice() : Object.values(days);
  return list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function inRange(days: Day[], from: ISODate, to: ISODate): Day[] {
  return days.filter((d) => d.date >= from && d.date <= to);
}

export function average(days: Day[]): number {
  if (!days.length) return 0;
  return days.reduce((s, d) => s + d.rating, 0) / days.length;
}

export interface Bucket {
  key: string;
  avg: number;
  count: number;
}

export function byMonth(days: Day[]): Bucket[] {
  const map = new Map<string, Day[]>();
  for (const d of days) {
    const k = monthKey(d.date);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(d);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, list]) => ({ key, avg: average(list), count: list.length }));
}

/** Highest-average month, ignoring months with too few entries to be meaningful. */
export function bestMonth(days: Day[], minCount = 5): Bucket | null {
  const months = byMonth(days).filter((m) => m.count >= minCount);
  if (!months.length) return null;
  return months.reduce((best, m) => (m.avg > best.avg ? m : best));
}

/** Monday-first averages; `count` is how many days of that weekday were rated. */
export function byWeekday(days: Day[]): Bucket[] {
  const groups: Day[][] = Array.from({ length: 7 }, () => []);
  for (const d of days) groups[weekdayIndex(d.date)].push(d);
  return groups.map((list, i) => ({ key: String(i), avg: average(list), count: list.length }));
}

export function bestWeekday(days: Day[]): Bucket | null {
  const rated = byWeekday(days).filter((b) => b.count > 0);
  if (!rated.length) return null;
  return rated.reduce((best, b) => (b.avg > best.avg ? b : best));
}

export interface Consistency {
  /** Mean absolute change between back-to-back days, in rating points. */
  swing: number;
  /** 100% = every day identical; each point of average swing costs 20%. */
  percent: number;
  pairs: number;
}

export function consistency(days: Day[]): Consistency {
  const sorted = sortedDays(days);
  let total = 0;
  let pairs = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (daysBetween(sorted[i - 1].date, sorted[i].date) !== 1) continue;
    total += Math.abs(sorted[i].rating - sorted[i - 1].rating);
    pairs++;
  }
  const swing = pairs ? total / pairs : 0;
  return { swing, pairs, percent: pairs ? Math.max(0, Math.min(100, Math.round(100 - swing * 20))) : 0 };
}

export interface Streak {
  length: number;
  start?: ISODate;
  end?: ISODate;
}

/** Longest run of consecutive calendar days that are all rated and all match `test`. */
export function longestStreak(days: Day[], test: (d: Day) => boolean): Streak {
  const sorted = sortedDays(days);
  let best: Streak = { length: 0 };
  let runStart: ISODate | undefined;
  let runLen = 0;
  let prev: ISODate | undefined;
  for (const d of sorted) {
    const continues = prev !== undefined && daysBetween(prev, d.date) === 1;
    if (test(d)) {
      if (continues && runLen > 0) runLen++;
      else {
        runLen = 1;
        runStart = d.date;
      }
      if (runLen > best.length) best = { length: runLen, start: runStart, end: d.date };
    } else {
      runLen = 0;
    }
    prev = d.date;
  }
  return best;
}

/** Consecutive rated days ending today (or yesterday, so the streak survives until bedtime). */
export function loggingStreak(days: Record<ISODate, Day>, today: ISODate): number {
  let cursor = days[today] ? today : addDays(today, -1);
  let n = 0;
  while (days[cursor]) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export interface TierShare {
  tier: Tier;
  count: number;
  percent: number;
}

export function tierDistribution(days: Day[]): TierShare[] {
  const counts = new Map(TIERS.map((t) => [t.key, 0]));
  for (const d of days) counts.set(tierFor(d.rating).key, (counts.get(tierFor(d.rating).key) ?? 0) + 1);
  return TIERS.map((tier) => {
    const count = counts.get(tier.key) ?? 0;
    return { tier, count, percent: days.length ? Math.round((count / days.length) * 100) : 0 };
  });
}

/** Counts per whole-number bucket 0…10 (a 10.0 lands in bucket 10). */
export function histogram(days: Day[]): number[] {
  const buckets = new Array(11).fill(0);
  for (const d of days) buckets[Math.min(10, Math.floor(d.rating))]++;
  return buckets;
}

export function topDays(days: Day[], n: number, direction: "best" | "worst" = "best"): Day[] {
  const sign = direction === "best" ? -1 : 1;
  return days
    .slice()
    .sort((a, b) => sign * (a.rating - b.rating) || (a.date < b.date ? 1 : -1))
    .slice(0, n);
}

export interface GenreShare {
  genre: string;
  count: number;
  percent: number;
}

/** How many days featured each genre (a day counts once per genre, however many tags). */
export function genreShares(days: Day[], tags: Tag[]): GenreShare[] {
  const genreOf = new Map(tags.map((t) => [t.id, t.genre]));
  const counts = new Map<string, number>();
  for (const d of days) {
    const genres = new Set(d.tags.map((id) => genreOf.get(id)).filter(Boolean) as string[]);
    for (const g of genres) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count, percent: days.length ? Math.round((count / days.length) * 100) : 0 }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}

export interface EntityStat<T> {
  item: T;
  avg: number;
  count: number;
  days: Day[];
}

function entityStats<T extends { id: string }>(items: T[], days: Day[], idsOf: (d: Day) => string[]): EntityStat<T>[] {
  const byId = new Map<string, Day[]>();
  for (const d of days) for (const id of idsOf(d)) {
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id)!.push(d);
  }
  return items
    .filter((item) => byId.has(item.id))
    .map((item) => {
      const list = byId.get(item.id)!;
      return { item, avg: average(list), count: list.length, days: list };
    });
}

export function personStats(people: Person[], days: Day[]): EntityStat<Person>[] {
  return entityStats(people, days, (d) => d.people);
}

export function placeStats(places: Place[], days: Day[]): EntityStat<Place>[] {
  return entityStats(places, days, (d) => (d.placeId ? [d.placeId] : []));
}

export function tagStats(tags: Tag[], days: Day[]): EntityStat<Tag>[] {
  return entityStats(tags, days, (d) => d.tags);
}

/** Sort by average, breaking ties with more appearances. */
export function rankByRating<T>(stats: EntityStat<T>[]): EntityStat<T>[] {
  return stats.slice().sort((a, b) => b.avg - a.avg || b.count - a.count);
}

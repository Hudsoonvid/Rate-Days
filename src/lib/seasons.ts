import { addDays, daysBetween, daysInMonth, formatRange, MONTHS } from "./dates";
import type { ISODate, SeriesFormat } from "./types";

/**
 * How days group into seasons and years.
 *
 * Season numbers count from the season of the series premiere (the earliest
 * episode): that season is Season 1, the next one Season 2, and so on — they
 * never reset at New Year. Episode numbers count days from the start of the
 * season, and Season 1 starts on the premiere itself, so the pilot is S1 E1.
 *
 * Calendar mode: every month is a season. School mode: the school year runs
 * from `schoolStart` to the month before it; Fall runs to December, Spring
 * from January to `springEnd`, and any months in between are Summer break.
 */

export const DEFAULT_FORMAT: SeriesFormat = { mode: "calendar", schoolStart: 7, springEnd: 4 };

export interface Series {
  format: SeriesFormat;
  /** Date of the first episode (or today, before there are any). */
  premiere: ISODate;
}

export type SeasonKind = "month" | "fall" | "spring" | "summer";

export interface Season {
  /** Stable id built from dates, so it survives renumbering: "2026-10", "fall-2026". */
  key: string;
  kind: SeasonKind;
  /** 1 for the premiere's season; ≤ 0 for seasons before the series began. */
  number: number;
  /** "Season 3" */
  label: string;
  /** "S3" */
  badge: string;
  /** "October 2026" or "Fall 2026" */
  name: string;
  /** Word used in prose: "season", "semester", "summer". */
  noun: string;
  start: ISODate;
  end: ISODate;
  /** First day that counts as an episode: the premiere for Season 1, otherwise `start`. */
  firstDay: ISODate;
}

export interface StoryYear {
  /** "2026" or "2026-27" */
  key: string;
  /** "2026" or "2026–27" */
  label: string;
  /** Calendar year the story year starts in. */
  startYear: number;
  start: ISODate;
  end: ISODate;
  /** The twelve months in display order, as [year, month0]. */
  months: [number, number][];
}

const iso = (y: number, m0: number, d: number) => `${y}-${String(m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const lastOf = (y: number, m0: number) => iso(y, m0, daysInMonth(y, m0));
const parts = (date: ISODate) => [Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1] as const;

function hasSummer(f: SeriesFormat): boolean {
  return f.springEnd + 1 <= f.schoolStart - 1;
}

/** Position of a season on a single timeline, so numbering is a subtraction. */
function ordinal(kind: SeasonKind, year: number, f: SeriesFormat): number {
  if (f.mode === "calendar" || kind === "month") return 0; // unused
  // School seasons in order: Fall(Y) → Spring(Y+1) → Summer(Y+1) → Fall(Y+1)…
  const perYear = hasSummer(f) ? 3 : 2;
  const schoolYear = kind === "fall" ? year : year - 1;
  return schoolYear * perYear + (kind === "fall" ? 0 : kind === "spring" ? 1 : 2);
}

interface RawSeason {
  key: string;
  kind: SeasonKind;
  name: string;
  noun: string;
  start: ISODate;
  end: ISODate;
  year: number;
  month0: number;
}

function rawSeasonOf(date: ISODate, f: SeriesFormat): RawSeason {
  const [y, m] = parts(date);
  if (f.mode === "calendar") {
    return { key: date.slice(0, 7), kind: "month", name: `${MONTHS[m]} ${y}`, noun: "season", start: iso(y, m, 1), end: lastOf(y, m), year: y, month0: m };
  }
  if (m >= f.schoolStart) {
    return { key: `fall-${y}`, kind: "fall", name: `Fall ${y}`, noun: "semester", start: iso(y, f.schoolStart, 1), end: lastOf(y, 11), year: y, month0: m };
  }
  if (m <= f.springEnd) {
    return { key: `spring-${y}`, kind: "spring", name: `Spring ${y}`, noun: "semester", start: iso(y, 0, 1), end: lastOf(y, f.springEnd), year: y, month0: m };
  }
  return { key: `summer-${y}`, kind: "summer", name: `Summer ${y}`, noun: "summer", start: iso(y, f.springEnd + 1, 1), end: lastOf(y, f.schoolStart - 1), year: y, month0: m };
}

function seasonNumber(raw: RawSeason, premiere: RawSeason, f: SeriesFormat): number {
  if (f.mode === "calendar") return (raw.year - premiere.year) * 12 + (raw.month0 - premiere.month0) + 1;
  return ordinal(raw.kind, raw.year, f) - ordinal(premiere.kind, premiere.year, f) + 1;
}

export function seasonOf(date: ISODate, series: Series): Season {
  const f = series.format;
  const raw = rawSeasonOf(date, f);
  const first = rawSeasonOf(series.premiere, f);
  const number = seasonNumber(raw, first, f);
  return {
    key: raw.key,
    kind: raw.kind,
    number,
    label: number >= 1 ? `Season ${number}` : "Before the premiere",
    badge: number >= 1 ? `S${number}` : "–",
    name: raw.name,
    noun: raw.noun,
    start: raw.start,
    end: raw.end,
    firstDay: number === 1 && series.premiere > raw.start ? series.premiere : raw.start,
  };
}

export function episodeNumber(date: ISODate, series: Series): number {
  return daysBetween(seasonOf(date, series).firstDay, date) + 1;
}

/** "S3 E14". Dates before the premiere are labelled as if the series started on them. */
export function episodeLabel(date: ISODate, series: Series): string {
  const s = series.premiere > date ? { ...series, premiere: date } : series;
  return `${seasonOf(date, s).badge} E${episodeNumber(date, s)}`;
}

/** Neighbouring season, `steps` away (negative = earlier). */
export function shiftSeason(season: Season, steps: number, series: Series): Season {
  let s = season;
  for (let i = 0; i < Math.abs(steps); i++) s = seasonOf(steps > 0 ? addDays(s.end, 1) : addDays(s.start, -1), series);
  return s;
}

/** Short range like "Aug 1 – Dec 31". */
export function seasonRange(s: Season): string {
  return formatRange(s.firstDay, s.end);
}

// ---------- years ----------

export function storyYearStarting(startYear: number, f: SeriesFormat): StoryYear {
  const m0 = f.mode === "school" ? f.schoolStart : 0;
  const months: [number, number][] = Array.from({ length: 12 }, (_, i) => [startYear + Math.floor((m0 + i) / 12), (m0 + i) % 12]);
  const [ey, em] = months[11];
  const label = f.mode === "school" ? `${startYear}–${String((startYear + 1) % 100).padStart(2, "0")}` : String(startYear);
  return { key: label.replace("–", "-"), label, startYear, start: iso(startYear, m0, 1), end: lastOf(ey, em), months };
}

export function storyYearOf(date: ISODate, f: SeriesFormat): StoryYear {
  const [y, m] = parts(date);
  return storyYearStarting(f.mode === "school" && m < f.schoolStart ? y - 1 : y, f);
}

/** Seasons that fall inside a story year, in order. */
export function seasonsInYear(year: StoryYear, series: Series): Season[] {
  const out: Season[] = [];
  let s = seasonOf(year.start, series);
  while (s.start <= year.end) {
    out.push(s);
    s = seasonOf(addDays(s.end, 1), series);
  }
  return out;
}

/** Episode label with the semester name in school mode: "Fall 2026 · S1 E12". */
export function episodeCaption(date: ISODate, series: Series): string {
  const label = episodeLabel(date, series);
  return series.format.mode === "school" ? `${seasonOf(date, series.premiere > date ? { ...series, premiere: date } : series).name} · ${label}` : label;
}

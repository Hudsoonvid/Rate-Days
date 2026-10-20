import { formatShort, toISO, weekdayIndex, WEEKDAYS } from "./dates";
import { localRecap, type RecapContent, type RecapFacts } from "./narrator";
import { fmt } from "./ratings";
import { byMonth, topDays } from "./stats";
import type { AppData, Day } from "./types";

/** Prompt, schema and reply parsing for the AI narrator. */

export class NarratorError extends Error {}

export function systemPrompt(facts: RecapFacts): string {
  const seasons =
    facts.period.series.format.mode === "school"
      ? "every day is an episode and every school semester (Fall, Spring, and Summer break) is a season"
      : "every day is an episode and every month is a season";
  return `You are "The Narrator" inside a journaling app where someone rates each day of their life from 0 to 10, as if their life were a TV series: ${seasons}. Seasons are numbered from the person's first episode. You write the recap for one period (a week, a season, or a year) from the data you are given.

Voice: second person ("you"), like a warm, observant TV narrator. Vivid but grounded. Use only facts present in the data. Never invent events, people, places, or feelings that the notes don't support. Name specific episode titles, people, and places when they appear. Be honest about rough patches without being clinical or preachy. No emoji, no markdown, no headings.

Reply with a JSON object with these fields:
- logline: one sentence that captures the period, in the style of a streaming-service synopsis.
- best_line: one or two sentences about the best-rated episode (it is identified in the data).
- worst_line: one or two sentences about the lowest-rated episode, or an empty string if there is none.
- paragraphs: two to four short paragraphs (2-3 sentences each) about the arc of the period: trends versus the previous period, recurring storylines (tags), the cast (people), the locations, streaks.
- closing: a short sign-off line.`;
}

export const RECAP_SCHEMA = {
  type: "object",
  properties: {
    logline: { type: "string" },
    best_line: { type: "string" },
    worst_line: { type: "string" },
    paragraphs: { type: "array", items: { type: "string" } },
    closing: { type: "string" },
  },
  required: ["logline", "best_line", "worst_line", "paragraphs", "closing"],
  additionalProperties: false,
};

export interface RecapFields {
  logline: string;
  best_line: string;
  worst_line: string;
  paragraphs: string[];
  closing: string;
}

export interface PayloadOptions {
  /** Max characters of notes per episode. */
  noteLimit: number;
  /**
   * Above this many episodes, send only the highlights plus monthly averages.
   * Small local models have short context windows and run slower on long prompts.
   */
  maxEpisodes: number;
}

export function buildPayload(data: AppData, f: RecapFacts, opts: PayloadOptions) {
  const people = new Map(data.people.map((p) => [p.id, p.name]));
  const tags = new Map(data.tags.map((t) => [t.id, t.name]));
  const places = new Map(data.places.map((p) => [p.id, p.name]));
  const episode = (d: Day) => ({
    date: d.date,
    weekday: WEEKDAYS[weekdayIndex(d.date)],
    rating: d.rating,
    title: d.title,
    notes: d.notes.length > opts.noteLimit ? `${d.notes.slice(0, opts.noteLimit)}…` : d.notes,
    people: d.people.map((id) => people.get(id)).filter(Boolean),
    tags: d.tags.map((id) => tags.get(id)).filter(Boolean),
    place: d.placeId ? places.get(d.placeId) ?? null : null,
  });

  const all = f.days.length <= opts.maxEpisodes;
  let episodes = f.days;
  if (!all) {
    const picks = new Map<string, Day>();
    for (const d of [...topDays(f.days, 8, "best"), ...topDays(f.days, 5, "worst")]) picks.set(d.date, d);
    episodes = [...picks.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  return {
    period: { kind: f.period.kind, title: f.period.title, subtitle: f.period.subtitle, from: f.period.start, to: f.period.end },
    summary: {
      episodes_rated: f.days.length,
      average: Number(fmt(f.avg)),
      previous_period_average: f.prevAvg === null ? null : Number(fmt(f.prevAvg)),
      best_episode: f.best ? { date: f.best.date, title: f.best.title, rating: f.best.rating } : null,
      worst_episode: f.worst ? { date: f.worst.date, title: f.worst.title, rating: f.worst.rating } : null,
      top_tags: f.topTags,
      top_people: f.topPeople,
      top_places: f.topPlaces,
      longest_great_streak_days: f.greatStreak.length,
      longest_tough_streak_days: f.toughStreak.length,
      ...(all ? {} : { monthly_averages: byMonth(f.days).map((m) => ({ month: m.key, average: Number(fmt(m.avg)), episodes: m.count })) }),
    },
    [all ? "episodes" : "highlight_episodes"]: episodes.map(episode),
  };
}

/** Lenient: local models sometimes wrap JSON in prose, code fences or <think> blocks. */
export function parseRecapFields(text: string): RecapFields {
  let t = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start < 0 || end <= start) throw new NarratorError("The narrator's reply wasn't a recap. Try again.");
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(t.slice(start, end + 1));
  } catch {
    throw new NarratorError("The narrator's reply couldn't be read. Try again.");
  }
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const paragraphs = Array.isArray(raw.paragraphs) ? raw.paragraphs.map(str).filter(Boolean) : str(raw.paragraphs) ? [str(raw.paragraphs)] : [];
  const fields = { logline: str(raw.logline), best_line: str(raw.best_line), worst_line: str(raw.worst_line), paragraphs, closing: str(raw.closing) };
  if (!fields.logline && !paragraphs.length) throw new NarratorError("The narrator returned an empty recap.");
  return fields;
}

/** Titles, dates and ratings come from the data itself; only the prose is generated. */
export function toRecap(facts: RecapFacts, fields: RecapFields): RecapContent {
  const base = localRecap(facts);
  return {
    logline: fields.logline || base.logline,
    best: base.best ? { ...base.best, line: fields.best_line || base.best.line } : undefined,
    worst: base.worst ? { ...base.worst, line: fields.worst_line || base.worst.line } : undefined,
    paragraphs: fields.paragraphs.length ? fields.paragraphs : base.paragraphs,
    closing: fields.closing || base.closing,
  };
}

export function describeRecapSource(createdAt: number, source = "AI"): string {
  return `Written by ${source} · ${formatShort(toISO(new Date(createdAt)))}`;
}

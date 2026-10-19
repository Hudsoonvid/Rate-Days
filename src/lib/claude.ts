import { formatShort, toISO, weekdayIndex, WEEKDAYS } from "./dates";
import { fmt } from "./ratings";
import { localRecap, type RecapContent, type RecapFacts } from "./narrator";
import type { AppData } from "./types";

/**
 * Optional AI narrator. Runs entirely in the browser with the user's own
 * Anthropic API key (kept in this device's IndexedDB, sent only to
 * api.anthropic.com). The SDK is loaded lazily so it costs nothing until used.
 */

export const AI_MODEL = "claude-opus-5-5";

const SYSTEM = `You are "The Narrator" inside a journaling app where someone rates each day of their life from 0 to 10, as if their life were a TV series: every day is an episode and every month is a season. You write the recap for one period (a week, a season, or a year) from the data you are given.

Voice: second person ("you"), like a warm, observant TV narrator. Vivid but grounded. Use only facts present in the data. Never invent events, people, places, or feelings that the notes don't support. Name specific episode titles, people, and places when they appear. Be honest about rough patches without being clinical or preachy. No emoji, no markdown, no headings.

Fields:
- logline: one sentence that captures the period, in the style of a streaming-service synopsis.
- best_line: one or two sentences about the best-rated episode (it is identified in the data).
- worst_line: one or two sentences about the lowest-rated episode, or an empty string if there is none.
- paragraphs: two to four short paragraphs (2-3 sentences each) about the arc of the period: trends versus the previous period, recurring storylines (tags), the cast (people), the locations, streaks.
- closing: a short sign-off line.`;

const SCHEMA = {
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

interface AiFields {
  logline: string;
  best_line: string;
  worst_line: string;
  paragraphs: string[];
  closing: string;
}

function payload(data: AppData, f: RecapFacts) {
  const people = new Map(data.people.map((p) => [p.id, p.name]));
  const tags = new Map(data.tags.map((t) => [t.id, t.name]));
  const places = new Map(data.places.map((p) => [p.id, p.name]));
  const noteLimit = f.period.kind === "year" ? 240 : 600;
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
    },
    episodes: f.days.map((d) => ({
      date: d.date,
      weekday: WEEKDAYS[weekdayIndex(d.date)],
      rating: d.rating,
      title: d.title,
      notes: d.notes.length > noteLimit ? `${d.notes.slice(0, noteLimit)}…` : d.notes,
      people: d.people.map((id) => people.get(id)).filter(Boolean),
      tags: d.tags.map((id) => tags.get(id)).filter(Boolean),
      place: d.placeId ? places.get(d.placeId) ?? null : null,
    })),
  };
}

export class NarratorError extends Error {}

export async function aiRecap(apiKey: string, data: AppData, facts: RecapFacts): Promise<RecapContent> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  let response;
  try {
    response = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      // If a safety classifier declines, let the API retry on its recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [
        {
          role: "user",
          content: `Write the recap for this period.\n\n${JSON.stringify(payload(data, facts))}`,
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new NarratorError("Your Anthropic API key was rejected. Check it in Settings.");
    if (error instanceof Anthropic.PermissionDeniedError) throw new NarratorError("This API key doesn't have access to the model.");
    if (error instanceof Anthropic.RateLimitError) throw new NarratorError("Rate limited by the API — try again in a minute.");
    if (error instanceof Anthropic.APIConnectionError) throw new NarratorError("Couldn't reach the Anthropic API. Are you online?");
    if (error instanceof Anthropic.APIError) throw new NarratorError(`The API returned an error (${error.status ?? "unknown"}).`);
    throw error;
  }

  if (response.stop_reason === "refusal") throw new NarratorError("The narrator declined to write this recap.");
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new NarratorError("The narrator returned an empty recap.");

  let fields: AiFields;
  try {
    fields = JSON.parse(text.text) as AiFields;
  } catch {
    throw new NarratorError("The narrator's reply couldn't be read. Try again.");
  }

  // Titles and dates come from the data itself; only the prose is generated.
  const base = localRecap(facts);
  return {
    logline: fields.logline,
    best: base.best ? { ...base.best, line: fields.best_line || base.best.line } : undefined,
    worst: base.worst ? { ...base.worst, line: fields.worst_line || base.worst.line } : undefined,
    paragraphs: fields.paragraphs.filter(Boolean),
    closing: fields.closing,
  };
}

export function describeRecapSource(createdAt: number): string {
  return `Written by Claude · ${formatShort(toISO(new Date(createdAt)))}`;
}

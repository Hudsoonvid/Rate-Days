import { formatMonthDay } from "./dates";
import { shiftPeriod, type Period } from "./periods";
import { fmt } from "./ratings";
import { average, inRange, longestStreak, personStats, placeStats, sortedDays, tagStats, topDays, type Streak } from "./stats";
import type { AppData, Day } from "./types";

export interface RecapFacts {
  period: Period;
  days: Day[];
  avg: number;
  prevAvg: number | null;
  best: Day | null;
  worst: Day | null;
  topTags: { name: string; genre: string; count: number; avg: number }[];
  topPeople: { name: string; count: number; avg: number }[];
  topPlaces: { name: string; count: number; avg: number }[];
  greatStreak: Streak;
  toughStreak: Streak;
}

/** What a recap card shows — produced either locally or by Claude. */
export interface RecapContent {
  logline: string;
  best?: { title: string; when: string; line: string };
  worst?: { title: string; when: string; line: string };
  paragraphs: string[];
  closing: string;
}

export function gatherFacts(data: AppData, period: Period): RecapFacts {
  const all = sortedDays(data.days);
  const days = inRange(all, period.start, period.end);
  const prev = shiftPeriod(period, -1);
  const prevDays = inRange(all, prev.start, prev.end);
  const tags = tagStats(data.tags, days).sort((a, b) => b.count - a.count).slice(0, 4);
  const people = personStats(data.people, days).sort((a, b) => b.count - a.count || b.avg - a.avg).slice(0, 3);
  const places = placeStats(data.places, days).sort((a, b) => b.count - a.count).slice(0, 3);
  return {
    period,
    days,
    avg: average(days),
    prevAvg: prevDays.length ? average(prevDays) : null,
    best: topDays(days, 1, "best")[0] ?? null,
    worst: days.length > 1 ? topDays(days, 1, "worst")[0] ?? null : null,
    topTags: tags.map((t) => ({ name: t.item.name, genre: t.item.genre, count: t.count, avg: t.avg })),
    topPeople: people.map((p) => ({ name: p.item.name, count: p.count, avg: p.avg })),
    topPlaces: places.map((p) => ({ name: p.item.name, count: p.count, avg: p.avg })),
    greatStreak: longestStreak(days, (d) => d.rating >= 8),
    toughStreak: longestStreak(days, (d) => d.rating < 5),
  };
}

// --- Local narrator -------------------------------------------------------
// Deterministic prose built from the facts, so recaps work offline and
// without an API key. Variety comes from a hash of the period key.

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pick<T>(options: T[], seed: number, salt: number): T {
  return options[(seed + salt * 7919) % options.length];
}

const GENRE_PHRASES: Record<string, string[]> = {
  Travel: ["new horizons", "far-off places", "boarding passes"],
  Adventure: ["bold detours", "trails less taken"],
  Fitness: ["hard-won strength", "early workouts", "sore muscles"],
  Wellness: ["quiet resets", "slow mornings"],
  Social: ["good company", "long conversations", "nights out"],
  Family: ["time with family", "kitchen-table moments"],
  Food: ["good food", "shared meals"],
  Work: ["long hours", "deadlines met"],
  Creative: ["creative breakthroughs", "things made by hand"],
  Learning: ["pages turned", "new skills"],
  Rest: ["late nights", "overdue rest"],
  Health: ["recovery", "listening to your body"],
  Mood: ["small comforts", "cozy evenings"],
  Other: ["small wins", "everyday victories"],
};

function quote(day: Day): string {
  return day.title ? `“${day.title}”` : `Episode ${formatMonthDay(day.date)}`;
}

function firstSentence(text: string): string {
  const s = text.trim().match(/^[^.!?]*[.!?]?/)?.[0] ?? "";
  return s.length > 160 ? `${s.slice(0, 157)}…` : s;
}

/** Notes are written in the first person, so quote them rather than narrate them. */
function inYourWords(notes: string): string {
  const s = firstSentence(notes);
  return s ? `In your words: “${s}”` : "";
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function localRecap(f: RecapFacts): RecapContent {
  const seed = hash(f.period.key);
  const noun = f.period.noun;
  if (!f.days.length) {
    return {
      logline: `This ${noun} hasn't aired yet.`,
      paragraphs: [`Rate a few days and the narrator will have something to say about this ${noun}.`],
      closing: "Stay tuned.",
    };
  }

  const genres = [...new Set(f.topTags.map((t) => t.genre))];
  const phrases = genres.map((g, i) => pick(GENRE_PHRASES[g] ?? GENRE_PHRASES.Other, seed, i));
  while (phrases.length < 2) phrases.push(pick(["small wins", "ordinary magic", "steady progress", "plot twists"], seed, phrases.length + 3));
  const tone =
    f.avg >= 8.5 ? "that played like a highlight reel"
    : f.avg >= 7.5 ? "that pushed your world forward"
    : f.avg >= 6.5 ? "that kept the story moving"
    : f.avg >= 5 ? "that tested your patience, not your resolve"
    : "that asked a lot of you — and you showed up anyway";
  const logline = `A ${noun} of ${listJoin(phrases.slice(0, 3))} ${tone}.`;

  const best = f.best
    ? {
        title: quote(f.best),
        when: `${formatMonthDay(f.best.date)}, ${fmt(f.best.rating)}`,
        line:
          inYourWords(f.best.notes) ||
          pick(["Everything clicked.", "The kind of day you replay.", "A clear series highlight."], seed, 1),
      }
    : undefined;
  const worst = f.worst && f.best && f.worst.date !== f.best.date
    ? {
        title: quote(f.worst),
        when: `${formatMonthDay(f.worst.date)}, ${fmt(f.worst.rating)}`,
        line:
          inYourWords(f.worst.notes) ||
          pick(["Everything went sideways, but you made it through.", "Not every episode can be a classic.", "A rough cut — and the story kept going."], seed, 2),
      }
    : undefined;

  const paragraphs: string[] = [];

  const n = f.days.length;
  let trend = `This ${noun} you rated ${n} episode${n === 1 ? "" : "s"} and averaged ${fmt(f.avg)}`;
  if (f.prevAvg !== null) {
    const diff = f.avg - f.prevAvg;
    if (Math.abs(diff) < 0.15) trend += `, right in line with last ${noun}.`;
    else if (diff > 0) trend += ` — up ${fmt(diff)} from last ${noun}. ${pick(["You built momentum.", "The arc is bending upward.", "Something is working."], seed, 4)}`;
    else trend += ` — down ${fmt(-diff)} from last ${noun}. ${pick(["A slower chapter, not a cancelled show.", "Every series has a dip before the turn.", "Worth a look at what changed."], seed, 5)}`;
  } else trend += ".";
  paragraphs.push(trend);

  if (f.topTags.length) {
    const parts = f.topTags.slice(0, 3).map((t, i) => `${t.name} (${t.count}${i === 0 ? ` episode${t.count === 1 ? "" : "s"}` : ""})`);
    const strongest = f.topTags.reduce((a, b) => (b.avg > a.avg ? b : a));
    paragraphs.push(
      `The recurring storylines: ${listJoin(parts)}. ${strongest.name} days averaged ${fmt(strongest.avg)}${strongest.avg > f.avg + 0.2 ? " — one of your better plot devices" : ""}.`,
    );
  }

  const cast: string[] = [];
  if (f.topPeople.length) {
    const lead = f.topPeople[0];
    cast.push(`${lead.name} had the most screen time (${lead.count} episode${lead.count === 1 ? "" : "s"}, ${fmt(lead.avg)} avg)`);
  }
  if (f.topPlaces.length) {
    const set = f.topPlaces[0];
    cast.push(`most scenes were shot in ${set.name}`);
  }
  if (cast.length) paragraphs.push(`${cast.join(", and ")}.`.replace(/^./, (c) => c.toUpperCase()));

  if (f.greatStreak.length >= 3 && f.greatStreak.start && f.greatStreak.end) {
    paragraphs.push(
      `Your best run lasted ${f.greatStreak.length} great days in a row (${formatMonthDay(f.greatStreak.start)} – ${formatMonthDay(f.greatStreak.end)}).` +
        (f.toughStreak.length >= 2 ? ` The toughest stretch was ${f.toughStreak.length} days long — and it ended.` : ""),
    );
  } else if (f.toughStreak.length >= 2) {
    paragraphs.push(`There was a ${f.toughStreak.length}-day rough patch, but the story didn't stop there.`);
  }

  const closing =
    f.avg >= 7.5
      ? pick(["Here's to the next chapter.", "Renewed for another season.", "Fans are already asking for more."], seed, 6)
      : pick(["Here's to the next chapter.", "The comeback arc starts now.", "Every great series has a season like this."], seed, 7);

  return { logline, best, worst, paragraphs, closing };
}

import { fromISO, MONTHS, WEEKDAYS, weekdayIndex } from "./dates";
import { sortedDays } from "./stats";
import type { AppData, Day } from "./types";

export type MatchKind = "title" | "place" | "person" | "tag" | "note" | "date";

export interface SearchHit {
  day: Day;
  kind: MatchKind;
  /** Text to show under the result explaining why it matched. */
  detail: string;
}

function excerpt(text: string, needle: string): string {
  const i = text.toLowerCase().indexOf(needle);
  if (i < 0) return text.slice(0, 80);
  const from = Math.max(0, i - 24);
  const to = Math.min(text.length, i + needle.length + 40);
  return `${from > 0 ? "…" : ""}${text.slice(from, to)}${to < text.length ? "…" : ""}`;
}

function dateMatches(day: Day, q: string): boolean {
  if (day.date.startsWith(q)) return true;
  const d = fromISO(day.date);
  const month = MONTHS[d.getMonth()].toLowerCase();
  const weekday = WEEKDAYS[weekdayIndex(day.date)].toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  return words.every((w) => {
    if (/^\d{1,2}$/.test(w)) return d.getDate() === Number(w);
    if (/^\d{4}$/.test(w)) return d.getFullYear() === Number(w);
    if (w.length >= 3 && month.startsWith(w)) return true;
    if (w.length >= 3 && weekday.startsWith(w)) return true;
    return false;
  });
}

/** Newest-first search across titles, places, people, tags, notes and dates. */
export function searchDays(data: AppData, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const people = new Map(data.people.map((p) => [p.id, p.name]));
  const tags = new Map(data.tags.map((t) => [t.id, t]));
  const places = new Map(data.places.map((p) => [p.id, p.name]));
  const hits: SearchHit[] = [];

  for (const day of sortedDays(data.days).reverse()) {
    const place = day.placeId ? places.get(day.placeId) : undefined;
    const personNames = day.people.map((id) => people.get(id)).filter(Boolean) as string[];
    const tagList = day.tags.map((id) => tags.get(id)).filter(Boolean);
    let hit: SearchHit | null = null;

    if (day.title.toLowerCase().includes(q)) hit = { day, kind: "title", detail: place ? `At: ${place}` : "" };
    else if (place?.toLowerCase().includes(q)) hit = { day, kind: "place", detail: `At: ${place}` };
    else if (personNames.some((n) => n.toLowerCase().includes(q)))
      hit = { day, kind: "person", detail: `With: ${personNames.join(", ")}` };
    else if (tagList.some((t) => t!.name.toLowerCase().includes(q)))
      hit = { day, kind: "tag", detail: tagList.map((t) => `${t!.emoji} ${t!.name}`).join("  ") };
    else if (day.notes.toLowerCase().includes(q)) hit = { day, kind: "note", detail: `“${excerpt(day.notes, q)}”` };
    else if (dateMatches(day, q)) hit = { day, kind: "date", detail: place ? `At: ${place}` : "" };

    if (hit) hits.push(hit);
  }
  return hits;
}

import { addDays, daysBetween, monthIndex, weekdayIndex } from "./dates";
import { STARTER_TAGS } from "./presets";
import { roundRating } from "./ratings";
import type { AppData, Day, ISODate, Person, Place } from "./types";

/**
 * A believable sample year ("Alex's Story") so every screen has something to
 * show. Deterministic: same seed → same data, which keeps tests stable.
 */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PEOPLE: Person[] = [
  { id: "p-mia", name: "Mia Chen" },
  { id: "p-noah", name: "Noah Patel" },
  { id: "p-emma", name: "Emma Ross" },
  { id: "p-luca", name: "Luca Moretti" },
  { id: "p-sofia", name: "Sofia Kim" },
  { id: "p-avery", name: "Avery Reed" },
  { id: "p-jamie", name: "Jamie Morgan" },
  { id: "p-dan", name: "Dan Brooks" },
];

const PLACES: Place[] = [
  { id: "pl-home", name: "Amsterdam", lat: 52.3676, lng: 4.9041 },
  { id: "pl-london", name: "London", lat: 51.5072, lng: -0.1276 },
  { id: "pl-paris", name: "Paris", lat: 48.8566, lng: 2.3522 },
  { id: "pl-lisbon", name: "Lisbon", lat: 38.7223, lng: -9.1393 },
  { id: "pl-barcelona", name: "Barcelona", lat: 41.3874, lng: 2.1686 },
  { id: "pl-rome", name: "Rome", lat: 41.9028, lng: 12.4964 },
  { id: "pl-vienna", name: "Vienna", lat: 48.2082, lng: 16.3738 },
  { id: "pl-athens", name: "Athens", lat: 37.9838, lng: 23.7275 },
];

/** Same-day effect of each tag on the rating (the "truth" Tag Impact should find). */
const TAG_EFFECT: Record<string, number> = {
  "t-travel": 0.9, "t-walk": 0.9, "t-meditation": 0.7, "t-strength": 1.5, "t-beer": 0.9,
  "t-social": 0.5, "t-family": 0.5, "t-homecooked": 0.2, "t-dinnerout": 0.4, "t-music": 1.0,
  "t-adventure": 0.6, "t-creative": 0.6, "t-crunch": -1.4, "t-screen": -0.6, "t-sick": -3.8,
  "t-reading": 0.3, "t-focus": 0.4, "t-protein": 0.2, "t-sleep": 0.4, "t-cozy": 0.3, "t-sunrise": 0.5,
};

const PERSON_EFFECT: Record<string, number> = {
  "p-mia": 1.0, "p-noah": 0.8, "p-emma": 0.6, "p-luca": 0.6, "p-sofia": 0.5, "p-avery": 0.4, "p-jamie": 0.3, "p-dan": -0.6,
};

const TRIPS: { from: ISODate; to: ISODate; place: string }[] = [
  { from: "2026-02-13", to: "2026-02-16", place: "pl-paris" },
  { from: "2026-03-20", to: "2026-03-24", place: "pl-lisbon" },
  { from: "2026-04-30", to: "2026-05-04", place: "pl-barcelona" },
  { from: "2026-06-11", to: "2026-06-16", place: "pl-rome" },
  { from: "2026-07-10", to: "2026-07-14", place: "pl-london" },
  { from: "2026-08-20", to: "2026-08-25", place: "pl-athens" },
  { from: "2026-09-25", to: "2026-09-28", place: "pl-vienna" },
];

const TITLES: Record<string, string[]> = {
  "t-travel": ["Coastal Hike", "Old Town Wander", "Lighthouse Visit", "Ocean Sunset", "Rooftop Views", "Night Train", "Market Morning"],
  "t-music": ["Live Concert", "Front Row", "Encore"],
  "t-adventure": ["Summer Hike", "Sunrise Surf", "Cliff Path", "Kayak Day"],
  "t-strength": ["New Personal Best", "Leg Day", "Gym Before Work"],
  "t-walk": ["Long Walk Home", "Park Loop", "Canal Stroll"],
  "t-family": ["Family BBQ", "Sunday Lunch", "Grandma's Birthday"],
  "t-social": ["Game Night", "Catch-up Drinks", "Dinner Party"],
  "t-dinnerout": ["Creamy Pesto Pasta", "Seafood Dinner", "Taco Tuesday", "Ramen Run"],
  "t-homecooked": ["Soup Sunday", "Homemade Pizza", "Curry Night"],
  "t-crunch": ["Work Overload", "Deadline Day", "Back-to-Back Meetings"],
  "t-sick": ["Sick Day", "Couch & Tea", "Feeling Drained"],
  "t-creative": ["The Launch", "Painting Session", "First Draft"],
  "t-screen": ["Sleepless Night", "Doomscroll Evening"],
  "t-meditation": ["Quiet Reset", "Slow Morning"],
  "t-cozy": ["Rainy Day In", "Blanket Fort"],
};

const FALLBACK_TITLES = {
  low: ["Rough Morning", "Feeling Drained", "Long Day", "Running on Empty"],
  mid: ["Ordinary Tuesday", "Errand Day", "Steady Going", "Midweek Grind", "Laundry & Podcasts"],
  high: ["Small Wins", "Easy Sunday", "Golden Hour", "Everything Clicked"],
};

const NOTE_OPENERS = [
  "The day unfolded at a steady, satisfying pace.",
  "Woke up early and actually felt rested.",
  "Started slow, picked up by the afternoon.",
  "One of those days where nothing was dramatic, but everything landed well.",
  "Busier than planned, but the evening made up for it.",
  "Couldn't shake a heavy feeling this morning.",
];

const TAG_NOTES: Record<string, string> = {
  "t-travel": "Exploring somewhere new made every hour feel longer in the best way.",
  "t-walk": "A long walk cleared my head.",
  "t-strength": "Hit the gym and felt strong.",
  "t-meditation": "Ten minutes of meditation before breakfast.",
  "t-beer": "A couple of craft beers with friends — worth it tonight, maybe not tomorrow.",
  "t-social": "Great conversations that went late.",
  "t-family": "Time with family, lots of laughing.",
  "t-dinnerout": "Dinner became the anchor of the day — pasta, wine, and easy conversation.",
  "t-crunch": "Deadlines everywhere, barely looked up from the screen.",
  "t-screen": "Stayed up scrolling way too late.",
  "t-sick": "Spent most of the day on the couch with tea.",
  "t-music": "The band was incredible, ears still ringing.",
  "t-adventure": "Pushed a little out of my comfort zone and loved it.",
  "t-creative": "Finally shipped the project I've been working on.",
  "t-homecooked": "Cooked a proper meal at home.",
  "t-reading": "Read a few chapters before bed.",
};

export function buildDemoData(today: ISODate, seed = 2026): AppData {
  const rand = rng(seed);
  const chance = (p: number) => rand() < p;
  const choose = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];

  const start = `${today.slice(0, 4)}-01-01`;
  const end = addDays(today, -1);
  const total = daysBetween(start, end) + 1;
  const days: Record<ISODate, Day> = {};
  let hangover = 0;
  let crunchWeek = false;

  for (let i = 0; i < total; i++) {
    const date = addDays(start, i);
    const wd = weekdayIndex(date);
    const m = monthIndex(date);
    if (wd === 0) crunchWeek = chance(0.18);
    if (!chance(0.94)) {
      hangover = 0;
      continue;
    }

    const trip = TRIPS.find((t) => date >= t.from && date <= t.to);
    const tags = new Set<string>();
    const people = new Set<string>();
    let placeId: string | undefined = "pl-home";

    if (trip) {
      tags.add("t-travel");
      placeId = trip.place;
      if (chance(0.6)) tags.add("t-adventure");
      if (chance(0.6)) tags.add("t-dinnerout");
      if (chance(0.5)) tags.add("t-walk");
      people.add(chance(0.6) ? "p-mia" : choose(["p-noah", "p-emma", "p-luca"]));
    } else {
      if (wd < 5 && (crunchWeek ? chance(0.7) : chance(0.12))) tags.add("t-crunch");
      if (chance(wd >= 5 ? 0.55 : 0.3)) tags.add("t-walk");
      if (chance(0.38) && wd < 5) tags.add("t-strength");
      if (chance(0.2)) tags.add("t-meditation");
      if (chance(0.3)) tags.add("t-homecooked");
      if (chance(wd >= 4 ? 0.2 : 0.06)) tags.add("t-beer");
      if (chance(wd >= 4 ? 0.35 : 0.12)) tags.add("t-social");
      if (wd === 6 && chance(0.45)) tags.add("t-family");
      if (chance(0.14)) tags.add("t-screen");
      if (chance(0.12)) tags.add("t-reading");
      if (chance(0.15) && wd < 5) tags.add("t-focus");
      if (chance(0.07)) tags.add("t-dinnerout");
      if (chance(0.025)) tags.add("t-music");
      if (chance(0.04)) tags.add("t-creative");
      if ((m <= 1 || m >= 10) && chance(0.15)) tags.add("t-cozy");
      if (chance(0.025)) tags.add("t-sick");
      if (chance(0.05)) tags.add("t-sunrise");
      // A few rarely-used tags so "too early to call" has something in it.
      if (chance(0.011)) tags.add("t-run");
      if (chance(0.01)) tags.add("t-sleep");
      if (chance(0.008)) tags.add("t-nospend");
      if (tags.has("t-social")) people.add(choose(["p-noah", "p-emma", "p-sofia", "p-luca", "p-jamie", "p-avery"]));
      if (tags.has("t-family")) people.add("p-avery");
      if (chance(0.16)) people.add("p-mia");
      if (tags.has("t-crunch") && chance(0.3)) people.add("p-dan");
      if (!people.size && chance(0.12)) people.add(choose(PEOPLE).id);
      if (tags.has("t-music") && chance(0.5)) placeId = chance(0.5) ? "pl-london" : "pl-paris";
    }

    const seasonal = [-0.3, -0.2, 0.2, 0.4, 0.1, 0.3, 0.0, 0.2, 0.1, -0.1, -0.2, 0.1][m];
    const weekday = [0.0, 0.2, 0.4, -0.5, 0.1, 0.3, 0.2][wd];
    let rating = 6.2 + seasonal + weekday + hangover;
    for (const t of tags) rating += TAG_EFFECT[t] ?? 0;
    for (const p of people) rating += PERSON_EFFECT[p] ?? 0;
    rating += (rand() - 0.5) * 2.4;
    if (chance(0.015)) rating -= 3.5;
    // Soft ceiling so great days spread across 9.0–9.9 instead of piling up at the cap.
    if (rating > 9) rating = 9 + (rating - 9) * 0.3;
    rating = Math.max(0.5, Math.min(9.9, roundRating(rating)));
    hangover = tags.has("t-beer") ? -2.1 : 0;

    const keyTag = [...tags].find((t) => TITLES[t]) ?? "";
    const fallback = FALLBACK_TITLES[rating < 5 ? "low" : rating >= 8 ? "high" : "mid"];
    const title = keyTag && chance(0.85) ? choose(TITLES[keyTag]) : choose(fallback);
    const opener = rating < 4.5 ? NOTE_OPENERS[5] : choose(NOTE_OPENERS.slice(0, 5));
    const tagLines = [...tags].map((t) => TAG_NOTES[t]).filter(Boolean).slice(0, 2);
    const notes = chance(0.85) ? [...tagLines.slice(0, 1), opener, ...tagLines.slice(1)].join(" ") : "";

    days[date] = { date, rating, title, notes, people: [...people], tags: [...tags], placeId, updatedAt: Date.now() };
  }

  return {
    days,
    people: PEOPLE,
    tags: STARTER_TAGS,
    places: PLACES,
    profile: { name: "Alex", storyTitle: "Alex's Story", tagline: "A year of growth and balance." },
    goals: {
      selected: ["g-strength", "g-sugar", "g-money"],
      commitments: [
        { id: "c-strength", label: "Strength training", tagId: "t-strength", perWeek: 4, goalId: "g-strength" },
        { id: "c-focus", label: "Morning focus time", tagId: "t-focus", perWeek: 4 },
        { id: "c-homecooked", label: "Home-cooked meals", tagId: "t-homecooked", perWeek: 4, goalId: "g-sugar" },
        { id: "c-reading", label: "Daily reading", tagId: "t-reading", perWeek: 5 },
        { id: "c-meditate", label: "Meditate", tagId: "t-meditation", perWeek: 4 },
      ],
    },
    settings: { apiKey: "" },
    recaps: {},
    onboarded: true,
  };
}

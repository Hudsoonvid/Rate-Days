import { describe, expect, it } from "vitest";
import { addDays, episodeLabel, isoWeekNumber, startOfWeek, weekdayIndex } from "./dates";
import { buildDemoData } from "./demo";
import { commitmentResult, weekCount } from "./goals";
import { tagImpact } from "./insights";
import { gatherFacts, localRecap } from "./narrator";
import { periodContaining, shiftPeriod } from "./periods";
import { fmtDelta, tierFor } from "./ratings";
import { searchDays } from "./search";
import {
  bestMonth, bestWeekday, consistency, genreShares, histogram, loggingStreak,
  longestStreak, personStats, rankByRating, sortedDays, tierDistribution, topDays,
} from "./stats";
import { emptyData, parseBackup, serializeBackup } from "./store";
import type { Day, Tag } from "./types";

function day(date: string, rating: number, extra: Partial<Day> = {}): Day {
  return { date, rating, title: "", notes: "", people: [], tags: [], updatedAt: 0, ...extra };
}

function byDate(days: Day[]) {
  return Object.fromEntries(days.map((d) => [d.date, d]));
}

describe("dates", () => {
  it("labels episodes by month and day", () => {
    expect(episodeLabel("2026-07-14")).toBe("S7 E14");
  });
  it("starts weeks on Monday", () => {
    expect(weekdayIndex("2026-10-19")).toBe(0); // a Monday
    expect(startOfWeek("2026-10-25")).toBe("2026-10-19");
  });
  it("crosses month and DST boundaries", () => {
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("computes ISO week numbers", () => {
    expect(isoWeekNumber("2026-01-01")).toBe(1);
    expect(isoWeekNumber("2026-10-19")).toBe(43);
    expect(isoWeekNumber("2027-01-01")).toBe(53);
  });
});

describe("ratings", () => {
  it("maps ratings onto the six tiers", () => {
    expect(tierFor(9.0).label).toBe("Awesome");
    expect(tierFor(8.6).label).toBe("Great");
    expect(tierFor(7.9).label).toBe("Good");
    expect(tierFor(5.0).label).toBe("Average");
    expect(tierFor(3.0).label).toBe("Bad");
    expect(tierFor(2.5).label).toBe("Garbage");
  });
  it("formats signed deltas", () => {
    expect(fmtDelta(1.06)).toBe("+1.1");
    expect(fmtDelta(-2.1)).toBe("−2.1");
  });
});

describe("stats", () => {
  const days = [
    day("2026-01-01", 8.5), day("2026-01-02", 8.2), day("2026-01-03", 9.1),
    day("2026-01-04", 4.0), day("2026-01-05", 3.5), day("2026-01-07", 8.8),
  ];

  it("finds the longest streak of consecutive calendar days", () => {
    expect(longestStreak(days, (d) => d.rating >= 8)).toEqual({ length: 3, start: "2026-01-01", end: "2026-01-03" });
    expect(longestStreak(days, (d) => d.rating < 5).length).toBe(2);
  });

  it("does not bridge a gap in the calendar", () => {
    const gap = [day("2026-01-01", 9), day("2026-01-03", 9)];
    expect(longestStreak(gap, () => true).length).toBe(1);
  });

  it("measures consistency from back-to-back days only", () => {
    const c = consistency([day("2026-01-01", 7), day("2026-01-02", 8), day("2026-01-03", 7), day("2026-01-10", 1)]);
    expect(c.pairs).toBe(2);
    expect(c.swing).toBe(1);
    expect(c.percent).toBe(80);
  });

  it("counts the logging streak up to today, or yesterday", () => {
    const map = byDate([day("2026-01-03", 7), day("2026-01-04", 7), day("2026-01-05", 7)]);
    expect(loggingStreak(map, "2026-01-05")).toBe(3);
    expect(loggingStreak(map, "2026-01-06")).toBe(3);
    expect(loggingStreak(map, "2026-01-07")).toBe(0);
  });

  it("buckets the histogram by whole points", () => {
    const h = histogram([day("2026-01-01", 10), day("2026-01-02", 9.9), day("2026-01-03", 0.2)]);
    expect(h[10]).toBe(1);
    expect(h[9]).toBe(1);
    expect(h[0]).toBe(1);
  });

  it("shares add up to the number of days", () => {
    const dist = tierDistribution(days);
    expect(dist.reduce((s, t) => s + t.count, 0)).toBe(days.length);
  });

  it("picks best and worst days", () => {
    expect(topDays(days, 1, "best")[0].date).toBe("2026-01-03");
    expect(topDays(days, 1, "worst")[0].date).toBe("2026-01-05");
  });

  it("counts a genre once per day", () => {
    const tags: Tag[] = [
      { id: "a", name: "A", emoji: "", genre: "Fitness" },
      { id: "b", name: "B", emoji: "", genre: "Fitness" },
    ];
    const shares = genreShares([day("2026-01-01", 7, { tags: ["a", "b"] })], tags);
    expect(shares).toEqual([{ genre: "Fitness", count: 1, percent: 100 }]);
  });

  it("ranks people by the average of days they appear in", () => {
    const people = [{ id: "x", name: "X" }, { id: "y", name: "Y" }, { id: "z", name: "Z" }];
    const list = [day("2026-01-01", 9, { people: ["x"] }), day("2026-01-02", 6, { people: ["y", "x"] })];
    const ranked = rankByRating(personStats(people, list));
    expect(ranked.map((r) => r.item.id)).toEqual(["x", "y"]);
    expect(ranked[0].avg).toBe(7.5);
  });
});

describe("tag impact", () => {
  const tags: Tag[] = [
    { id: "walk", name: "Walk", emoji: "🚶", genre: "Fitness" },
    { id: "beer", name: "Beer", emoji: "🍺", genre: "Food" },
    { id: "rare", name: "Rare", emoji: "✨", genre: "Other" },
    { id: "work", name: "Work", emoji: "💼", genre: "Work" },
  ];
  const list: Day[] = [];
  for (let i = 0; i < 40; i++) {
    const date = addDays("2026-01-01", i);
    const t: string[] = [];
    let rating = 7;
    if (i % 5 === 0) { t.push("walk"); rating += 1.5; }
    if (i % 8 === 2) { t.push("beer"); rating += 0.8; }
    if (i % 8 === 3) rating -= 3; // the morning after
    if (i % 7 === 4) { t.push("work"); rating -= 1.5; }
    if (i === 11) t.push("rare");
    list.push(day(date, rating, { tags: t }));
  }
  const report = tagImpact(list, tags, byDate(list));

  it("classifies levers, trade-offs, drains and early tags", () => {
    expect(report.levers.map((x) => x.tag.id)).toContain("walk");
    expect(report.tradeoffs.map((x) => x.tag.id)).toEqual(["beer"]);
    expect(report.drains.map((x) => x.tag.id)).toEqual(["work"]);
    expect(report.early.map((x) => x.tag.id)).toEqual(["rare"]);
  });

  it("reports the next-day effect of a trade-off", () => {
    expect(report.tradeoffs[0].nextDelta!).toBeLessThan(-2);
  });
});

describe("goals", () => {
  it("counts tagged days in the current Monday-start week", () => {
    const list = [
      day("2026-10-19", 7, { tags: ["t"] }), day("2026-10-21", 7, { tags: ["t"] }),
      day("2026-10-18", 7, { tags: ["t"] }), // previous week
    ];
    const c = { id: "c", label: "x", tagId: "t", perWeek: 3 };
    expect(weekCount(byDate(list), c, "2026-10-22")).toBe(2);
    expect(commitmentResult(list, c).withCount).toBe(3);
  });
});

describe("periods", () => {
  it("steps weeks, seasons and years", () => {
    const week = periodContaining("week", "2026-10-22");
    expect(week.start).toBe("2026-10-19");
    expect(week.end).toBe("2026-10-25");
    expect(shiftPeriod(week, -1).start).toBe("2026-10-12");
    const season = periodContaining("season", "2026-02-10");
    expect([season.start, season.end, season.title]).toEqual(["2026-02-01", "2026-02-28", "Season 2"]);
    expect(shiftPeriod(season, -2).start).toBe("2025-12-01");
    expect(shiftPeriod(periodContaining("year", "2026-05-05"), 1).key).toBe("year:2027");
  });
});

describe("demo data", () => {
  const demo = buildDemoData("2026-10-19");
  const days = sortedDays(demo.days);

  it("covers the year up to yesterday and is deterministic", () => {
    expect(days[0].date).toBe("2026-01-01");
    expect(days[days.length - 1].date <= "2026-10-18").toBe(true);
    expect(days.length).toBeGreaterThan(250);
    expect(sortedDays(buildDemoData("2026-10-19").days).map((d) => d.rating)).toEqual(days.map((d) => d.rating));
  });

  it("keeps ratings in range with one decimal", () => {
    for (const d of days) {
      expect(d.rating).toBeGreaterThanOrEqual(0);
      expect(d.rating).toBeLessThanOrEqual(10);
      expect(Math.round(d.rating * 10)).toBeCloseTo(d.rating * 10, 6);
    }
  });

  it("produces insights the screens can show", () => {
    const report = tagImpact(days, demo.tags, demo.days);
    expect(report.levers.find((l) => l.tag.id === "t-travel")).toBeTruthy();
    expect(report.tradeoffs.find((l) => l.tag.id === "t-beer")).toBeTruthy();
    expect(bestMonth(days)).not.toBeNull();
    expect(bestWeekday(days)).not.toBeNull();
  });
});

describe("narrator", () => {
  const demo = buildDemoData("2026-10-19");

  it("writes a recap with best and worst episodes", () => {
    const recap = localRecap(gatherFacts(demo, periodContaining("season", "2026-07-01")));
    expect(recap.logline).toMatch(/^A season of /);
    expect(recap.best?.title).toBeTruthy();
    expect(recap.worst?.title).toBeTruthy();
    expect(recap.paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(recap.paragraphs[0]).toMatch(/averaged \d\.\d/);
  });

  it("handles an empty period", () => {
    const recap = localRecap(gatherFacts(demo, periodContaining("week", "2027-03-01")));
    expect(recap.logline).toMatch(/hasn't aired/);
  });
});

describe("search", () => {
  const data = { ...emptyData(), ...buildDemoData("2026-10-19") };

  it("finds days by place, person, tag and month", () => {
    expect(searchDays(data, "lisbon").every((h) => h.day.placeId === "pl-lisbon" || h.kind !== "place")).toBe(true);
    expect(searchDays(data, "lisbon").length).toBeGreaterThan(0);
    expect(searchDays(data, "mia").some((h) => h.kind === "person")).toBe(true);
    expect(searchDays(data, "craft beer").every((h) => h.day.tags.includes("t-beer"))).toBe(true);
    expect(searchDays(data, "jul 12").every((h) => h.day.date === "2026-07-12")).toBe(true);
  });

  it("returns newest first", () => {
    const hits = searchDays(data, "walk");
    expect(hits[0].day.date > hits[hits.length - 1].day.date).toBe(true);
  });
});

describe("backups", () => {
  it("round-trips data and never exports the API key", () => {
    const demo = buildDemoData("2026-10-19");
    demo.settings.apiKey = "sk-ant-secret";
    const text = serializeBackup(demo);
    expect(text).not.toContain("sk-ant-secret");
    const restored = parseBackup(text);
    expect(Object.keys(restored.days).length).toBe(Object.keys(demo.days).length);
    expect(restored.settings.apiKey).toBe("");
  });

  it("rejects files that are not backups", () => {
    expect(() => parseBackup(JSON.stringify({ hello: "world" }))).toThrow();
  });
});

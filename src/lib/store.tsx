import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as db from "./db";
import { buildDemoData } from "./demo";
import { todayISO } from "./dates";
import { STARTER_TAGS } from "./presets";
import type { AppData, Day, Goals, Person, Place, Profile, Recap, Settings, Tag } from "./types";

export function emptyData(): AppData {
  return {
    days: {},
    people: [],
    tags: STARTER_TAGS,
    places: [],
    profile: { name: "", storyTitle: "My Story", tagline: "Every day is an episode." },
    goals: { selected: [], commitments: [] },
    settings: { apiKey: "" },
    recaps: {},
    onboarded: false,
  };
}

export function uid(prefix: string): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

/** Validate an imported backup just enough that the app won't crash on it. */
export function parseBackup(json: string): AppData {
  const raw = JSON.parse(json) as Partial<AppData> & { app?: string };
  if (!raw || typeof raw !== "object" || typeof raw.days !== "object") throw new Error("That file doesn't look like a RateDays backup.");
  const base = emptyData();
  const days: Record<string, Day> = {};
  for (const d of Object.values(raw.days ?? {})) {
    if (!d || typeof d.date !== "string" || typeof d.rating !== "number") continue;
    days[d.date] = {
      date: d.date,
      rating: Math.max(0, Math.min(10, d.rating)),
      title: String(d.title ?? ""),
      notes: String(d.notes ?? ""),
      photo: typeof d.photo === "string" ? d.photo : undefined,
      people: Array.isArray(d.people) ? d.people.map(String) : [],
      tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
      placeId: typeof d.placeId === "string" ? d.placeId : undefined,
      updatedAt: Number(d.updatedAt) || Date.now(),
    };
  }
  return {
    days,
    people: Array.isArray(raw.people) ? raw.people : base.people,
    tags: Array.isArray(raw.tags) ? raw.tags : base.tags,
    places: Array.isArray(raw.places) ? raw.places : base.places,
    profile: { ...base.profile, ...(raw.profile ?? {}) },
    goals: { ...base.goals, ...(raw.goals ?? {}) },
    // Never import someone else's API key from a shared backup.
    settings: base.settings,
    recaps: raw.recaps && typeof raw.recaps === "object" ? raw.recaps : {},
    onboarded: true,
  };
}

export function serializeBackup(data: AppData): string {
  const { settings: _omit, ...rest } = data;
  return JSON.stringify({ app: "ratedays", version: 1, exportedAt: new Date().toISOString(), ...rest }, null, 1);
}

interface Store {
  data: AppData;
  ready: boolean;
  persistent: boolean;
  today: string;
  saveDay: (day: Day) => void;
  removeDay: (date: string) => void;
  upsertPerson: (p: Person) => void;
  upsertTag: (t: Tag) => void;
  upsertPlace: (p: Place) => void;
  setProfile: (p: Profile) => void;
  setGoals: (g: Goals) => void;
  setSettings: (s: Settings) => void;
  saveRecap: (r: Recap) => void;
  finishOnboarding: (profile: Profile) => void;
  replaceAll: (data: AppData) => Promise<void>;
  loadDemo: () => Promise<void>;
  reset: () => Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i < 0) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [today, setToday] = useState(todayISO);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loaded, ok] = await Promise.all([db.loadAll().catch((): Partial<AppData> => ({})), db.isPersistent()]);
      if (cancelled) return;
      setData((d) => ({ ...d, ...loaded, days: loaded.days ?? d.days }));
      setPersistent(ok);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Roll "today" over at midnight and when the app returns from the background.
  useEffect(() => {
    const tick = () => setToday(todayISO());
    const id = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const update = useCallback(<K extends keyof AppData>(key: K, value: AppData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    if (key !== "days") void db.putMeta(key as Exclude<K, "days">, value as never);
  }, []);

  const store = useMemo<Store>(
    () => ({
      data,
      ready,
      persistent,
      today,
      saveDay: (day) => {
        setData((d) => ({ ...d, days: { ...d.days, [day.date]: day } }));
        void db.putDay(day);
      },
      removeDay: (date) => {
        setData((d) => {
          const days = { ...d.days };
          delete days[date];
          return { ...d, days };
        });
        void db.deleteDay(date);
      },
      upsertPerson: (p) => update("people", upsert(dataRef.current.people, p)),
      upsertTag: (t) => update("tags", upsert(dataRef.current.tags, t)),
      upsertPlace: (p) => update("places", upsert(dataRef.current.places, p)),
      setProfile: (p) => update("profile", p),
      setGoals: (g) => update("goals", g),
      setSettings: (s) => update("settings", s),
      saveRecap: (r) => update("recaps", { ...dataRef.current.recaps, [r.key]: r }),
      finishOnboarding: (profile) => {
        update("profile", profile);
        update("onboarded", true);
      },
      replaceAll: async (next) => {
        setData(next);
        await db.replaceAll(next);
      },
      loadDemo: async () => {
        const demo = buildDemoData(todayISO());
        demo.settings = dataRef.current.settings;
        setData(demo);
        await db.replaceAll(demo);
      },
      reset: async () => {
        const fresh = emptyData();
        setData(fresh);
        await db.replaceAll(fresh);
      },
    }),
    [data, ready, persistent, today, update],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
}

/** ISO calendar date, `YYYY-MM-DD`, in the user's local time zone. */
export type ISODate = string;

export interface Day {
  date: ISODate;
  /** 0–10, one decimal place. */
  rating: number;
  title: string;
  notes: string;
  /** Downscaled JPEG data URL. */
  photo?: string;
  people: string[];
  tags: string[];
  placeId?: string;
  updatedAt: number;
}

export interface Person {
  id: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
  emoji: string;
  /** Grouping used for "Top Genres" (Family, Travel, Fitness…). */
  genre: string;
  /** Short line shown under the tag in Tag Impact. */
  blurb?: string;
}

export interface Place {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
}

export interface Profile {
  name: string;
  storyTitle: string;
  tagline: string;
  cover?: string;
}

export interface Commitment {
  id: string;
  label: string;
  tagId: string;
  perWeek: number;
  goalId?: string;
}

export interface Goals {
  selected: string[];
  commitments: Commitment[];
}

/** "Connect to AI": the AI runs on the user's own computer. */
export interface Settings {
  /** Base URL of an OpenAI-compatible server (Ollama, LM Studio…), e.g. https://my-pc.tailnet.ts.net */
  localUrl: string;
  /** Chosen automatically when connecting; never shown to the user. */
  localModel: string;
}

/**
 * How the series is cut into seasons. Season numbers always count from the
 * season of the first episode: in calendar mode each month is a season, in
 * school mode each semester (Fall, Spring, and Summer break if there's a gap).
 */
export interface SeriesFormat {
  mode: "calendar" | "school";
  /** Month the school year (and Fall) starts, 0-based: 6 = July, 7 = August, 8 = September. */
  schoolStart: number;
  /** Last month of Spring, 0-based: 3 = April, 4 = May, 5 = June. */
  springEnd: number;
}

export interface Recap {
  key: string;
  text: string;
  createdAt: number;
  /** Who wrote it ("AI"); absent for the built-in narrator. */
  source?: string;
}

export interface AppData {
  days: Record<ISODate, Day>;
  people: Person[];
  tags: Tag[];
  places: Place[];
  profile: Profile;
  goals: Goals;
  settings: Settings;
  format: SeriesFormat;
  recaps: Record<string, Recap>;
  onboarded: boolean;
}

export type GridView = "grid" | "compact" | "list";

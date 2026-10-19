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

export interface Settings {
  apiKey: string;
}

export interface Recap {
  key: string;
  text: string;
  createdAt: number;
}

export interface AppData {
  days: Record<ISODate, Day>;
  people: Person[];
  tags: Tag[];
  places: Place[];
  profile: Profile;
  goals: Goals;
  settings: Settings;
  recaps: Record<string, Recap>;
  onboarded: boolean;
}

export type GridView = "grid" | "compact" | "list";

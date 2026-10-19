import type { Tag } from "./types";

export const GENRES = [
  "Family", "Social", "Travel", "Adventure", "Fitness", "Wellness",
  "Food", "Work", "Creative", "Learning", "Rest", "Health", "Mood", "Other",
];

/** Starter tags offered to new users. Ids are stable so goals can reference them. */
export const STARTER_TAGS: Tag[] = [
  { id: "t-walk", name: "Walk", emoji: "🚶", genre: "Fitness", blurb: "fresh air clears your head" },
  { id: "t-strength", name: "Strength Training", emoji: "🏋️", genre: "Fitness", blurb: "builds momentum and confidence" },
  { id: "t-run", name: "Run", emoji: "🏃", genre: "Fitness", blurb: "miles that pay you back" },
  { id: "t-meditation", name: "Meditation", emoji: "🧘", genre: "Wellness", blurb: "calm mind, better days" },
  { id: "t-travel", name: "Travel", emoji: "✈️", genre: "Travel", blurb: "a change of scenery recharges you" },
  { id: "t-adventure", name: "Adventure", emoji: "🧗", genre: "Adventure", blurb: "a little fear, a lot of story" },
  { id: "t-family", name: "Family", emoji: "👨‍👩‍👧", genre: "Family", blurb: "the people who knew you first" },
  { id: "t-social", name: "Social Time", emoji: "❤️", genre: "Social", blurb: "good company lifts everything" },
  { id: "t-homecooked", name: "Home-Cooked Meals", emoji: "🍲", genre: "Food", blurb: "made with your own hands" },
  { id: "t-protein", name: "High-Protein Meals", emoji: "🍗", genre: "Food", blurb: "fuel that lasts" },
  { id: "t-dinnerout", name: "Dinner Out", emoji: "🍝", genre: "Food", blurb: "someone else does the dishes" },
  { id: "t-beer", name: "Craft Beer", emoji: "🍺", genre: "Food", blurb: "tastes great, slows tomorrow down" },
  { id: "t-sugar", name: "Late-Night Snacks", emoji: "🍫", genre: "Food", blurb: "sweet now, foggy later" },
  { id: "t-reading", name: "Evening Reading", emoji: "📖", genre: "Learning", blurb: "a quieter way to end the day" },
  { id: "t-focus", name: "Morning Focus Time", emoji: "☕", genre: "Work", blurb: "deep work before the noise" },
  { id: "t-crunch", name: "Work Crunch", emoji: "💼", genre: "Work", blurb: "deadlines eat the day" },
  { id: "t-screen", name: "Late Screen Time", emoji: "📱", genre: "Rest", blurb: "scrolling past bedtime" },
  { id: "t-sleep", name: "Early Night", emoji: "🌙", genre: "Rest", blurb: "tomorrow starts tonight" },
  { id: "t-sunrise", name: "Early Sunrise", emoji: "🌅", genre: "Wellness", blurb: "first light, first win" },
  { id: "t-nospend", name: "No-Spend Day", emoji: "💵", genre: "Other", blurb: "your wallet says thanks" },
  { id: "t-creative", name: "Creative Project", emoji: "🎨", genre: "Creative", blurb: "making something from nothing" },
  { id: "t-music", name: "Live Music", emoji: "🎸", genre: "Social", blurb: "louder is better" },
  { id: "t-sick", name: "Sick", emoji: "🤒", genre: "Health", blurb: "the body asks for a pause" },
  { id: "t-cozy", name: "Cozy", emoji: "🛋️", genre: "Mood", blurb: "warm drinks, soft lights" },
];

export interface GoalPreset {
  id: string;
  label: string;
  icon: string;
  /** Suggested weekly commitment that fulfils this goal. */
  suggestion: { tagId: string; label: string; perWeek: number };
  /** Tags that work against the goal — used to flag trade-offs. */
  avoid?: string[];
}

export const GOAL_PRESETS: GoalPreset[] = [
  { id: "g-strength", label: "Build strength", icon: "dumbbell", suggestion: { tagId: "t-strength", label: "Strength training", perWeek: 4 } },
  { id: "g-sleep", label: "Sleep deeper", icon: "moon", suggestion: { tagId: "t-sleep", label: "Early night", perWeek: 4 }, avoid: ["t-screen"] },
  { id: "g-fuel", label: "Fuel better", icon: "leaf", suggestion: { tagId: "t-protein", label: "High-protein meals", perWeek: 5 } },
  { id: "g-sugar", label: "Limit sugar", icon: "ban", suggestion: { tagId: "t-homecooked", label: "Home-cooked meals", perWeek: 4 }, avoid: ["t-sugar"] },
  { id: "g-focus", label: "Improve focus", icon: "crosshair", suggestion: { tagId: "t-focus", label: "Morning focus time", perWeek: 4 } },
  { id: "g-move", label: "Move more", icon: "footprints", suggestion: { tagId: "t-walk", label: "Daily walk", perWeek: 5 } },
  { id: "g-stress", label: "Reduce stress", icon: "wind", suggestion: { tagId: "t-meditation", label: "Meditate", perWeek: 4 } },
  { id: "g-connect", label: "Connect more", icon: "users", suggestion: { tagId: "t-social", label: "Social time", perWeek: 2 } },
  { id: "g-skills", label: "Grow skills", icon: "book", suggestion: { tagId: "t-reading", label: "Daily reading", perWeek: 5 } },
  { id: "g-money", label: "Manage money", icon: "banknote", suggestion: { tagId: "t-nospend", label: "No-spend day", perWeek: 3 } },
];

export const EMOJI_CHOICES = [
  "⭐", "❤️", "😊", "😴", "🎉", "🍕", "☕", "🏖️", "🏔️", "🚴", "🎮", "🎬", "📚", "🧠",
  "💪", "🐶", "🌧️", "☀️", "🍷", "🎵", "🛒", "🧹", "💻", "✍️", "🚗", "🏠", "🌳", "🙏",
];

/** Fixed colour per genre, so a genre keeps its colour whatever its rank. */
export const GENRE_COLORS: Record<string, string> = {
  Family: "#5ea0ff", Social: "#e8467c", Travel: "#4fd1c5", Adventure: "#4ade80", Fitness: "#f7a531",
  Wellness: "#b57bff", Food: "#f7c948", Work: "#8e8e93", Creative: "#ff7ab6", Learning: "#7c9cff",
  Rest: "#6f5bff", Health: "#ff5a4f", Mood: "#ffb38a", Other: "#636366",
};

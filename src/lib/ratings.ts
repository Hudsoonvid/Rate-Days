export interface Tier {
  key: "awesome" | "great" | "good" | "average" | "bad" | "garbage";
  label: string;
  min: number;
  color: string;
  /** Text colour that stays readable on top of `color`. */
  ink: string;
}

/** Ordered best → worst. A rating belongs to the first tier whose `min` it reaches. */
export const TIERS: Tier[] = [
  { key: "awesome", label: "Awesome", min: 9, color: "#3767f2", ink: "#ffffff" },
  { key: "great", label: "Great", min: 8, color: "#3fb950", ink: "#ffffff" },
  { key: "good", label: "Good", min: 7, color: "#f2c230", ink: "#3a2d00" },
  { key: "average", label: "Average", min: 5, color: "#f08a2e", ink: "#ffffff" },
  { key: "bad", label: "Bad", min: 3, color: "#e5483d", ink: "#ffffff" },
  { key: "garbage", label: "Garbage", min: 0, color: "#a23be0", ink: "#ffffff" },
];

export function tierFor(rating: number): Tier {
  return TIERS.find((t) => rating >= t.min) ?? TIERS[TIERS.length - 1];
}

export function colorFor(rating: number): string {
  return tierFor(rating).color;
}

export function roundRating(n: number): number {
  return Math.round(n * 10) / 10;
}

export function fmt(n: number): string {
  return roundRating(n).toFixed(1);
}

export function fmtDelta(n: number): string {
  const r = roundRating(n);
  return `${r >= 0 ? "+" : "−"}${Math.abs(r).toFixed(1)}`;
}

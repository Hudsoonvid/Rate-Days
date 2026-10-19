import { addDays, startOfWeek } from "./dates";
import { average } from "./stats";
import type { Commitment, Day, ISODate } from "./types";

/** Days in the Monday-start week containing `today` that carry the commitment's tag. */
export function weekCount(byDate: Record<ISODate, Day>, commitment: Commitment, today: ISODate): number {
  const start = startOfWeek(today);
  let n = 0;
  for (let i = 0; i < 7; i++) if (byDate[addDays(start, i)]?.tags.includes(commitment.tagId)) n++;
  return n;
}

/** Consecutive past weeks (ending last week, or this week if already hit) that met the target. */
export function weekStreak(byDate: Record<ISODate, Day>, commitment: Commitment, today: ISODate): number {
  let cursor = startOfWeek(today);
  let streak = weekCount(byDate, commitment, cursor) >= commitment.perWeek ? 1 : 0;
  for (let i = 0; i < 52; i++) {
    cursor = addDays(cursor, -7);
    if (weekCount(byDate, commitment, cursor) >= commitment.perWeek) streak++;
    else break;
  }
  return streak;
}

export interface CommitmentResult {
  withAvg: number;
  withoutAvg: number;
  withCount: number;
  withoutCount: number;
}

export function commitmentResult(days: Day[], commitment: Commitment): CommitmentResult {
  const withTag = days.filter((d) => d.tags.includes(commitment.tagId));
  const without = days.filter((d) => !d.tags.includes(commitment.tagId));
  return { withAvg: average(withTag), withoutAvg: average(without), withCount: withTag.length, withoutCount: without.length };
}

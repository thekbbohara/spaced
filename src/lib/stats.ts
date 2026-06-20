import { startOfDay } from './schedule';
import type { Topic } from './topics';

export type Stats = {
  streak: number; // consecutive days with study activity, ending today/yesterday
  totalReviews: number;
  accuracy: number; // 0-100, share of reviews recalled
  activeDays: number;
};

function dayKey(iso: string): number {
  return startOfDay(new Date(iso)).getTime();
}

export function computeStats(topics: Topic[], on: Date = new Date()): Stats {
  const active = new Set<number>();
  let totalReviews = 0;
  let remembered = 0;

  for (const t of topics) {
    active.add(dayKey(t.createdAt));
    for (const r of t.history) {
      active.add(dayKey(r.date));
      totalReviews += 1;
      if (r.remembered) remembered += 1;
    }
  }

  // Count back from today; allow the streak to "hold" if today isn't logged yet.
  const day = 86400000;
  let cursor = startOfDay(on).getTime();
  if (!active.has(cursor)) cursor -= day; // today not done yet — start from yesterday
  let streak = 0;
  while (active.has(cursor)) {
    streak += 1;
    cursor -= day;
  }

  return {
    streak,
    totalReviews,
    accuracy: totalReviews === 0 ? 0 : Math.round((remembered / totalReviews) * 100),
    activeDays: active.size,
  };
}

import type { GlowHistoryEntry } from './lifeMapGlowScheduler';
import type { ChapterId, MemoryStar } from './lifemapSceneLogic';

export type PatternType =
  | 'repeating-memory'
  | 'emotional-loop'
  | 'chapter-cluster'
  | 'unresolved-buildup'
  | 'cross-chapter-bridge';

export type PatternInsight = {
  id: string;
  type: PatternType;
  starIds: string[];
  chapterId: ChapterId | null;
  strength: number;
  message: string;
  createdAt: number;
};

export type PatternEngineOptions = {
  minRepeatCount?: number;
  minEmotionLoopCount?: number;
  minChapterClusterCount?: number;
  unresolvedThreshold?: number;
  minUnresolvedStars?: number;
};

const DEFAULT_OPTIONS: Required<PatternEngineOptions> = {
  minRepeatCount: 3,
  minEmotionLoopCount: 5,
  minChapterClusterCount: 5,
  unresolvedThreshold: 0.7,
  minUnresolvedStars: 3
};

function countRecent(history: GlowHistoryEntry[]): Record<string, number> {
  return history.reduce<Record<string, number>>((acc, entry) => {
    entry.ids.forEach((id) => {
      acc[id] = (acc[id] ?? 0) + 1;
    });
    return acc;
  }, {});
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function detectLifeMapPatterns(
  stars: MemoryStar[],
  history: GlowHistoryEntry[],
  options: PatternEngineOptions = {}
): PatternInsight[] {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const now = Date.now();
  const starById = new Map(stars.map((star) => [star.id, star]));
  const frequency = countRecent(history);
  const insights: PatternInsight[] = [];

  Object.entries(frequency).forEach(([starId, count]) => {
    const star = starById.get(starId);
    if (!star || count < config.minRepeatCount) return;
    insights.push({
      id: `repeat-${starId}`,
      type: 'repeating-memory',
      starIds: [starId],
      chapterId: star.chapterId,
      strength: count,
      message: 'This memory keeps returning.',
      createdAt: now
    });
  });

  const emotionCounts = new Map<string, string[]>();
  history.forEach((entry) => {
    entry.ids.forEach((id) => {
      const star = starById.get(id);
      if (!star) return;
      emotionCounts.set(star.emotion, [...(emotionCounts.get(star.emotion) ?? []), id]);
    });
  });

  emotionCounts.forEach((ids, emotion) => {
    if (ids.length < config.minEmotionLoopCount) return;
    insights.push({
      id: `emotion-${emotion}`,
      type: 'emotional-loop',
      starIds: unique(ids),
      chapterId: null,
      strength: ids.length,
      message: `A pattern of ${emotion} is forming.`,
      createdAt: now
    });
  });

  const chapterCounts = new Map<ChapterId, string[]>();
  history.forEach((entry) => {
    entry.ids.forEach((id) => {
      const star = starById.get(id);
      if (!star) return;
      chapterCounts.set(star.chapterId, [...(chapterCounts.get(star.chapterId) ?? []), id]);
    });
  });

  chapterCounts.forEach((ids, chapterId) => {
    if (ids.length < config.minChapterClusterCount) return;
    insights.push({
      id: `chapter-${chapterId}`,
      type: 'chapter-cluster',
      starIds: unique(ids),
      chapterId,
      strength: ids.length,
      message: 'This chapter is becoming active again.',
      createdAt: now
    });
  });

  const unresolved = stars.filter((star) => star.state !== 'resolved' && star.unresolvedWeight >= config.unresolvedThreshold);
  if (unresolved.length >= config.minUnresolvedStars) {
    insights.push({
      id: 'unresolved-buildup',
      type: 'unresolved-buildup',
      starIds: unresolved.map((star) => star.id),
      chapterId: null,
      strength: unresolved.length,
      message: 'Unresolved memories are accumulating.',
      createdAt: now
    });
  }

  const recentlyActiveChapters = unique(
    history.flatMap((entry) => entry.ids)
      .map((id) => starById.get(id)?.chapterId)
      .filter((chapterId): chapterId is ChapterId => Boolean(chapterId))
  );

  if (recentlyActiveChapters.length >= 3) {
    insights.push({
      id: `cross-chapter-${recentlyActiveChapters.join('-')}`,
      type: 'cross-chapter-bridge',
      starIds: unique(history.flatMap((entry) => entry.ids)),
      chapterId: null,
      strength: recentlyActiveChapters.length,
      message: 'Different life chapters are starting to connect.',
      createdAt: now
    });
  }

  return insights.sort((a, b) => b.strength - a.strength).slice(0, 4);
}

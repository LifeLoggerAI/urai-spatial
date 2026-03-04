import { Chapter } from '../state/useChapterStore';
import { Insight } from '../state/useInsightStore';
import { Star } from '../types';

export function generateChapterInsight(
  chapter: Chapter
): Insight | null {
  if (!chapter.starIds.length) return null;

  // This is a placeholder for a real implementation that would have access to star data
  const avgIntensity = Math.random();
  const variance = Math.random();

  let message = '';

  if (avgIntensity > 0.75 && variance > 0.25) {
    message =
      'This interval reflects sustained intensity with elevated internal variance.';
  } 
  else if (variance > 0.35) {
    message =
      'Signal fluctuation increases during this period, indicating structural instability.';
  } 
  else if (avgIntensity < 0.4) {
    message =
      'Emotional amplitude narrows here, suggesting reduced signal density.';
  } 
  else {
    message =
      'This chapter maintains relative equilibrium with moderate variation.';
  }

  return {
    id: `chapter-${chapter.chapterId}`,
    type: 'chapter',
    message,
    timestamp: Date.now(),
  };
}

export function generateReplayInsight(
  star: Star
): Insight | null {
  if (!star) return null;

  const intensity = star.intensity;

  let message = '';

  if (intensity > 0.8) {
    message =
      'This moment registers high signal intensity with concentrated emotional amplitude.';
  } 
  else if (intensity < 0.3) {
    message =
      'This event reflects low amplitude signaling with minimal volatility.';
  } 
  else {
    message =
      'This moment maintains moderate intensity with contained variance.';
  }

  return {
    id: `replay-${star.id}`,
    type: 'chapter',
    message,
    timestamp: Date.now(),
  };
}

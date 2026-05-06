export type MemoryEmotion = 'calm' | 'joy' | 'grief' | 'focus' | 'threshold' | 'recovery' | 'dream' | 'mirror' | 'shadow';
export type ChapterId = 'season-of-becoming' | 'threshold' | 'recovery-arc' | 'purple-dream-field' | 'mirror-of-becoming';
export type LifeMapPhase = 'living' | 'focus' | 'cluster' | 'playback';

export type NarratorDetail = {
  event: 'lifemap.star.glow' | 'lifemap.star.focus' | 'lifemap.cluster.focus' | 'lifemap.star.resolved' | 'lifemap.replay.tick' | 'lifemap.replay.scrub';
  starId?: string | null;
  chapterId?: ChapterId | null;
  emotion?: MemoryEmotion | null;
  action?: 'replay' | 'reflect' | 'resolve' | 'scrub' | 'play' | 'stop';
  line?: string | null;
};

export function dispatchNarratorEvent(detail: NarratorDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('urai:narrator', { detail: { ...detail, timestamp: Date.now() } }));
}

export function dispatchTimelineSyncEvent(detail: { phase: LifeMapPhase; activeStarId?: string | null; activeChapterId?: ChapterId | null; playbackIndex?: number | null }) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('urai:timeline-sync', { detail: { mode: 'lifemap', ...detail, timestamp: Date.now() } }));
}

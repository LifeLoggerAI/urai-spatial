export type MemoryEmotion = 'calm' | 'joy' | 'grief' | 'focus' | 'threshold' | 'recovery' | 'dream' | 'mirror' | 'shadow';
export type ChapterId = 'season-of-becoming' | 'threshold' | 'recovery-arc' | 'purple-dream-field' | 'mirror-of-becoming';
export type LifeMapPhase = 'living' | 'focus' | 'cluster';

type NarratorBase = { timestamp: number };

type NarratorGlow = NarratorBase & {
  event: 'lifemap.star.glow';
  starId: string;
  chapterId: ChapterId | null;
  emotion: MemoryEmotion | null;
  action?: never;
};

type NarratorFocus = NarratorBase & {
  event: 'lifemap.star.focus';
  starId: string;
  chapterId: ChapterId;
  emotion: MemoryEmotion;
  action?: 'replay' | 'reflect';
};

type NarratorClusterFocus = NarratorBase & {
  event: 'lifemap.cluster.focus';
  starId?: never;
  chapterId: ChapterId;
  emotion?: never;
  action?: never;
};

type NarratorResolved = NarratorBase & {
  event: 'lifemap.star.resolved';
  starId: string;
  chapterId: ChapterId;
  emotion: MemoryEmotion;
  action: 'resolve';
};

export type NarratorEventDetail = NarratorGlow | NarratorFocus | NarratorClusterFocus | NarratorResolved;

export type TimelineSyncDetail = {
  mode: 'lifemap';
  phase: LifeMapPhase;
  activeStarId: string | null;
  activeChapterId: ChapterId | null;
  timestamp: number;
};

export function createNarratorDetail(detail: Omit<NarratorGlow, 'timestamp'>): NarratorGlow;
export function createNarratorDetail(detail: Omit<NarratorFocus, 'timestamp'>): NarratorFocus;
export function createNarratorDetail(detail: Omit<NarratorClusterFocus, 'timestamp'>): NarratorClusterFocus;
export function createNarratorDetail(detail: Omit<NarratorResolved, 'timestamp'>): NarratorResolved;
export function createNarratorDetail(detail: Omit<NarratorEventDetail, 'timestamp'>): NarratorEventDetail {
  return { ...detail, timestamp: Date.now() };
}

export function createTimelineSyncDetail(detail: Pick<TimelineSyncDetail, 'phase'> & Partial<Pick<TimelineSyncDetail, 'activeStarId' | 'activeChapterId'>>): TimelineSyncDetail {
  return {
    mode: 'lifemap',
    phase: detail.phase,
    activeStarId: detail.activeStarId ?? null,
    activeChapterId: detail.activeChapterId ?? null,
    timestamp: Date.now(),
  };
}

export function dispatchNarratorEvent(detail: Omit<NarratorEventDetail, 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('urai:narrator', { detail: createNarratorDetail(detail) }));
}

export function dispatchTimelineSyncEvent(detail: Pick<TimelineSyncDetail, 'phase'> & Partial<Pick<TimelineSyncDetail, 'activeStarId' | 'activeChapterId'>>): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('urai:timeline-sync', { detail: createTimelineSyncDetail(detail) }));
}

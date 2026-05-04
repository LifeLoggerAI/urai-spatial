export type LifeMapStarState = 'idle' | 'glowing' | 'active' | 'resolved';
export type LifeMapEmotion = 'calm' | 'joy' | 'grief' | 'focus' | 'threshold' | 'recovery' | 'dream' | 'mirror' | 'shadow';
export type LifeMapChapterId = 'season-of-becoming' | 'threshold' | 'recovery-arc' | 'purple-dream-field' | 'mirror-of-becoming';

export type LifeMapStarDocument = {
  title: string;
  x: number;
  y: number;
  size: number;
  emotion: LifeMapEmotion;
  chapterId: LifeMapChapterId;
  state: LifeMapStarState;
  intensity: number;
  recency: number;
  unresolvedWeight: number;
  lastActivatedAt: number | null;
  narratorLine: string;
  connectedTo: string[];
  updatedAt?: unknown;
};

export type LifeMapEventDocument = {
  source: 'LifeMapScene';
  eventType: string;
  starId: string | null;
  chapterId: LifeMapChapterId | null;
  emotion: LifeMapEmotion | null;
  timestamp: number;
  createdAt?: unknown;
};

export type LifeMapNarratorEventDocument = LifeMapEventDocument & {
  action?: 'replay' | 'reflect' | 'resolve';
};

export type LifeMapReplaySessionDocument = {
  source: 'LifeMapScene';
  starId: string;
  chapterId: LifeMapChapterId;
  startedAt: number;
  endedAt?: number | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type LifeMapStoryPathDocument = {
  title: string;
  description?: string;
  starIds: string[];
  chapterId?: LifeMapChapterId;
  narratorLine?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const CHAPTER_IDS = new Set<LifeMapChapterId>([
  'season-of-becoming',
  'threshold',
  'recovery-arc',
  'purple-dream-field',
  'mirror-of-becoming',
]);

const EMOTIONS = new Set<LifeMapEmotion>([
  'calm',
  'joy',
  'grief',
  'focus',
  'threshold',
  'recovery',
  'dream',
  'mirror',
  'shadow',
]);

const STAR_STATES = new Set<LifeMapStarState>(['idle', 'glowing', 'active', 'resolved']);

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function parseLifeMapStarDocument(id: string, raw: Record<string, unknown>) {
  const chapterId = typeof raw.chapterId === 'string' && CHAPTER_IDS.has(raw.chapterId as LifeMapChapterId)
    ? raw.chapterId as LifeMapChapterId
    : null;
  const emotion = typeof raw.emotion === 'string' && EMOTIONS.has(raw.emotion as LifeMapEmotion)
    ? raw.emotion as LifeMapEmotion
    : null;
  if (!chapterId || !emotion) return null;

  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title : id;
  const state = typeof raw.state === 'string' && STAR_STATES.has(raw.state as LifeMapStarState)
    ? raw.state as LifeMapStarState
    : 'idle';
  const connectedTo = Array.isArray(raw.connectedTo)
    ? raw.connectedTo.filter((value): value is string => typeof value === 'string')
    : [];

  return {
    id,
    title,
    x: finiteNumber(raw.x, 50),
    y: finiteNumber(raw.y, 50),
    size: finiteNumber(raw.size, 18),
    emotion,
    chapterId,
    state,
    intensity: finiteNumber(raw.intensity, 0.5),
    recency: finiteNumber(raw.recency, 0.5),
    unresolvedWeight: finiteNumber(raw.unresolvedWeight, 0.5),
    lastActivatedAt: typeof raw.lastActivatedAt === 'number' ? raw.lastActivatedAt : null,
    narratorLine: typeof raw.narratorLine === 'string' ? raw.narratorLine : `${title} carries a thread that still matters.`,
    connectedTo,
  };
}

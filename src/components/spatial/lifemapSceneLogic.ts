import type { MemoryEmotion, StarState } from './lifeMapGlowScheduler';
import { chooseGlowingStars, scoreGlowCandidate } from './lifeMapGlowScheduler';

export type { MemoryEmotion, StarState } from './lifeMapGlowScheduler';

export type ChapterId =
  | 'season-of-becoming'
  | 'threshold'
  | 'recovery-arc'
  | 'purple-dream-field'
  | 'mirror-of-becoming';

export type LifeMapPhase = 'living' | 'focus' | 'cluster';
export type LifeMapCamera = { x: number; y: number; zoom: number };

export type MemoryStar = {
  id: string;
  title: string;
  x: number;
  y: number;
  size: number;
  emotion: MemoryEmotion;
  chapterId: ChapterId;
  state: StarState;
  intensity: number;
  recency: number;
  unresolvedWeight: number;
  lastActivatedAt: number | null;
  narratorLine: string;
  connectedTo: string[];
};

export type ChapterMeta = { id: ChapterId; title: string; subtitle: string };

export const CHAPTERS = [
  { id: 'season-of-becoming', title: 'The Season of Becoming', subtitle: 'memory / calm / clarity' },
  { id: 'threshold', title: 'The Threshold', subtitle: 'conflict / shadow / pain' },
  { id: 'recovery-arc', title: 'The Recovery Arc', subtitle: 'recovery / growth / purpose' },
  { id: 'purple-dream-field', title: 'The Purple Dream Field', subtitle: 'dream / mystery / milestone' },
  { id: 'mirror-of-becoming', title: 'Mirror of Becoming', subtitle: 'rebirth / clarity / purpose' }
] satisfies ReadonlyArray<ChapterMeta>;

export const CHAPTER_LINES: Record<ChapterId, string> = {
  'season-of-becoming': 'This season is asking to be understood.',
  threshold: 'The threshold is where the pattern became visible.',
  'recovery-arc': 'The recovery arc is still growing.',
  'purple-dream-field': 'The dream field is speaking in symbols.',
  'mirror-of-becoming': 'The mirror is showing who you are becoming.'
};

export const GLOW_LINES = [
  'Something is asking to be seen.',
  'This memory is carrying weight.',
  'A pattern is lighting up.',
  'This moment connects to something older.'
] as const;

const STAR_SEED: Array<[string, number, number, ChapterId, MemoryEmotion]> = [
  ['M', 16, 22, 'season-of-becoming', 'calm'],
  ['D', 28, 19, 'season-of-becoming', 'joy'],
  ['I', 22, 34, 'season-of-becoming', 'focus'],
  ['S', 37, 30, 'threshold', 'shadow'],
  ['R', 48, 24, 'threshold', 'grief'],
  ['T', 56, 31, 'threshold', 'threshold'],
  ['E', 65, 20, 'recovery-arc', 'recovery'],
  ['L', 72, 28, 'recovery-arc', 'focus'],
  ['V', 79, 37, 'recovery-arc', 'joy'],
  ['H', 68, 44, 'purple-dream-field', 'dream'],
  ['A', 58, 47, 'purple-dream-field', 'mirror'],
  ['N', 46, 43, 'purple-dream-field', 'dream'],
  ['K', 34, 45, 'threshold', 'shadow'],
  ['P', 24, 50, 'season-of-becoming', 'calm'],
  ['O', 14, 43, 'season-of-becoming', 'focus'],
  ['Y', 19, 63, 'mirror-of-becoming', 'mirror'],
  ['C', 31, 68, 'mirror-of-becoming', 'recovery'],
  ['B', 44, 66, 'mirror-of-becoming', 'joy'],
  ['F', 56, 63, 'mirror-of-becoming', 'focus'],
  ['G', 67, 66, 'mirror-of-becoming', 'mirror'],
  ['Q', 79, 61, 'recovery-arc', 'recovery'],
  ['U', 87, 50, 'recovery-arc', 'focus'],
  ['W', 86, 33, 'purple-dream-field', 'dream'],
  ['J', 10, 58, 'threshold', 'grief']
];

export const INITIAL_STARS: MemoryStar[] = STAR_SEED.map(([title, x, y, chapterId, emotion], idx, all) => ({
  id: `star-${title}-${idx}`,
  title,
  x,
  y,
  size: 16 + (idx % 5),
  emotion,
  chapterId,
  state: 'idle',
  intensity: 0.4 + ((idx * 7) % 6) / 10,
  recency: 0.3 + ((idx * 3) % 7) / 10,
  unresolvedWeight: 0.2 + ((idx * 5) % 8) / 10,
  lastActivatedAt: null,
  narratorLine: `${title} carries a thread that still matters.`,
  connectedTo: [
    `star-${all[(idx + 1) % all.length][0]}-${(idx + 1) % all.length}`,
    `star-${all[(idx + 5) % all.length][0]}-${(idx + 5) % all.length}`
  ]
}));

export function computeChapterCamera(stars: MemoryStar[], chapterId: ChapterId): LifeMapCamera {
  const cluster = stars.filter((star) => star.chapterId === chapterId);
  if (!cluster.length) return { x: 50, y: 50, zoom: 1.3 };

  const x = cluster.reduce((sum, star) => sum + star.x, 0) / cluster.length;
  const y = cluster.reduce((sum, star) => sum + star.y, 0) / cluster.length;
  const minX = Math.min(...cluster.map((star) => star.x));
  const maxX = Math.max(...cluster.map((star) => star.x));
  const minY = Math.min(...cluster.map((star) => star.y));
  const maxY = Math.max(...cluster.map((star) => star.y));
  const spread = Math.max(maxX - minX, maxY - minY);
  const zoom = spread > 34 ? 1.2 : spread > 24 ? 1.35 : 1.45;

  return { x, y, zoom };
}

export function getStateClasses(state: StarState, connected: boolean, chapterFocused: boolean, dimmed: boolean): string {
  return [
    'memory-star',
    `state-${state}`,
    connected ? 'is-connected' : '',
    chapterFocused ? 'is-chapter-focused' : '',
    dimmed ? 'is-dimmed' : ''
  ].filter(Boolean).join(' ');
}

export function reducedMotionLoopDelay(reducedMotion: boolean, rng: () => number = Math.random): number {
  return reducedMotion ? 14000 : 8000 + Math.floor(rng() * 6000);
}

export function clampCamera(camera: LifeMapCamera): LifeMapCamera {
  return {
    x: Math.min(100, Math.max(0, camera.x)),
    y: Math.min(100, Math.max(0, camera.y)),
    zoom: Math.min(2.25, Math.max(0.8, camera.zoom))
  };
}

export function scoreStarForGlow(star: MemoryStar): number {
  return scoreGlowCandidate(star, 0, {}, {});
}

export function pickGlowingStars(stars: MemoryStar[], activeStarId: string | null, rng: () => number = Math.random): string[] {
  const candidates = stars.filter((star) => star.id !== activeStarId);
  return chooseGlowingStars(candidates, [], {
    count: Math.min(3, Math.max(1, candidates.filter((star) => star.state !== 'resolved').length)),
    tick: 0,
    minTicksBetweenGlows: 0,
    repeatWindowTicks: 1,
    maxRepeatsPerWindow: 3
  }, rng);
}

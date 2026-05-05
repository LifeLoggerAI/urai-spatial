export type StarState = 'idle' | 'glowing' | 'active' | 'resolved';
export type MemoryEmotion = 'calm' | 'joy' | 'grief' | 'focus' | 'threshold' | 'recovery' | 'dream' | 'mirror' | 'shadow';
export type ChapterId = 'season-of-becoming' | 'threshold' | 'recovery-arc' | 'purple-dream-field' | 'mirror-of-becoming';
export type MemoryStar = { id: string; title: string; x: number; y: number; size: number; emotion: MemoryEmotion; chapterId: ChapterId; state: StarState; intensity: number; recency: number; unresolvedWeight: number; lastActivatedAt: number | null; narratorLine: string; connectedTo: string[] };
export type LifeMapPhase = 'living' | 'focus' | 'cluster';
export type LifeMapCamera = { x: number; y: number; zoom: number };

const eScore: Record<MemoryEmotion, number> = { threshold: 3, grief: 2.5, recovery: 2, shadow: 2, mirror: 1.5, dream: 1.25, calm: 1, joy: 1, focus: 1 };

export function scoreStarForGlow(star: MemoryStar): number {
  return 1 + star.recency * 2 + star.intensity * 2 + star.unresolvedWeight * 3 + eScore[star.emotion] - (star.state === 'resolved' ? 4 : 0);
}

export function pickGlowingStars(stars: MemoryStar[], activeStarId: string | null, random: () => number): string[] {
  const pool = stars.filter((s) => s.id !== activeStarId);
  const count = 1 + Math.floor(random() * 3);
  const top = pool.map((s) => ({ id: s.id, score: scoreStarForGlow(s) })).sort((a, b) => b.score - a.score).slice(0, Math.max(4, count * 2));
  return top.sort(() => random() - 0.5).slice(0, count).map((s) => s.id);
}

export function computeChapterCamera(stars: MemoryStar[], chapterId: ChapterId): LifeMapCamera {
  const inChapter = stars.filter((s) => s.chapterId === chapterId);
  const x = inChapter.reduce((a, s) => a + s.x, 0) / inChapter.length;
  const y = inChapter.reduce((a, s) => a + s.y, 0) / inChapter.length;
  return { x, y, zoom: 1.45 };
}

export function reducedMotionLoopDelay(reducedMotion: boolean, random: () => number): number {
  return reducedMotion ? 14000 : 8000 + Math.floor(random() * 6000);
}

export function getStateClasses(state: StarState, isConnected: boolean, isChapterFocused: boolean, isDimmed: boolean): string {
  return `memory-star state-${state} ${isConnected ? 'is-connected' : ''} ${isChapterFocused ? 'is-chapter-focused' : ''} ${isDimmed ? 'is-dimmed' : ''}`;
}

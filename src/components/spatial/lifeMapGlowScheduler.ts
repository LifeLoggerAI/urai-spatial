export type StarState = 'idle' | 'glowing' | 'active' | 'resolved';
export type MemoryEmotion = 'calm' | 'joy' | 'grief' | 'focus' | 'threshold' | 'recovery' | 'dream' | 'mirror' | 'shadow';

export type GlowCandidate = {
  id: string;
  state: StarState;
  emotion: MemoryEmotion;
  recency: number;
  intensity: number;
  unresolvedWeight: number;
  lastActivatedAt: number | null;
};

export type GlowHistoryEntry = { tick: number; ids: string[] };

export type GlowSchedulerConfig = {
  count: number;
  tick: number;
  minTicksBetweenGlows: number;
  repeatWindowTicks: number;
  maxRepeatsPerWindow: number;
};

export type RandomFn = () => number;

const EMOTION_SCORE: Record<MemoryEmotion, number> = { threshold: 3.2, grief: 2.6, recovery: 2.4, shadow: 2.2, mirror: 1.7, dream: 1.4, calm: 1, joy: 1, focus: 1.1 };

export function scoreGlowCandidate(star: GlowCandidate, nowTick: number, cooldownById: Record<string, number>, recentGlowCountById: Record<string, number>): number {
  if (star.state === 'resolved') return -1000;
  const unresolvedBias = star.unresolvedWeight * 3.2;
  const recoveryBias = star.emotion === 'recovery' || star.emotion === 'threshold' ? 1.25 : 0;
  const cooldownPenalty = (cooldownById[star.id] ?? 0) > nowTick ? 8 : 0;
  const repeatPenalty = (recentGlowCountById[star.id] ?? 0) * 1.4;
  const stalenessBoost = star.lastActivatedAt == null ? 1.2 : Math.min(2.2, (nowTick - star.lastActivatedAt) * 0.03);
  return 1 + star.recency * 1.8 + star.intensity * 1.9 + unresolvedBias + EMOTION_SCORE[star.emotion] + recoveryBias + stalenessBoost - cooldownPenalty - repeatPenalty;
}

export function pickWeightedWithoutReplacement(idsWithScore: Array<{ id: string; score: number }>, count: number, rng: RandomFn): string[] {
  const pool = idsWithScore.filter((s) => s.score > 0);
  const chosen: string[] = [];
  while (pool.length > 0 && chosen.length < count) {
    const total = pool.reduce((a, b) => a + b.score, 0);
    const pick = rng() * total;
    let cursor = 0;
    let index = 0;
    for (; index < pool.length; index += 1) {
      cursor += pool[index].score;
      if (pick <= cursor) break;
    }
    const selected = pool.splice(Math.min(index, pool.length - 1), 1)[0];
    chosen.push(selected.id);
  }
  return chosen;
}

export function chooseGlowingStars(stars: GlowCandidate[], history: GlowHistoryEntry[], config: GlowSchedulerConfig, rng: RandomFn): string[] {
  const windowStart = config.tick - config.repeatWindowTicks + 1;
  const recent = history.filter((h) => h.tick >= windowStart);
  const recentGlowCountById: Record<string, number> = {};
  recent.forEach((h) => h.ids.forEach((id) => { recentGlowCountById[id] = (recentGlowCountById[id] ?? 0) + 1; }));

  const cooldownById: Record<string, number> = {};
  history.forEach((h) => h.ids.forEach((id) => { cooldownById[id] = Math.max(cooldownById[id] ?? -Infinity, h.tick + config.minTicksBetweenGlows); }));

  const scored = stars.map((star) => ({
    id: star.id,
    score: (recentGlowCountById[star.id] ?? 0) >= config.maxRepeatsPerWindow ? -1000 : scoreGlowCandidate(star, config.tick, cooldownById, recentGlowCountById),
  }));

  const unresolved = stars.filter((s) => s.state !== 'resolved');
  const unresolvedIds = new Set(unresolved.map((s) => s.id));
  const unresolvedScored = scored.filter((s) => unresolvedIds.has(s.id)).sort((a, b) => b.score - a.score);
  const topUnresolved = unresolvedScored.slice(0, Math.max(config.count * 3, 6));
  return pickWeightedWithoutReplacement(topUnresolved, config.count, rng);
}

export function createSeededRandom(seed = 42013): RandomFn {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

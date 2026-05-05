import type { PatternInsight } from './lifeMapPatternEngine';
import type { ChapterId, MemoryEmotion } from './lifemapSceneLogic';

export type PersistentInsightStatus = 'new' | 'active' | 'resolved' | 'archived';
export type PersistentInsightSeverity = 'low' | 'medium' | 'high';

export type PersistentInsight = {
  id: string;
  patternId: string;
  type: PatternInsight['type'];
  status: PersistentInsightStatus;
  severity: PersistentInsightSeverity;
  chapterId: ChapterId | null;
  emotion: MemoryEmotion | null;
  starIds: string[];
  strength: number;
  recurrenceCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
  message: string;
  narratorSummary: string;
  evidence: Array<{
    at: number;
    strength: number;
    starIds: string[];
  }>;
};

export type InsightLedgerState = {
  insights: PersistentInsight[];
  updatedAt: number | null;
};

export const EMPTY_INSIGHT_LEDGER: InsightLedgerState = {
  insights: [],
  updatedAt: null,
};

function severityFor(strength: number): PersistentInsightSeverity {
  if (strength >= 7) return 'high';
  if (strength >= 4) return 'medium';
  return 'low';
}

function createNarratorSummary(pattern: PatternInsight): string {
  switch (pattern.type) {
    case 'repeating-memory':
      return 'A memory is returning often enough that it may be asking for attention.';
    case 'emotional-loop':
      return 'An emotion is repeating across the map and may be forming a loop.';
    case 'chapter-cluster':
      return 'A life chapter is becoming active again.';
    case 'unresolved-buildup':
      return 'Several unresolved memories are accumulating at the same time.';
    case 'cross-chapter-bridge':
      return 'Different life chapters are starting to connect into one larger pattern.';
  }
}

export function mergePatternInsights(
  ledger: InsightLedgerState,
  patterns: PatternInsight[],
  emotionByStarId: Record<string, MemoryEmotion | null> = {}
): InsightLedgerState {
  if (!patterns.length) return ledger;

  const now = Date.now();
  const byPatternId = new Map(ledger.insights.map((insight) => [insight.patternId, insight]));

  patterns.forEach((pattern) => {
    const existing = byPatternId.get(pattern.id);
    const emotion = pattern.starIds.map((id) => emotionByStarId[id]).find(Boolean) ?? null;

    if (!existing) {
      byPatternId.set(pattern.id, {
        id: `insight-${pattern.id}`,
        patternId: pattern.id,
        type: pattern.type,
        status: 'new',
        severity: severityFor(pattern.strength),
        chapterId: pattern.chapterId,
        emotion,
        starIds: pattern.starIds,
        strength: pattern.strength,
        recurrenceCount: 1,
        firstSeenAt: pattern.createdAt || now,
        lastSeenAt: now,
        message: pattern.message,
        narratorSummary: createNarratorSummary(pattern),
        evidence: [{ at: now, strength: pattern.strength, starIds: pattern.starIds }],
      });
      return;
    }

    byPatternId.set(pattern.id, {
      ...existing,
      status: existing.status === 'resolved' ? 'resolved' : 'active',
      severity: severityFor(Math.max(existing.strength, pattern.strength)),
      chapterId: pattern.chapterId ?? existing.chapterId,
      emotion: emotion ?? existing.emotion,
      starIds: Array.from(new Set([...existing.starIds, ...pattern.starIds])),
      strength: Math.max(existing.strength, pattern.strength),
      recurrenceCount: existing.recurrenceCount + 1,
      lastSeenAt: now,
      message: pattern.message,
      narratorSummary: createNarratorSummary(pattern),
      evidence: [...existing.evidence.slice(-9), { at: now, strength: pattern.strength, starIds: pattern.starIds }],
    });
  });

  return {
    insights: Array.from(byPatternId.values()).sort((a, b) => b.lastSeenAt - a.lastSeenAt).slice(0, 80),
    updatedAt: now,
  };
}

export function serializeInsightLedger(ledger: InsightLedgerState): string {
  return JSON.stringify(ledger);
}

export function parseInsightLedger(value: string | null): InsightLedgerState {
  if (!value) return EMPTY_INSIGHT_LEDGER;
  try {
    const parsed = JSON.parse(value) as InsightLedgerState;
    if (!Array.isArray(parsed.insights)) return EMPTY_INSIGHT_LEDGER;
    return parsed;
  } catch {
    return EMPTY_INSIGHT_LEDGER;
  }
}

export function getInsightStorageKey(userId = 'local'): string {
  return `urai:spatial:insight-ledger:${userId}`;
}

export function shouldSurfacePersistentInsight(insight: PersistentInsight): boolean {
  return insight.status !== 'resolved' && (insight.severity !== 'low' || insight.recurrenceCount >= 2);
}

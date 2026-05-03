import type { PassiveEvent, TodayInsightCache, UraiInsight, UserBaseline } from "./types";
import { buildStateWindows } from "./windowing";
import { detectPostCallEnergyDrop } from "./detectors/postCallEnergyDrop";
import { detectDigitalAgitationSpike } from "./detectors/digitalAgitationSpike";
import { detectFocusBurst } from "./detectors/focusBurst";
import { detectSocialDrainPattern } from "./detectors/socialDrainPattern";
import { detectRecoveryRebound } from "./detectors/recoveryRebound";
import { applySuppressionRules, type SuppressionContext } from "./suppression";
import { rankForLifeMap, shouldSaveToLifeMap } from "./lifeMapRanking";
import { buildProofDrawer } from "./proofDrawer";

function dateKey(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export function runPrecomputedInsightEngine(
  userId: string,
  events: PassiveEvent[],
  baseline: UserBaseline,
  suppressionContext?: Partial<SuppressionContext>
): TodayInsightCache {
  const windows = buildStateWindows(events, baseline);

  const candidates = [
    ...detectPostCallEnergyDrop(events, windows, baseline),
    ...detectDigitalAgitationSpike(windows, baseline),
    ...detectFocusBurst(windows, baseline),
    ...detectSocialDrainPattern(events, windows, baseline),
    ...detectRecoveryRebound(windows, baseline),
  ];

  const filtered = applySuppressionRules(candidates, {
    trustScore: baseline.trustScore ?? 0.25,
    ...suppressionContext,
  });

  const ranked = rankForLifeMap(filtered);

  const insightQueue: UraiInsight[] = ranked.map(candidate => ({
    ...candidate,
    createdAt: Date.now(),
    savedToLifeMap: shouldSaveToLifeMap(candidate),
    lifeMapStarId: shouldSaveToLifeMap(candidate) ? `star_${candidate.id}` : undefined,
    proofDrawer: buildProofDrawer(candidate),
  }));

  return {
    userId,
    dateKey: dateKey(),
    topInsight: insightQueue[0],
    insightQueue,
    updatedAt: Date.now(),
  };
}

export async function loadTopInsight(userId: string): Promise<UraiInsight | undefined> {
  void userId;
  return undefined;
}

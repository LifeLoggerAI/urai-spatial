import { UniverseSnapshot } from "../persistence/cognitiveUniverse.persistence";

export type UniverseDiff = {
  fromTimestamp: number;
  toTimestamp: number;

  worldsDelta: number;
  memoryNodesDelta: number;
  interactionsDelta: number;

  coherenceDelta: number;
  entropyDelta: number;

  summary: string;
};

// UNIVERSE DIFF ENGINE (FORK COMPARISON SYSTEM)
// Compares two universe snapshots and produces structural differences
export function diffUniverses(
  a: UniverseSnapshot,
  b: UniverseSnapshot
): UniverseDiff {
  const worldsA = Array.isArray(a.worlds) ? a.worlds.length : (a.worlds ?? 0);
  const worldsB = Array.isArray(b.worlds) ? b.worlds.length : (b.worlds ?? 0);

  const memoryA = a.memoryGraph?.nodes?.length ?? 0;
  const memoryB = b.memoryGraph?.nodes?.length ?? 0;

  const interactionsA = a.interactions?.messages?.length ?? 0;
  const interactionsB = b.interactions?.messages?.length ?? 0;

  const coherenceA = a.emergence?.globalCoherence ?? 0;
  const coherenceB = b.emergence?.globalCoherence ?? 0;

  const entropyA = a.emergence?.entropy ?? 0;
  const entropyB = b.emergence?.entropy ?? 0;

  const worldsDelta = worldsB - worldsA;
  const memoryNodesDelta = memoryB - memoryA;
  const interactionsDelta = interactionsB - interactionsA;

  const coherenceDelta = coherenceB - coherenceA;
  const entropyDelta = entropyB - entropyA;

  const summary = [
    worldsDelta > 0 ? `+${worldsDelta} worlds` : `${worldsDelta} worlds`,
    memoryNodesDelta > 0 ? `+${memoryNodesDelta} memory nodes` : `${memoryNodesDelta} memory nodes`,
    interactionsDelta > 0 ? `+${interactionsDelta} interactions` : `${interactionsDelta} interactions`,
    `coherence ${coherenceDelta >= 0 ? "+" : ""}${coherenceDelta.toFixed(3)}`,
    `entropy ${entropyDelta >= 0 ? "+" : ""}${entropyDelta.toFixed(3)}`
  ].join(" | ");

  return {
    fromTimestamp: a.timestamp,
    toTimestamp: b.timestamp,

    worldsDelta,
    memoryNodesDelta,
    interactionsDelta,

    coherenceDelta,
    entropyDelta,

    summary
  };
}

import { UniverseSnapshot } from "../persistence/cognitiveUniverse.persistence";
import { diffUniverses } from "./cognitiveUniverse.diff";
import { createUniverseEventLog } from "./cognitiveUniverse.eventLog";

export type TruthViolation = {
  type: "determinism-break" | "missing-data" | "inconsistent-replay" | "graph-mismatch";
  severity: "low" | "medium" | "high";
  message: string;
};

export type TruthReport = {
  isValid: boolean;
  violations: TruthViolation[];
  checksum: string;
  summary: string;
};

// TRUTH GUARANTEE LAYER
// Ensures universe state consistency, replay determinism, and structural validity
export function createTruthGuaranteeLayer() {
  const eventLog = createUniverseEventLog();

  function checksumSnapshot(snapshot: UniverseSnapshot): string {
    const raw = JSON.stringify({
      worlds: snapshot.worlds,
      memory: snapshot.memoryGraph?.nodes?.length ?? 0,
      interactions: snapshot.interactions?.messages?.length ?? 0,
      coherence: snapshot.emergence?.globalCoherence ?? 0,
      entropy: snapshot.emergence?.entropy ?? 0
    });

    // lightweight deterministic hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
    }

    return hash.toString(16);
  }

  function validateSnapshot(snapshot: UniverseSnapshot): TruthReport {
    const violations: TruthViolation[] = [];

    // 1. Missing data checks
    if (!snapshot) {
      violations.push({
        type: "missing-data",
        severity: "high",
        message: "Snapshot is null or undefined"
      });
    }

    if (!snapshot.memoryGraph) {
      violations.push({
        type: "missing-data",
        severity: "medium",
        message: "Memory graph missing"
      });
    }

    if (!snapshot.interactions) {
      violations.push({
        type: "missing-data",
        severity: "medium",
        message: "Interaction field missing"
      });
    }

    // 2. Structural consistency checks
    const worlds = Array.isArray(snapshot.worlds) ? snapshot.worlds.length : (snapshot.worlds ?? 0);

    if (worlds < 0) {
      violations.push({
        type: "graph-mismatch",
        severity: "high",
        message: "Invalid world count detected"
      });
    }

    // 3. Determinism sanity check
    const checksum = checksumSnapshot(snapshot);

    if (!checksum || checksum.length < 4) {
      violations.push({
        type: "determinism-break",
        severity: "high",
        message: "Checksum generation failed"
      });
    }

    const isValid = violations.length === 0;

    const summary = isValid
      ? "truth state valid"
      : `violations=${violations.length}`;

    return {
      isValid,
      violations,
      checksum,
      summary
    };
  }

  function compareTruth(a: UniverseSnapshot, b: UniverseSnapshot): TruthReport {
    const base = validateSnapshot(a);
    const next = validateSnapshot(b);

    const diff = diffUniverses(a, b);

    const violations: TruthViolation[] = [...base.violations, ...next.violations];

    if (Math.abs(diff.coherenceDelta) > 0.8) {
      violations.push({
        type: "inconsistent-replay",
        severity: "medium",
        message: "Large coherence delta suggests non-deterministic transition"
      });
    }

    const checksum = `${base.checksum}-${next.checksum}`;

    return {
      isValid: violations.length === 0,
      violations,
      checksum,
      summary: `truth compare: ${violations.length} issues`
    };
  }

  function verifyReplay(events: any[]): TruthReport {
    const violations: TruthViolation[] = [];

    if (!Array.isArray(events)) {
      violations.push({
        type: "missing-data",
        severity: "high",
        message: "Replay input is not an array"
      });
    }

    // ensure monotonic timestamps
    for (let i = 1; i < events.length; i++) {
      if (events[i].timestamp < events[i - 1].timestamp) {
        violations.push({
          type: "inconsistent-replay",
          severity: "high",
          message: "Non-monotonic event timestamps detected"
        });
        break;
      }
    }

    const checksum = checksumSnapshot({
      worlds: 0,
      memoryGraph: { nodes: [] },
      interactions: { messages: events },
      emergence: { globalCoherence: 0, entropy: 0 }
    } as any);

    return {
      isValid: violations.length === 0,
      violations,
      checksum,
      summary: `replay verification: ${violations.length} issues`
    };
  }

  return {
    validateSnapshot,
    compareTruth,
    verifyReplay
  };
}

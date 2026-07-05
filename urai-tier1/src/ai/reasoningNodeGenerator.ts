"use client";

export type ReasoningNode = {
  id: string;
  type: "bridge" | "stabilizer" | "counterweight" | "emergent";
  text: string;
  weight: number;
  influence: {
    forkBias: number;
    mergeBias: number;
    driftBias: number;
  };
};

export type ConflictSnapshot = {
  severity: number;
  direction: "fork-dominant" | "merge-dominant";
  forkTotal: number;
  mergeTotal: number;
};

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * AUTONOMOUS REASONING NODE GENERATION LAYER
 *
 * When conflict cannot be resolved by reweighting existing timelines,
 * the system generates NEW reasoning nodes to restore coherence.
 */
export function generateReasoningNodesFromConflict(
  conflict: ConflictSnapshot
): ReasoningNode[] {
  const nodes: ReasoningNode[] = [];

  const basePressure = conflict.severity;

  // 🧠 Bridge node (always generated)
  nodes.push({
    id: createId(),
    type: "bridge",
    text: "Synthesize fork and merge pressures into unified causal manifold",
    weight: 0.6 + basePressure * 0.2,
    influence: {
      forkBias: -0.25,
      mergeBias: -0.25,
      driftBias: 0.5
    }
  });

  // ⚖️ Stabilizer node (high conflict only)
  if (conflict.severity > 0.6) {
    nodes.push({
      id: createId(),
      type: "stabilizer",
      text: "Introduce entropy damping across divergent timeline clusters",
      weight: basePressure,
      influence: {
        forkBias: -0.4,
        mergeBias: 0.4,
        driftBias: -0.2
      }
    });
  }

  // 🧭 Counterweight node (directional correction)
  if (conflict.direction === "fork-dominant") {
    nodes.push({
      id: createId(),
      type: "counterweight",
      text: "Apply convergence bias to prevent uncontrolled branching expansion",
      weight: basePressure * 0.8,
      influence: {
        forkBias: -0.6,
        mergeBias: 0.5,
        driftBias: 0.1
      }
    });
  } else {
    nodes.push({
      id: createId(),
      type: "counterweight",
      text: "Apply controlled divergence to prevent premature timeline collapse",
      weight: basePressure * 0.8,
      influence: {
        forkBias: 0.5,
        mergeBias: -0.6,
        driftBias: 0.1
      }
    });
  }

  // 🧬 Emergent node (self-generation under extreme instability)
  if (conflict.severity > 0.85) {
    nodes.push({
      id: createId(),
      type: "emergent",
      text: "Generate novel causal axis to resolve irreducible multiverse tension",
      weight: basePressure * 1.2,
      influence: {
        forkBias: 0.2,
        mergeBias: 0.2,
        driftBias: 0.6
      }
    });
  }

  return nodes;
}

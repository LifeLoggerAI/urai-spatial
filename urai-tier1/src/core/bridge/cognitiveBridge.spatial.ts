import { createCognitiveKernel } from "./cognitiveBridge.core";

export type SpatialVector = {
  id: string;
  x: number;
  y: number;
  z: number;
  type: "memory" | "insight" | "action" | "reasoning";
  intensity: number;
  timestamp: number;
};

export type SpatialState = {
  nodes: SpatialVector[];
};

function hash(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function toCoord(seed: string, scale = 50) {
  return (hash(seed) % (scale * 2)) - scale;
}

export function createSpatialEngine(userId: string = "demo-user") {
  const kernel = createCognitiveKernel(userId);
  const nodes: SpatialVector[] = [];

  function addNode(input: {
    id: string;
    type: SpatialVector["type"];
    content?: unknown;
    intensity?: number;
  }) {
    const base = input.id + String(input.content ?? "");

    const node: SpatialVector = {
      id: input.id,
      x: toCoord(base + "x"),
      y: toCoord(base + "y"),
      z: toCoord(base + "z"),
      type: input.type,
      intensity: input.intensity ?? 1,
      timestamp: Date.now()
    };

    nodes.push(node);
    return node;
  }

  function syncFromKernel() {
    const memory = kernel.getMemory() as { id?: string; content?: unknown } | null;
    const insight = kernel.getInsight() as { id?: string; message?: unknown } | null;

    if (memory) {
      addNode({
        id: memory.id ?? String(Date.now()),
        type: "memory",
        content: memory.content
      });
    }

    if (insight) {
      addNode({
        id: insight.id ?? String(Date.now()) + "i",
        type: "insight",
        content: insight.message
      });
    }

    return nodes;
  }

  function getSpatialState(): SpatialState {
    return { nodes };
  }

  function start(intervalMs: number = 1000) {
    return setInterval(() => {
      syncFromKernel();
    }, intervalMs);
  }

  return {
    kernel,
    addNode,
    syncFromKernel,
    getSpatialState,
    start
  };
}

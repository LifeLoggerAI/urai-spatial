import { createCognitiveKernel } from "./cognitiveBridge.core";

export type MemoryNode = {
  id: string;
  content: any;
  timestamp: number;
  type: "memory" | "insight" | "action" | "reasoning";
};

export type MemoryEdge = {
  from: string;
  to: string;
  weight: number;
};

export type MemoryGraphState = {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
};

export function createMemoryGraph(userId: string = "demo-user") {
  const kernel = createCognitiveKernel(userId);

  const nodes: MemoryNode[] = [];
  const edges: MemoryEdge[] = [];

  function addNode(node: MemoryNode) {
    nodes.push(node);
    return node;
  }

  function addEdge(from: string, to: string, weight: number = 1) {
    edges.push({ from, to, weight });
  }

  function linkLatest() {
    if (nodes.length < 2) return;
    const a = nodes[nodes.length - 2];
    const b = nodes[nodes.length - 1];

    edges.push({ from: a.id, to: b.id, weight: 1 });
  }

  function syncFromKernel() {
    const memory = kernel.getMemory();
    const insight = kernel.getInsight();

    if (memory) {
      addNode({
        id: memory.id ?? String(Date.now()),
        content: memory.content,
        timestamp: Date.now(),
        type: "memory"
      });
    }

    if (insight) {
      addNode({
        id: insight.id ?? String(Date.now()) + "i",
        content: insight.message,
        timestamp: Date.now(),
        type: "insight"
      });
    }

    linkLatest();

    return { nodes, edges };
  }

  function getGraph(): MemoryGraphState {
    return { nodes, edges };
  }

  function start(intervalMs: number = 1500) {
    return setInterval(() => {
      syncFromKernel();
    }, intervalMs);
  }

  return {
    kernel,
    addNode,
    addEdge,
    syncFromKernel,
    linkLatest,
    getGraph,
    start
  };
}

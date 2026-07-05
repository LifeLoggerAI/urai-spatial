import { SimulationEngine, SimulationEvent, SimulationPlugin } from "./SimulationEngine.js";

export type MemoryNode = {
  id: string;
  type: string;
  timestamp: number;
  payload: any;
};

export type MemoryEdge = {
  from: string;
  to: string;
  relation: string;
};

export class MemoryGraphPlugin implements SimulationPlugin {
  name = "memory-graph";

  private nodes: Map<string, MemoryNode> = new Map();
  private edges: MemoryEdge[] = [];

  onEvent(event: SimulationEvent, engine: SimulationEngine) {
    const id = `${event.type}-${event.timestamp}-${Math.random()}`;

    const node: MemoryNode = {
      id,
      type: event.type,
      timestamp: event.timestamp,
      payload: event.payload,
    };

    this.nodes.set(id, node);

    // simple causal chaining: link last node -> new node
    const lastNode = Array.from(this.nodes.values()).slice(-2, -1)[0];
    if (lastNode) {
      this.edges.push({
        from: lastNode.id,
        to: id,
        relation: "causes",
      });
    }

    // emit derived memory event (lightweight reflection)
    engine.emit({
      type: "memory.recorded",
      payload: { nodeId: id },
    });
  }

  tick(engine: SimulationEngine) {
    // lightweight self-observation hook
    if (this.nodes.size % 10 === 0 && this.nodes.size > 0) {
      engine.emit({
        type: "memory.snapshot",
        payload: {
          nodes: this.nodes.size,
          edges: this.edges.length,
        },
      });
    }
  }

  getMemory() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }
}

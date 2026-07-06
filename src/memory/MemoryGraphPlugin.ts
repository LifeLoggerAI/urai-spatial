import type {
  SimulationPlugin,
  SimulationPluginContext
} from "../kernel/SimulationEngine";
import type { KernelEvent } from "../kernel/eventBus";

export type MemoryNode = {
  id: string;
  type: string;
  timestamp: number;
  source?: string;
  payload?: unknown;
};

export type MemoryEdge = {
  from: string;
  to: string;
  type: "temporal" | "causal" | "source";
  timestamp: number;
};

export type MemoryGraphSnapshot = {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  totalNodes: number;
  totalEdges: number;
};

export class MemoryGraphPlugin<TState = Record<string, unknown>>
  implements SimulationPlugin<TState>
{
  readonly name = "memory-graph";

  private nodes = new Map<string, MemoryNode>();
  private edges: MemoryEdge[] = [];
  private lastNodeId: string | null = null;
  private lastSnapshotSize = 0;

  async onRegister(ctx: SimulationPluginContext<TState>) {
    await ctx.emit("memory.ready", {
      plugin: this.name,
      totalNodes: this.nodes.size
    }, this.name);
  }

  async onEvent(event: KernelEvent, ctx: SimulationPluginContext<TState>) {
    if (this.shouldIgnore(event)) return;

    const node: MemoryNode = {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      source: event.source,
      payload: event.payload
    };

    this.nodes.set(node.id, node);

    if (this.lastNodeId && this.lastNodeId !== node.id) {
      this.edges.push({
        from: this.lastNodeId,
        to: node.id,
        type: "temporal",
        timestamp: Date.now()
      });
    }

    if (node.source) {
      this.edges.push({
        from: `source:${node.source}`,
        to: node.id,
        type: "source",
        timestamp: Date.now()
      });
    }

    this.lastNodeId = node.id;

    await ctx.emit("memory.recorded", {
      nodeId: node.id,
      type: node.type,
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length
    }, this.name);
  }

  async onTick(ctx: SimulationPluginContext<TState>) {
    if (this.nodes.size === 0) return;
    if (this.nodes.size < this.lastSnapshotSize + 10) return;

    this.lastSnapshotSize = this.nodes.size;

    await ctx.emit("memory.snapshot", this.snapshot(), this.name);
  }

  getNode(id: string) {
    return this.nodes.get(id);
  }

  findByType(type: string) {
    return Array.from(this.nodes.values()).filter((node) => node.type === type);
  }

  recent(limit = 25) {
    return Array.from(this.nodes.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  snapshot(): MemoryGraphSnapshot {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: [...this.edges],
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length
    };
  }

  private shouldIgnore(event: KernelEvent) {
    return (
      event.type === "memory.recorded" ||
      event.type === "memory.snapshot" ||
      event.source === this.name
    );
  }
}

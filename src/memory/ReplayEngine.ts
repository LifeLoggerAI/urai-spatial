import type { EventBus, KernelEvent } from "../kernel/eventBus";
import type { MemoryEdge, MemoryGraphSnapshot, MemoryNode } from "./MemoryGraphPlugin";

export type ReplayFrame = {
  index: number;
  eventId: string;
  type: string;
  timestamp: number;
  source?: string;
  payload?: unknown;
  previousEventId?: string;
  nextEventId?: string;
};

export type ReplayTimeline = {
  id: string;
  createdAt: number;
  frames: ReplayFrame[];
  totalFrames: number;
  durationMs: number;
};

export type ReplayOptions = {
  fromTimestamp?: number;
  toTimestamp?: number;
  eventTypes?: string[];
  source?: string;
  limit?: number;
};

export class ReplayEngine {
  buildTimeline(snapshot: MemoryGraphSnapshot, options: ReplayOptions = {}): ReplayTimeline {
    const nodes = this.filterNodes(snapshot.nodes, options).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    const temporalEdges = snapshot.edges.filter((edge) => edge.type === "temporal");
    const previousByNode = this.indexPreviousEdges(temporalEdges);
    const nextByNode = this.indexNextEdges(temporalEdges);

    const limitedNodes = typeof options.limit === "number" ? nodes.slice(0, options.limit) : nodes;

    const frames: ReplayFrame[] = limitedNodes.map((node, index) => ({
      index,
      eventId: node.id,
      type: node.type,
      timestamp: node.timestamp,
      source: node.source,
      payload: node.payload,
      previousEventId: previousByNode.get(node.id),
      nextEventId: nextByNode.get(node.id)
    }));

    const first = frames[0];
    const last = frames[frames.length - 1];

    return {
      id: `replay-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      frames,
      totalFrames: frames.length,
      durationMs: first && last ? Math.max(0, last.timestamp - first.timestamp) : 0
    };
  }

  async replayToBus(timeline: ReplayTimeline, bus: EventBus, source = "replay-engine") {
    for (const frame of timeline.frames) {
      const event: KernelEvent = bus.createEvent(
        `replay.${frame.type}`,
        {
          originalEventId: frame.eventId,
          originalTimestamp: frame.timestamp,
          payload: frame.payload,
          frameIndex: frame.index,
          totalFrames: timeline.totalFrames
        },
        source
      );

      await bus.emit(event);
    }
  }

  summarize(timeline: ReplayTimeline) {
    const typeCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();

    for (const frame of timeline.frames) {
      typeCounts.set(frame.type, (typeCounts.get(frame.type) ?? 0) + 1);

      if (frame.source) {
        sourceCounts.set(frame.source, (sourceCounts.get(frame.source) ?? 0) + 1);
      }
    }

    return {
      id: timeline.id,
      totalFrames: timeline.totalFrames,
      durationMs: timeline.durationMs,
      eventTypes: Object.fromEntries(typeCounts.entries()),
      sources: Object.fromEntries(sourceCounts.entries())
    };
  }

  private filterNodes(nodes: MemoryNode[], options: ReplayOptions) {
    return nodes.filter((node) => {
      if (options.fromTimestamp && node.timestamp < options.fromTimestamp) return false;
      if (options.toTimestamp && node.timestamp > options.toTimestamp) return false;
      if (options.eventTypes && !options.eventTypes.includes(node.type)) return false;
      if (options.source && node.source !== options.source) return false;
      return true;
    });
  }

  private indexPreviousEdges(edges: MemoryEdge[]) {
    const previousByNode = new Map<string, string>();

    for (const edge of edges) {
      previousByNode.set(edge.to, edge.from);
    }

    return previousByNode;
  }

  private indexNextEdges(edges: MemoryEdge[]) {
    const nextByNode = new Map<string, string>();

    for (const edge of edges) {
      nextByNode.set(edge.from, edge.to);
    }

    return nextByNode;
  }
}

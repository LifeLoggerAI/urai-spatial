import { createCognitiveUniverse } from "./cognitiveUniverse";
import { createEmergenceLayer } from "./cognitiveUniverse.emergence";
import { createUniverseInteractions } from "./cognitiveUniverse.interactions";
import { createMemoryGraph } from "./cognitiveBridge.memoryGraph";
import { createTelemetryLayer } from "./cognitiveUniverse.telemetry";

export type InspectorTrace = {
  type: "world" | "node" | "interaction" | "timeline";
  id?: string | number;
  data: any;
};

// UNIVERSE INSPECTOR MODE (READ-ONLY DEEP DEBUG + TRACE SYSTEM)
// Enables deep introspection of worlds, memory graph nodes, and interaction history
export function createUniverseInspector(userId: string = "demo-user") {
  const universe = createCognitiveUniverse(userId);
  const emergence = createEmergenceLayer(userId);
  const interactions = createUniverseInteractions(userId);
  const memory = createMemoryGraph(userId);
  const telemetry = createTelemetryLayer(userId);

  function inspectWorld(index: number): InspectorTrace {
    const world = universe.worlds?.[index];

    return {
      type: "world",
      id: index,
      data: {
        state: world?.getState?.() ?? null,
        active: !!world,
        note: "read-only snapshot of living world"
      }
    };
  }

  function traceNode(nodeId: string): InspectorTrace {
    const graph = memory.getGraph();

    const node = graph.nodes.find(n => n.id === nodeId);
    const edges = graph.edges.filter(e => e.from === nodeId || e.to === nodeId);

    return {
      type: "node",
      id: nodeId,
      data: {
        node,
        edges,
        context: "memory graph trace (read-only)"
      }
    };
  }

  function traceInteraction(messageId: string): InspectorTrace {
    const field = interactions.getField();

    const message = field.messages.find((m: any) => String(m.timestamp) === messageId || m.payload?.id === messageId);

    return {
      type: "interaction",
      id: messageId,
      data: {
        message,
        density: field.density,
        context: "interaction field trace (read-only)"
      }
    };
  }

  function getTimeline(): InspectorTrace {
    return {
      type: "timeline",
      data: {
        telemetry: telemetry.snapshot(),
        emergence: emergence.analyze(),
        interactionField: interactions.getField(),
        memoryGraph: memory.getGraph()
      }
    };
  }

  return {
    universe,
    inspectWorld,
    traceNode,
    traceInteraction,
    getTimeline
  };
}

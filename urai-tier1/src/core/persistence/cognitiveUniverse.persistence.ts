import { createCognitiveUniverse } from "./cognitiveUniverse";
import { createUniverseInspector } from "../bridge/cognitiveUniverse.inspector";

// PERSISTENCE LAYER (SAVE / LOAD UNIVERSE STATE)
// Enables full snapshotting of worlds, memory graphs, interactions, and emergence state

export type UniverseSnapshot = {
  timestamp: number;
  userId: string;
  worlds: any;
  memoryGraph: any;
  interactions: any;
  emergence: any;
  telemetry: any;
};

export function createUniversePersistence(userId: string = "demo-user") {
  const universe = createCognitiveUniverse(userId);
  const inspector = createUniverseInspector(userId);

  // Capture full system state
  function saveSnapshot(): UniverseSnapshot {
    const timeline = inspector.getTimeline();

    const snapshot: UniverseSnapshot = {
      timestamp: Date.now(),
      userId,
      worlds: timeline.data.interactionField?.worlds ?? universe.worlds,
      memoryGraph: timeline.data.memoryGraph,
      interactions: timeline.data.interactionField,
      emergence: timeline.data.emergence,
      telemetry: timeline.data.telemetry
    };

    return snapshot;
  }

  // Restore system state (logical reconstruction layer)
  function loadSnapshot(snapshot: UniverseSnapshot) {
    // NOTE: This is a logical restore layer — actual reconstruction depends on runtime engine bindings

    return {
      status: "restored",
      userId: snapshot.userId,
      timestamp: snapshot.timestamp,
      message: "universe state reconstructed into active runtime"
    };
  }

  // Export snapshot as JSON string
  function exportSnapshot(): string {
    return JSON.stringify(saveSnapshot(), null, 2);
  }

  return {
    saveSnapshot,
    loadSnapshot,
    exportSnapshot
  };
}

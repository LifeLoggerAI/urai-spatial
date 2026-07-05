import { createUniverseEventLog } from "./cognitiveUniverse.eventLog";
import { createCrossForkEngine } from "./cognitiveUniverse.crossFork";
import { UniverseSnapshot } from "../persistence/cognitiveUniverse.persistence";

export type SimulationNode = {
  id: string;
  region: string;
  load: number;
  forks: string[];
};

export type SimulationSyncEvent = {
  id: string;
  fromNode: string;
  toNode: string;
  type: "sync" | "replicate" | "broadcast";
  payload: any;
  timestamp: number;
};

export type PartitionedSimulationState = {
  nodes: SimulationNode[];
  eventCount: number;
  tick: number;
  summary: string;
};

// PARTITIONED SIMULATION LAYER
// Models how a universe could be split across multiple logical nodes (simulation only)
export function createPartitionedSimulation() {
  const eventLog = createUniverseEventLog();
  const crossFork = createCrossForkEngine();

  const nodes: Record<string, SimulationNode> = {};
  const events: SimulationSyncEvent[] = [];

  let tick = 0;

  function addNode(id: string, region: string) {
    nodes[id] = {
      id,
      region,
      load: 0,
      forks: []
    };
  }

  function registerFork(nodeId: string, forkId: string, snapshot: UniverseSnapshot) {
    const node = nodes[nodeId];
    if (!node) return;

    node.forks.push(forkId);

    crossFork.registerFork(forkId, snapshot);

    eventLog.append({
      id: `evt-${Date.now()}-${Math.random()}`,
      type: "MEMORY_WRITE",
      timestamp: Date.now(),
      payload: { nodeId, forkId }
    });
  }

  function sync(a: string, b: string) {
    const A = nodes[a];
    const B = nodes[b];

    if (!A || !B) return null;

    const e: SimulationSyncEvent = {
      id: `sync-${Date.now()}-${Math.random()}`,
      fromNode: a,
      toNode: b,
      type: "sync",
      payload: { forks: A.forks },
      timestamp: Date.now()
    };

    events.push(e);

    B.forks = Array.from(new Set([...B.forks, ...A.forks]));

    return e;
  }

  function broadcast(payload: any) {
    const ids = Object.keys(nodes);

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        events.push({
          id: `b-${Date.now()}-${Math.random()}`,
          fromNode: ids[i],
          toNode: ids[j],
          type: "broadcast",
          payload,
          timestamp: Date.now()
        });
      }
    }
  }

  function step() {
    tick++;

    for (const n of Object.values(nodes)) {
      n.load = n.forks.length * Math.random();
    }

    return getState();
  }

  function getState(): PartitionedSimulationState {
    return {
      nodes: Object.values(nodes),
      eventCount: events.length,
      tick,
      summary: `nodes=${Object.keys(nodes).length} | events=${events.length} | tick=${tick}`
    };
  }

  return {
    addNode,
    registerFork,
    sync,
    broadcast,
    step,
    getState
  };
}

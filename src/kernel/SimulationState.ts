// SimulationState + Engine Mutation Bridge
// Core layer that turns advisory feedback into deterministic state evolution

export type Mutation<T = any> = {
  type: string;
  payload?: T;
  source?: string;
  timestamp?: number;
};

export interface MemoryNode {
  id: string;
  type: string;
  data: any;
  createdAt: number;
}

export interface SimulationState {
  tick: number;
  totalRuns: number;
  memoryGraph: MemoryNode[];
  environment: Record<string, any>;
  predictionWeights: Record<string, number>;
  xrScene: {
    objects: any[];
  };
}

export const createInitialState = (): SimulationState => ({
  tick: 0,
  totalRuns: 0,
  memoryGraph: [],
  environment: {},
  predictionWeights: {},
  xrScene: {
    objects: []
  }
});

/**
 * Engine Mutation Bridge
 * Converts SystemLoop feedback mutations into actual state transitions
 */
export class EngineMutationBridge {
  private state: SimulationState;

  constructor(initialState?: SimulationState) {
    this.state = initialState ?? createInitialState();
  }

  getState() {
    return this.state;
  }

  /**
   * Apply a batch of mutations deterministically
   */
  applyMutations(mutations: Mutation[]) {
    for (const m of mutations) {
      this.applyMutation(m);
    }

    this.state.totalRuns += 1;
    this.state.tick += 1;

    return this.state;
  }

  private applyMutation(m: Mutation) {
    const now = Date.now();

    switch (m.type) {
      case "memory:add": {
        this.state.memoryGraph.push({
          id: cryptoRandomId(),
          type: m.payload?.type ?? "unknown",
          data: m.payload?.data ?? {},
          createdAt: now
        });
        break;
      }

      case "env:set": {
        if (!m.payload) break;
        this.state.environment[m.payload.key] = m.payload.value;
        break;
      }

      case "prediction:weight": {
        if (!m.payload) break;
        this.state.predictionWeights[m.payload.key] = m.payload.weight;
        break;
      }

      case "xr:addObject": {
        this.state.xrScene.objects.push(m.payload);
        break;
      }

      case "state:reset": {
        this.state = createInitialState();
        break;
      }

      default:
        // unknown mutations are safely ignored for forward compatibility
        break;
    }
  }
}

function cryptoRandomId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 10)
  );
}
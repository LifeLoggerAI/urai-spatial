// URAI Spatial - Simulation Engine Plugin Interface
// Defines contract for all simulation extensions (memory, prediction, agents)

import type { SimulationState } from "../kernel/SimulationState";

/**
 * Base plugin contract for SimulationEngine.
 * Plugins can observe, mutate, and extend simulation state.
 */
export interface SimulationEnginePlugin {
  id: string;

  /** Called once when engine starts */
  onInit?(state: SimulationState): void;

  /** Called every simulation tick before state update */
  beforeTick?(state: SimulationState, dt: number): void;

  /** Called every simulation tick after state update */
  afterTick?(state: SimulationState, dt: number): void;

  /** Optional reducer-style mutation hook */
  reduceState?(state: SimulationState): SimulationState;
}

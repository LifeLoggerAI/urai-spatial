// URAI Spatial Runtime - System Loop Orchestrator (CLOSED LOOP VERSION)
// Now connects feedback → mutations → state evolution

import { FeedbackExecutor, SimulationFeedback, SimulationMutation } from './FeedbackExecutor';
import { EngineMutationBridge, createInitialState, SimulationState } from '../kernel/SimulationState';

/**
 * SystemLoop is now the FULL closed-loop orchestrator:
 * feedback → mutations → state evolution
 */
export class SystemLoop {
  private feedbackExecutor: FeedbackExecutor;
  private engine: EngineMutationBridge;

  constructor(initialState?: SimulationState) {
    this.feedbackExecutor = new FeedbackExecutor();
    this.engine = new EngineMutationBridge(initialState ?? createInitialState());
  }

  /**
   * Run a deterministic simulation cycle
   */
  runCycle(inputFeedback: SimulationFeedback[] = []) {
    // 1. Generate mutations from feedback
    const mutations: SimulationMutation[] = this.feedbackExecutor.execute(inputFeedback);

    // 2. Apply mutations to state engine
    const state = this.engine.applyMutations(
      mutations.map((m) => ({
        type: this.mapMutationType(m),
        payload: m.value,
        source: 'system-loop',
        timestamp: Date.now()
      }))
    );

    // 3. Optional advisory application
    this.feedbackExecutor.apply(mutations);

    // 4. Return full cycle result
    return {
      feedback: inputFeedback,
      mutations,
      state,
      timestamp: Date.now()
    };
  }

  /**
   * Map high-level mutation intent → engine mutation types
   */
  private mapMutationType(m: SimulationMutation): string {
    switch (m.target) {
      case 'MemoryGraph':
        return 'memory:add';
      case 'XRRuntime':
        return 'xr:addObject';
      case 'PredictionEngine':
        return 'prediction:weight';
      case 'SimulationEngine':
        return 'env:set';
      default:
        return 'env:set';
    }
  }

  /**
   * Enable or disable feedback processing safely
   */
  setFeedbackEnabled(state: boolean) {
    this.feedbackExecutor.setEnabled(state);
  }

  /**
   * Get current simulation state snapshot
   */
  getState() {
    return this.engine.getState();
  }
}
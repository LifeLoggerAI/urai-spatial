// URAI Spatial Runtime - System Loop Orchestrator (SAFE LAYER)
// This module ONLY wires subsystems together without executing autonomous mutation loops

import { FeedbackExecutor, SimulationFeedback, SimulationMutation } from './FeedbackExecutor';

/**
 * SystemLoop defines the orchestration layer between engine components.
 * It does NOT own execution timing or self-triggering loops.
 */
export class SystemLoop {
  private feedbackExecutor: FeedbackExecutor;

  constructor() {
    this.feedbackExecutor = new FeedbackExecutor();
  }

  /**
   * Run a single deterministic simulation cycle.
   * External scheduler (index.ts or runtime host) must call this.
   */
  runCycle(inputFeedback: SimulationFeedback[] = []) {
    const mutations: SimulationMutation[] = this.feedbackExecutor.execute(inputFeedback);

    this.feedbackExecutor.apply(mutations);

    return {
      feedback: inputFeedback,
      mutations,
      timestamp: Date.now(),
    };
  }

  /**
   * Enable or disable feedback processing safely.
   */
  setFeedbackEnabled(state: boolean) {
    this.feedbackExecutor.setEnabled(state);
  }
}

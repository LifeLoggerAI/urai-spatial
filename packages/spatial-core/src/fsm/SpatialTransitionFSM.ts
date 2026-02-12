
/**
 * @file Defines the Finite State Machine (FSM) for the deterministic star-to-replay transition.
 * This is the master authority for the entire cinematic commit sequence.
 * It enforces a strict, linear progression and prevents all race conditions.
 *
 * This is the implementation of the architectural blueprint for locking Layer B.
 *
 * @see SPATIAL_LOCK.md
 */

// 1. STATE DEFINITION: The set of all possible states in the transition lifecycle.
export enum SpatialTransitionState {
  IDLE = 'IDLE',                           // Default state, nothing is happening.
  HOVER = 'HOVER',                         // A star is being hovered, ready for selection.
  LOCKED = 'LOCKED',                       // A star has been selected, interaction is frozen.
  COMMITTING = 'COMMITTING',                 // The camera spline animation has begun.
  PRELOADING = 'PRELOADING',                 // Replay assets are being preloaded.
  TRANSITIONING = 'TRANSITIONING',             // Camera commit is complete, visual transition (e.g., fade) is active.
  ROUTING = 'ROUTING',                     // The application route is being changed.
  REPLAY_ACTIVE = 'REPLAY_ACTIVE',             // The replay scene is now the active experience.
  ERROR = 'ERROR'                          // An illegal state transition or other failure occurred.
}

// 2. STATE TRANSITION MAP: Defines the legal, unidirectional flow from one state to the next.
const LEGAL_TRANSITIONS: Map<SpatialTransitionState, SpatialTransitionState> = new Map([
  [SpatialTransitionState.IDLE, SpatialTransitionState.HOVER],
  [SpatialTransitionState.HOVER, SpatialTransitionState.LOCKED],
  [SpatialTransitionState.LOCKED, SpatialTransitionState.COMMITTING],
  [SpatialTransitionState.COMMITTING, SpatialTransitionState.PRELOADING],
  [SpatialTransitionState.PRELOADING, SpatialTransitionState.TRANSITIONING],
  [SpatialTransitionState.TRANSITIONING, SpatialTransitionState.ROUTING],
  [SpatialTransitionState.ROUTING, SpatialTransitionState.REPLAY_ACTIVE]
]);

// 3. FSM CLASS: The core implementation of the state machine.
export class SpatialTransitionFSM {
  private currentState: SpatialTransitionState;

  constructor() {
    this.currentState = SpatialTransitionState.IDLE;
  }

  /**
   * Returns the current state of the transition.
   */
  public get state(): SpatialTransitionState {
    return this.currentState;
  }

  /**
   * Attempts to transition to the next state in the legal sequence.
   * Throws an error if the transition is illegal, enforcing deterministic flow.
   */
  public next() {
    const nextState = LEGAL_TRANSITIONS.get(this.currentState);

    if (!nextState) {
      this.throwIllegalTransition(this.currentState);
    }

    console.log(`[SpatialTransitionFSM] State Change: ${this.currentState} -> ${nextState}`);
    this.currentState = nextState;
  }

  /**
   * Resets the state machine to its initial IDLE state.
   * This is typically called when the user exits a replay.
   */
  public reset() {
    console.log(`[SpatialTransitionFSM] Resetting to IDLE`);
    this.currentState = SpatialTransitionState.IDLE;
  }
  
  /**
   * Forces the FSM into the ERROR state. This is a fatal action.
   * @param message - The reason for the error.
   */
  public error(message: string) {
    console.error(`[SpatialTransitionFSM] ERROR: ${message}. Forcing ERROR state.`);
    this.currentState = SpatialTransitionState.ERROR;
  }

  private throwIllegalTransition(from: SpatialTransitionState) {
    const message = `Illegal state transition attempted from ${from}.`;
    this.error(message);
    throw new Error(message);
  }
}

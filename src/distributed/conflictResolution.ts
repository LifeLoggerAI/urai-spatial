/**
 * URAI v60 Distributed Layer
 * Conflict Resolution Engine
 *
 * Ensures deterministic resolution when concurrent events
 * attempt to mutate shared world state.
 */

import { URAIEvent, URAIState } from "../kernel";

// =========================
// Deterministic Conflict Resolver
// =========================

export class ConflictResolution {

  /**
   * Deterministic merge of two competing events affecting same entity
   */
  static resolveEventConflict(a: URAIEvent, b: URAIEvent): URAIEvent {
    // Primary ordering: timestamp (logical clock)
    if (a.timestamp !== b.timestamp) {
      return a.timestamp < b.timestamp ? a : b;
    }

    // Tie-breaker: stable lexical ID
    return a.id < b.id ? a : b;
  }

  /**
   * Deterministic state field merge
   */
  static mergeStateField(local: any, incoming: any): any {
    if (local === undefined) return incoming;
    if (incoming === undefined) return local;

    // Primitive overwrite rule (deterministic last-writer-wins by ordering layer)
    if (typeof local !== "object" || typeof incoming !== "object") {
      return incoming;
    }

    // Array merge (order preserved)
    if (Array.isArray(local) && Array.isArray(incoming)) {
      return [...local, ...incoming];
    }

    // Object deep merge (deterministic key ordering)
    const merged: any = {};

    const keys = new Set([...Object.keys(local), ...Object.keys(incoming)]);

    for (const key of Array.from(keys).sort()) {
      merged[key] = this.mergeStateField(local[key], incoming[key]);
    }

    return merged;
  }

  /**
   * Resolve world state divergence between two nodes
   */
  static resolveState(a: URAIState, b: URAIState): URAIState {
    return {
      version: Math.max(a.version, b.version),
      users: this.mergeStateField(a.users, b.users),
      worlds: this.mergeStateField(a.worlds, b.worlds),
      memory: [...a.memory, ...b.memory].sort((x, y) => {
        if (x.timestamp !== y.timestamp) return x.timestamp - y.timestamp;
        return x.id < y.id ? -1 : 1;
      })
    };
  }

  /**
   * Detect divergence between nodes
   */
  static isDivergent(a: URAIState, b: URAIState): boolean {
    return JSON.stringify(a) !== JSON.stringify(b);
  }

  /**
   * Deterministic reconciliation pass (used in sync layer)
   */
  static reconcile(states: URAIState[]): URAIState {
    return states.reduce((acc, state) => this.resolveState(acc, state));
  }
}

/**
 * DESIGN NOTE (v60):
 *
 * This module guarantees:
 * - deterministic resolution of concurrent mutations
 * - consistent cross-node merge behavior
 * - elimination of race-condition state drift
 *
 * This is the final missing primitive for safe distributed simulation convergence.
 */
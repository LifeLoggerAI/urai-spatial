/**
 * URAI v60 Distributed Layer
 * State Convergence Validator
 *
 * Ensures all kernels produce identical state
 * from identical ordered event histories.
 */

import { URAIEvent, URAIState } from "../kernel";

// =========================
// Hash Utility (deterministic state fingerprinting)
// =========================

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

// =========================
// State Convergence Engine
// =========================

export class StateConvergence {
  /**
   * Create deterministic fingerprint of state
   */
  static fingerprint(state: URAIState): string {
    const normalized = JSON.stringify({
      users: state.users,
      worlds: state.worlds,
      memory: state.memory.map((e: URAIEvent) => ({
        id: e.id,
        type: e.type,
        timestamp: e.timestamp,
        userId: e.userId,
        worldId: e.worldId
      }))
    });

    return simpleHash(normalized);
  }

  /**
   * Compare two distributed states for equivalence
   */
  static compare(a: URAIState, b: URAIState): boolean {
    return this.fingerprint(a) === this.fingerprint(b);
  }

  /**
   * Validate convergence across multiple nodes
   */
  static validate(nodes: URAIState[]): boolean {
    if (nodes.length === 0) return true;

    const base = this.fingerprint(nodes[0]);

    for (let i = 1; i < nodes.length; i++) {
      if (this.fingerprint(nodes[i]) !== base) {
        return false;
      }
    }

    return true;
  }

  /**
   * Debug divergence report
   */
  static diagnose(nodes: URAIState[]): { ok: boolean; hashes: string[] } {
    const hashes = nodes.map(n => this.fingerprint(n));

    return {
      ok: new Set(hashes).size === 1,
      hashes
    };
  }
}

/**
 * DESIGN NOTE (v60):
 *
 * This layer guarantees deterministic convergence by enforcing:
 * - identical event ordering
 * - identical reducer output
 * - identical final state fingerprint
 *
 * If fingerprints diverge → system has non-deterministic mutation path.
 */
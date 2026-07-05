/**
 * URAI v60 Distributed Layer
 * Shared Event Log (single source of truth across kernels)
 *
 * This is the first primitive for multi-user deterministic world sync.
 */

import { URAIEvent } from "../kernel";

// =========================
// In-memory shared log (prototype for distributed backend)
// =========================

export class SharedEventLog {
  private log: URAIEvent[] = [];
  private subscribers: ((event: URAIEvent) => void)[] = [];

  /**
   * Append event to global log
   * All kernels MUST consume from this same stream
   */
  append(event: URAIEvent) {
    this.log.push(event);

    // fan-out to subscribers (other kernels / nodes)
    for (const sub of this.subscribers) {
      sub(event);
    }
  }

  /**
   * Subscribe to global event stream
   * Used by each distributed kernel instance
   */
  subscribe(fn: (event: URAIEvent) => void) {
    this.subscribers.push(fn);
  }

  /**
   * Get full deterministic history
   * Used for replay consistency across nodes
   */
  getHistory(): URAIEvent[] {
    return [...this.log];
  }

  /**
   * Replay log into a kernel instance
   * Ensures deterministic reconstruction across machines
   */
  replay(handler: (event: URAIEvent) => void) {
    for (const event of this.log) {
      handler(event);
    }
  }
}

/**
 * DESIGN NOTE (v60 foundation):
 *
 * This is intentionally naive (in-memory).
 * In production v60:
 * - replace with append-only distributed log (Kafka / NATS / CRDT log)
 * - enforce total ordering or causal ordering
 * - persist log externally
 *
 * Core invariant:
 * SAME LOG → SAME WORLD STATE (across all kernels)
 */
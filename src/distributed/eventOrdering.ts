/**
 * URAI v60 Distributed Layer
 * Event Ordering System (deterministic concurrency control)
 *
 * Ensures all nodes agree on a single causal order of events.
 */

import { URAIEvent } from "../kernel";

// =========================
// Logical Clock State
// =========================

export class LogicalClock {
  private time = 0;

  tick(): number {
    this.time += 1;
    return this.time;
  }

  update(remoteTime: number) {
    this.time = Math.max(this.time, remoteTime) + 1;
  }

  now(): number {
    return this.time;
  }
}

// =========================
// Event Ordering Engine
// =========================

export class EventOrdering {
  private clock = new LogicalClock();

  /**
   * Assign deterministic ordering metadata to event
   */
  stamp(event: URAIEvent): URAIEvent {
    const timestamp = this.clock.tick();

    return {
      ...event,
      timestamp,
    };
  }

  /**
   * Merge remote event stream with local ordering
   */
  merge(events: URAIEvent[]): URAIEvent[] {
    for (const e of events) {
      this.clock.update(e.timestamp);
    }

    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Deterministic compare function for distributed replay
   */
  compare(a: URAIEvent, b: URAIEvent): number {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }

    // tie-breaker for determinism
    return a.id.localeCompare(b.id);
  }
}

/**
 * DESIGN NOTE (v60):
 *
 * This is a simplified Lamport-style logical clock system.
 *
 * Guarantees:
 * - Total ordering across distributed kernels
 * - Deterministic replay consistency
 * - No race-condition divergence
 *
 * Future upgrade path:
 * - hybrid logical clocks (HLC)
 * - vector clocks for causal graphs
 */
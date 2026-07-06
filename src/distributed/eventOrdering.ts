/**
 * URAI v60 Event Ordering
 * Lamport-style logical ordering for deterministic replay.
 */

import { URAIEvent } from "../kernel";

export class EventOrdering {
  private clock = 0;

  stamp(event: URAIEvent): URAIEvent {
    this.clock += 1;
    return {
      ...event,
      timestamp: this.clock,
    };
  }

  compare(a: URAIEvent, b: URAIEvent): number {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    return a.id.localeCompare(b.id);
  }

  sort(events: URAIEvent[]): URAIEvent[] {
    return [...events].sort((a, b) => this.compare(a, b));
  }
}

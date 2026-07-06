/**
 * URAI v60 Shared Event Log
 * Global in-memory append-only event stream for deterministic multi-kernel simulation.
 */

import { URAIEvent } from "../kernel";

export class SharedEventLog {
  private events: URAIEvent[] = [];
  private subscribers: Array<(event: URAIEvent) => void> = [];

  append(event: URAIEvent) {
    this.events.push(event);
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }
  }

  subscribe(fn: (event: URAIEvent) => void) {
    this.subscribers.push(fn);
  }

  getHistory(): URAIEvent[] {
    return [...this.events];
  }

  replay(fn: (event: URAIEvent) => void) {
    for (const event of this.events) {
      fn(event);
    }
  }
}

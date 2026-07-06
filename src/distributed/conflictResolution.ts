/**
 * URAI v60 Conflict Resolution
 * Stable resolution helpers for same-field distributed updates.
 */

import { URAIEvent } from "../kernel";

export class ConflictResolution {
  resolveEvents(events: URAIEvent[]): URAIEvent[] {
    return [...events].sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.id.localeCompare(b.id);
    });
  }

  mergePayloads(payloads: Record<string, any>[]): Record<string, any> {
    return payloads.reduce((merged, payload) => ({ ...merged, ...payload }), {});
  }
}

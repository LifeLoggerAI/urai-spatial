/**
 * URAI Event Store (Persistence + Replay Layer)
 * Step 2 after unified kernel
 *
 * This is the missing production primitive:
 * deterministic event log storage + replay capability
 */

import { URAIEvent } from "./kernel";

// =========================
// Storage Adapter Interface
// =========================

export interface EventStorageAdapter {
  append(event: URAIEvent): Promise<void>;
  loadAll(): Promise<URAIEvent[]>;
  clear?(): Promise<void>;
}

// =========================
// In-Memory Adapter (MVP)
// =========================

export class InMemoryEventStorage implements EventStorageAdapter {
  private events: URAIEvent[] = [];

  async append(event: URAIEvent): Promise<void> {
    this.events.push(event);
  }

  async loadAll(): Promise<URAIEvent[]> {
    return [...this.events];
  }

  async clear(): Promise<void> {
    this.events = [];
  }
}

// =========================
// Event Store (system primitive)
// =========================

export class EventStore {
  private storage: EventStorageAdapter;

  constructor(storage?: EventStorageAdapter) {
    this.storage = storage || new InMemoryEventStorage();
  }

  /**
   * Append event to durable log
   */
  async write(event: URAIEvent) {
    await this.storage.append(event);
  }

  /**
   * Load full event history
   */
  async readAll(): Promise<URAIEvent[]> {
    return await this.storage.loadAll();
  }

  /**
   * Deterministic replay hook (connects to kernel later)
   */
  async replay(reducer: (state: any, event: URAIEvent) => any, initialState: any) {
    const events = await this.readAll();
    return events.reduce((state, event) => reducer(state, event), initialState);
  }
}

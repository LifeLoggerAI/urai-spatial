/**
 * URAI Unified Event + State Kernel (MVP)
 * Step 1 + 2 integration: deterministic core + persistence
 */

import { EventStore } from "./eventStore";

// =========================
// Types
// =========================

export type URAIEvent = {
  id: string;
  type: string;
  timestamp: number;
  userId: string;
  worldId: string;
  payload: any;
};

export type URAIState = {
  version: number;
  users: Record<string, any>;
  worlds: Record<string, any>;
  memory: URAIEvent[];
};

// =========================
// Event Bus
// =========================

export class EventBus {
  private listeners: ((event: URAIEvent) => void)[] = [];

  emit(event: URAIEvent) {
    this.listeners.forEach((l) => l(event));
  }

  subscribe(fn: (event: URAIEvent) => void) {
    this.listeners.push(fn);
  }
}

// =========================
// Reducer
// =========================

export function reducer(state: URAIState, event: URAIEvent): URAIState {
  const next = {
    ...state,
    memory: [...state.memory, event],
  };

  if (event.type === "USER_UPDATE") {
    next.users[event.userId] = {
      ...(next.users[event.userId] || {}),
      ...event.payload,
    };
  }

  if (event.type === "WORLD_UPDATE") {
    next.worlds[event.worldId] = {
      ...(next.worlds[event.worldId] || {}),
      ...event.payload,
    };
  }

  return next;
}

// =========================
// Store
// =========================

export class Store {
  private state: URAIState;

  constructor(initialState?: Partial<URAIState>) {
    this.state = {
      version: 1,
      users: {},
      worlds: {},
      memory: [],
      ...initialState,
    };
  }

  getState() {
    return this.state;
  }

  dispatch(event: URAIEvent) {
    this.state = reducer(this.state, event);
  }

  replay(events: URAIEvent[]) {
    this.state = events.reduce(reducer, this.state);
  }
}

// =========================
// Kernel Bootstrap (NOW PERSISTENT)
// =========================

export class URAIKernel {
  public bus: EventBus;
  public store: Store;
  public eventStore: EventStore;

  private ready: boolean = false;

  constructor(eventStore?: EventStore) {
    this.bus = new EventBus();
    this.store = new Store();
    this.eventStore = eventStore || new EventStore();

    // In-memory propagation
    this.bus.subscribe((event) => {
      this.store.dispatch(event);

      // Persist every event (source of truth)
      this.eventStore.write(event).catch((err) => {
        console.error("EventStore write failed:", err);
      });
    });
  }

  /**
   * MUST be called before system use
   * Rebuilds deterministic state from event log
   */
  async init() {
    const events = await this.eventStore.readAll();
    this.store.replay(events);
    this.ready = true;
  }

  emit(event: URAIEvent) {
    if (!this.ready) {
      console.warn("Kernel not initialized yet");
    }

    this.bus.emit(event);
  }

  getState() {
    return this.store.getState();
  }

  isReady() {
    return this.ready;
  }
}

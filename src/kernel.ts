/**
 * URAI Unified Event + State Kernel (MVP)
 * Step 1 + 2 + 9 + 11 integration: deterministic core + persistence + input reaction + validation
 */

import { EventStore } from "./eventStore";
import { validateEvent } from "./schema";

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

  if (event.type === "USER_INPUT") {
    const world = next.worlds[event.worldId] || {};

    next.worlds[event.worldId] = {
      ...world,
      lastInteraction: {
        userId: event.userId,
        timestamp: event.timestamp,
        payload: event.payload,
      },
      interactionCount: (world.interactionCount || 0) + 1,
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
// Kernel Bootstrap (NOW VALIDATED)
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

    this.bus.subscribe((event) => {
      // Only persist VALID events
      const validation = validateEvent(event);
      if (!validation.valid) {
        console.error("Blocked invalid event in kernel:", validation.error);
        return;
      }

      this.store.dispatch(event);

      this.eventStore.write(event).catch((err) => {
        console.error("EventStore write failed:", err);
      });
    });
  }

  async init() {
    const events = await this.eventStore.readAll();

    // filter invalid events during replay
    const validEvents = events.filter((e) => validateEvent(e).valid);

    this.store.replay(validEvents);
    this.ready = true;
  }

  emit(event: URAIEvent) {
    if (!this.ready) {
      console.warn("Kernel not initialized yet");
    }

    const validation = validateEvent(event);
    if (!validation.valid) {
      console.error("Rejected event at emit:", validation.error);
      return;
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
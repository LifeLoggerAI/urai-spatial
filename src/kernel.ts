/**
 * URAI Unified Event + State Kernel (MVP)
 * Step 1: single-file deterministic core
 *
 * This is the minimal primitive required for v50 convergence.
 */

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
// Event Bus (single source of truth ingress)
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
// Reducer (pure function = determinism layer)
// =========================

export function reducer(state: URAIState, event: URAIEvent): URAIState {
  const next = {
    ...state,
    memory: [...state.memory, event],
  };

  // minimal projection examples
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
// Store (single canonical state engine)
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
// Kernel Bootstrap
// =========================

export class URAIKernel {
  public bus: EventBus;
  public store: Store;

  constructor() {
    this.bus = new EventBus();
    this.store = new Store();

    // wire event flow
    this.bus.subscribe((event) => {
      this.store.dispatch(event);
    });
  }

  emit(event: URAIEvent) {
    this.bus.emit(event);
  }

  getState() {
    return this.store.getState();
  }
}

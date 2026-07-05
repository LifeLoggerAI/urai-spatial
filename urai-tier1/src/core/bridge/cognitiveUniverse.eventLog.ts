// EVENT SOURCING CORE (DETERMINISTIC UNIVERSE REPLAY SYSTEM)
// Records all universe mutations as an append-only log for replay, debugging, and deterministic reconstruction

export type UniverseEvent = {
  id: string;
  type:
    | "WORLD_SPAWN"
    | "WORLD_STEP"
    | "INTERACTION"
    | "EMERGENCE"
    | "EVOLUTION"
    | "RENDER"
    | "XR_FRAME"
    | "MEMORY_WRITE";
  timestamp: number;
  payload: any;
};

export type EventLogState = {
  events: UniverseEvent[];
  pointer: number;
};

// EVENT LOG LAYER (source of truth for replayable universe state)
export function createUniverseEventLog() {
  const events: UniverseEvent[] = [];
  let pointer = 0;

  function append(event: UniverseEvent) {
    events.push(event);
    pointer = events.length;
  }

  function replay(fromIndex: number = 0, toIndex?: number) {
    const slice = events.slice(fromIndex, toIndex ?? events.length);

    // deterministic replay output (no side effects)
    return slice.map(e => ({
      id: e.id,
      type: e.type,
      timestamp: e.timestamp,
      payload: e.payload
    }));
  }

  function getEvents() {
    return events;
  }

  function getState(): EventLogState {
    return {
      events,
      pointer
    };
  }

  return {
    append,
    replay,
    getEvents,
    getState
  };
}

// XR Persistent Memory + Replay Engine
// Append-only event log + deterministic replay layer for XR cognition system

export type XrEvent = {
  type: string
  roomId: string
  payload?: any
  timestamp?: number
}

export type MemoryRecord = {
  id: string
  event: XrEvent
}

// -----------------------------
// Persistent Event Store Layer
// -----------------------------

export interface EventStore {
  append(record: MemoryRecord): Promise<void>
  query(roomId: string): Promise<MemoryRecord[]>
  clear?(roomId: string): Promise<void>
}

// In-memory fallback store (swap with DB / filesystem later)
export class InMemoryEventStore implements EventStore {
  private store: Map<string, MemoryRecord[]> = new Map()

  async append(record: MemoryRecord): Promise<void> {
    const list = this.store.get(record.event.roomId) ?? []
    list.push(record)
    this.store.set(record.event.roomId, list)
  }

  async query(roomId: string): Promise<MemoryRecord[]> {
    return this.store.get(roomId) ?? []
  }

  async clear(roomId: string): Promise<void> {
    this.store.delete(roomId)
  }
}

// -----------------------------
// Persistent Memory Layer
// -----------------------------

export class XrPersistentMemory {
  constructor(private store: EventStore) {}

  async record(event: XrEvent): Promise<void> {
    const record: MemoryRecord = {
      id: `${event.roomId}:${event.timestamp ?? Date.now()}:${Math.random()}`,
      event
    }

    await this.store.append(record)
  }

  async getHistory(roomId: string): Promise<MemoryRecord[]> {
    return this.store.query(roomId)
  }

  async clearRoom(roomId: string) {
    return this.store.clear?.(roomId)
  }
}

// -----------------------------
// Replay Engine
// -----------------------------

export type ReplayState<T = any> = {
  state: T
  lastEvent?: XrEvent
}

export type Reducer<T> = (state: T, event: XrEvent) => T

export class XrReplayEngine<T = any> {
  constructor(private reducer: Reducer<T>, private initialState: T) {}

  replay(events: XrEvent[]): ReplayState<T> {
    let state = this.initialState
    let lastEvent: XrEvent | undefined

    const sorted = [...events].sort(
      (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)
    )

    for (const event of sorted) {
      state = this.reducer(state, event)
      lastEvent = event
    }

    return { state, lastEvent }
  }

  replayRoom(events: MemoryRecord[]): ReplayState<T> {
    return this.replay(events.map(e => e.event))
  }
}

// -----------------------------
// Snapshot + Recovery Layer
// -----------------------------

export type Snapshot<T> = {
  roomId: string
  state: T
  timestamp: number
}

export class XrSnapshotManager<T> {
  private snapshots: Map<string, Snapshot<T>[]> = new Map()

  save(roomId: string, state: T) {
    const list = this.snapshots.get(roomId) ?? []
    list.push({
      roomId,
      state,
      timestamp: Date.now()
    })
    this.snapshots.set(roomId, list)
  }

  getLatest(roomId: string): Snapshot<T> | undefined {
    return this.snapshots.get(roomId)?.slice(-1)[0]
  }

  getAll(roomId: string): Snapshot<T>[] {
    return this.snapshots.get(roomId) ?? []
  }
}

// -----------------------------
// Unified Memory + Replay System
// -----------------------------

export class XrMemoryReplaySystem<T = any> {
  private memory: XrPersistentMemory
  private replayEngine: XrReplayEngine<T>
  private snapshots: XrSnapshotManager<T>

  constructor(
    store: EventStore,
    reducer: Reducer<T>,
    initialState: T
  ) {
    this.memory = new XrPersistentMemory(store)
    this.replayEngine = new XrReplayEngine(reducer, initialState)
    this.snapshots = new XrSnapshotManager<T>()
  }

  async ingest(event: XrEvent) {
    await this.memory.record(event)
  }

  async replayRoom(roomId: string): Promise<ReplayState<T>> {
    const history = await this.memory.getHistory(roomId)
    const result = this.replayEngine.replayRoom(history)

    this.snapshots.save(roomId, result.state)

    return result
  }

  getSnapshot(roomId: string) {
    return this.snapshots.getLatest(roomId)
  }
}
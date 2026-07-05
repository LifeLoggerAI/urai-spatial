// XR Event Bus + Memory Layer (foundation layer)
// Provides pub/sub eventing + in-memory persistence for XR cognition system

export type XrEvent = {
  type: string
  roomId: string
  peerId?: string
  payload?: any
  timestamp?: number
}

export type XrEventHandler = (event: XrEvent) => void | Promise<void>

export class XrEventBus {
  private listeners: Map<string, Set<XrEventHandler>> = new Map()

  emit(event: XrEvent) {
    const handlers = this.listeners.get(event.type)
    if (!handlers) return

    for (const h of handlers) h(event)
  }

  on(type: string, handler: XrEventHandler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(handler)
  }

  off(type: string, handler: XrEventHandler) {
    this.listeners.get(type)?.delete(handler)
  }
}

export type XrMemoryRecord = {
  id: string
  event: XrEvent
  links: string[]
}

export class XrMemoryLayer {
  private memory: Map<string, XrMemoryRecord[]> = new Map()

  record(event: XrEvent, links: string[] = []) {
    const list = this.memory.get(event.roomId) ?? []

    list.push({
      id: `${event.roomId}:${event.timestamp ?? Date.now()}:${Math.random()}`,
      event,
      links
    })

    this.memory.set(event.roomId, list)
  }

  getRoomHistory(roomId: string): XrMemoryRecord[] {
    return this.memory.get(roomId) ?? []
  }

  getLatest(roomId: string): XrMemoryRecord | undefined {
    return this.memory.get(roomId)?.slice(-1)[0]
  }
}

// Cognitive wiring bridge (external adapter point)
export class XrRuntimeCognitiveWire {
  constructor(
    private bus: XrEventBus,
    private memory: XrMemoryLayer,
    private cognitive: { process: (e: any) => any }
  ) {
    this.bus.on('join', this.handle.bind(this))
    this.bus.on('leave', this.handle.bind(this))
    this.bus.on('telemetry', this.handle.bind(this))
    this.bus.on('presence', this.handle.bind(this))
  }

  private handle(event: XrEvent) {
    this.memory.record(event)

    const adapted = this.cognitive.process({
      type: event.type,
      roomId: event.roomId
    })

    if (adapted) {
      this.memory.record({
        type: 'cognitive_update',
        roomId: event.roomId,
        payload: adapted,
        timestamp: Date.now()
      })
    }
  }
}
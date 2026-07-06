import type { KernelEvent } from "../kernel/eventBus";

export interface CommunicationPacket {
  id: string;
  type: string;
  timestamp: number;
  payload?: unknown;
  source?: string;
}

export class CommunicationsBridge {
  private buffer: CommunicationPacket[] = [];

  push(event: KernelEvent) {
    const packet: CommunicationPacket = {
      id: `packet-${event.id}`,
      type: event.type,
      timestamp: event.timestamp,
      payload: event.payload,
      source: event.source
    };

    this.buffer.push(packet);
    return packet;
  }

  flush(): CommunicationPacket[] {
    const out = [...this.buffer];
    this.buffer = [];
    return out;
  }

  peek(): CommunicationPacket[] {
    return [...this.buffer];
  }

  export(): CommunicationPacket[] {
    return this.flush();
  }
}

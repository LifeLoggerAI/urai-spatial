// =====================================================
// URAI SPATIAL → COMMUNICATIONS BRIDGE LAYER
// =====================================================

import { SimulationEvent } from "../index";

/**
 * Bridge: exports simulation events to external systems
 * (e.g., urai-communications repository / service)
 */

export interface CommunicationPacket {
  id: string;
  type: string;
  timestamp: number;
  payload: any;
}

export class CommunicationsBridge {
  private buffer: CommunicationPacket[] = [];

  push(event: SimulationEvent) {
    const packet: CommunicationPacket = {
      id: `${event.type}-${event.timestamp}-${Math.random().toString(36).slice(2)}`,
      type: event.type,
      timestamp: event.timestamp,
      payload: event.payload,
    };

    this.buffer.push(packet);
  }

  flush(): CommunicationPacket[] {
    const out = [...this.buffer];
    this.buffer = [];
    return out;
  }

  /**
   * Simulated export hook (later: HTTP / queue / repo sync)
   */
  export(): void {
    const packets = this.flush();
    if (packets.length === 0) return;

    console.log("[COMM-BRIDGE] exporting packets:", packets.length);
  }
}
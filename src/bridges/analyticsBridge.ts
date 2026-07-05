// =====================================================
// URAI COMMUNICATIONS → ANALYTICS BRIDGE LAYER
// =====================================================

import { CommunicationPacket } from "./communicationsBridge";

/**
 * Ingestion bridge that forwards system events into
 * analytics + observation layer (future urai-analytics repo).
 */

export interface AnalyticsEvent {
  id: string;
  type: string;
  timestamp: number;
  metrics: Record<string, number>;
  raw: CommunicationPacket;
}

export class AnalyticsBridge {
  private buffer: AnalyticsEvent[] = [];

  ingest(packet: CommunicationPacket) {
    const metrics: Record<string, number> = {
      payloadSize: JSON.stringify(packet.payload).length,
      typeHash: this.hashString(packet.type),
      timestamp: packet.timestamp,
    };

    const event: AnalyticsEvent = {
      id: `an-${packet.id}`,
      type: packet.type,
      timestamp: packet.timestamp,
      metrics,
      raw: packet,
    };

    this.buffer.push(event);
  }

  flush(): AnalyticsEvent[] {
    const out = [...this.buffer];
    this.buffer = [];
    return out;
  }

  summarize() {
    const events = this.buffer;

    return {
      totalEvents: events.length,
      avgPayloadSize:
        events.reduce((a, b) => a + b.metrics.payloadSize, 0) /
        Math.max(1, events.length),
      dominantTypes: this.topTypes(events),
    };
  }

  private topTypes(events: AnalyticsEvent[]) {
    const map = new Map<string, number>();

    for (const e of events) {
      map.set(e.type, (map.get(e.type) || 0) + 1);
    }

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
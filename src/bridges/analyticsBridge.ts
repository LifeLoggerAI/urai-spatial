import type { CommunicationPacket } from "./communicationsBridge";

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
      payloadSize: JSON.stringify(packet.payload ?? null).length,
      typeHash: this.hashString(packet.type),
      timestamp: packet.timestamp
    };

    const event: AnalyticsEvent = {
      id: `analytics-${packet.id}`,
      type: packet.type,
      timestamp: packet.timestamp,
      metrics,
      raw: packet
    };

    this.buffer.push(event);
    return event;
  }

  flush(): AnalyticsEvent[] {
    const out = [...this.buffer];
    this.buffer = [];
    return out;
  }

  peek(): AnalyticsEvent[] {
    return [...this.buffer];
  }

  summarize(events = this.buffer) {
    return {
      totalEvents: events.length,
      avgPayloadSize:
        events.reduce((sum, event) => sum + event.metrics.payloadSize, 0) /
        Math.max(1, events.length),
      dominantTypes: this.topTypes(events)
    };
  }

  private topTypes(events: AnalyticsEvent[]) {
    const map = new Map<string, number>();

    for (const event of events) {
      map.set(event.type, (map.get(event.type) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }

  private hashString(str: string): number {
    let hash = 0;

    for (let i = 0; i < str.length; i += 1) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }

    return hash;
  }
}

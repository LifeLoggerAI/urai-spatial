import React, { useEffect, useState } from "react";
import { createTelemetryLayer } from "../core/bridge/cognitiveUniverse.telemetry";

// Universe Dashboard (READ-ONLY VISUALIZATION LAYER)
// Displays real-time universe telemetry, emergence, and interaction stats

export function UniverseDashboard() {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [telemetry] = useState(() => createTelemetryLayer("demo-user"));

  useEffect(() => {
    telemetry.start(2000);

    const interval = setInterval(() => {
      const s = telemetry.snapshot();
      setSnapshot(s);
    }, 1000);

    return () => {
      clearInterval(interval);
      telemetry.stop();
    };
  }, [telemetry]);

  if (!snapshot) {
    return (
      <div style={{ padding: 20, color: "white", background: "black" }}>
        Loading Universe Telemetry...
      </div>
    );
  }

  return (
    <div style={{ padding: 20, background: "#0b0f1a", color: "#d6e4ff", fontFamily: "monospace" }}>
      <h1>🌌 Universe Dashboard</h1>

      <div style={{ marginTop: 20 }}>
        <h2>Core State</h2>
        <pre>{JSON.stringify({
          tick: snapshot.tick,
          worlds: snapshot.worlds,
          memoryNodes: snapshot.memoryNodes,
          edges: snapshot.edges
        }, null, 2)}</pre>
      </div>

      <div style={{ marginTop: 20 }}>
        <h2>Emergence</h2>
        <pre>{JSON.stringify({
          globalCoherence: snapshot.globalCoherence,
          entropy: snapshot.entropy
        }, null, 2)}</pre>
      </div>

      <div style={{ marginTop: 20 }}>
        <h2>Interaction Field</h2>
        <pre>{JSON.stringify({
          interactionDensity: snapshot.interactionDensity,
          messageCount: snapshot.messageCount
        }, null, 2)}</pre>
      </div>
    </div>
  );
}

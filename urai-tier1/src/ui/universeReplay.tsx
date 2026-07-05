import React, { useEffect, useMemo, useState } from "react";
import { createUniverseEventLog } from "../core/bridge/cognitiveUniverse.eventLog";

// UNIVERSE REPLAY UI
// Allows scrubbing through deterministic event-sourced universe history

export function UniverseReplay() {
  const log = useMemo(() => createUniverseEventLog(), []);

  const [events, setEvents] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setEvents(log.getEvents());
  }, [log]);

  useEffect(() => {
    if (!playing) return;

    const interval = setInterval(() => {
      setIndex(i => {
        const next = i + 1;
        return next > events.length ? events.length : next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [playing, events.length]);

  const currentFrame = useMemo(() => {
    return log.replay(0, index);
  }, [index, log]);

  return (
    <div style={{ padding: 20, background: "#050814", color: "#cfe3ff", fontFamily: "monospace" }}>
      <h1>⏳ Universe Replay Mode</h1>

      <div style={{ marginTop: 20 }}>
        <button onClick={() => setPlaying(p => !p)}>
          {playing ? "Pause" : "Play"}
        </button>

        <button onClick={() => setIndex(0)} style={{ marginLeft: 10 }}>
          Reset
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <input
          type="range"
          min={0}
          max={events.length}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <h2>Timeline Frame</h2>
        <pre style={{ maxHeight: 400, overflow: "auto" }}>
          {JSON.stringify(currentFrame.slice(-20), null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: 20 }}>
        <h2>Event Count</h2>
        <pre>{events.length}</pre>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { createUniversePersistence } from "../core/persistence/cognitiveUniverse.persistence";

// UNIVERSE FORK UI
// Allows creating branched versions of a universe state (like git for realities)

export function UniverseFork() {
  const persistence = useState(() => createUniversePersistence("demo-user"))[0];

  const [forks, setForks] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("idle");

  function handleFork() {
    setStatus("forking...");

    const snapshot = persistence.saveSnapshot();

    const fork = {
      id: `fork-${Date.now()}`,
      timestamp: snapshot.timestamp,
      worlds: snapshot.worlds,
      memoryNodes: snapshot.memoryGraph?.nodes?.length ?? 0,
      interactions: snapshot.interactions?.messages?.length ?? 0
    };

    setForks(prev => [fork, ...prev]);
    setStatus("fork created");

    setTimeout(() => setStatus("idle"), 1000);
  }

  return (
    <div style={{ padding: 20, background: "#070a12", color: "#d6e4ff", fontFamily: "monospace" }}>
      <h1>🌌 Universe Fork Mode</h1>

      <button onClick={handleFork} style={{ padding: 10, marginTop: 10 }}>
        Create Universe Fork
      </button>

      <p>Status: {status}</p>

      <div style={{ marginTop: 20 }}>
        <h2>Fork History</h2>

        {forks.length === 0 && <p>No forks yet</p>}

        {forks.map(f => (
          <div key={f.id} style={{ marginBottom: 10, padding: 10, border: "1px solid #2a3550" }}>
            <div>ID: {f.id}</div>
            <div>Time: {new Date(f.timestamp).toLocaleString()}</div>
            <div>Worlds: {f.worlds?.length ?? 0}</div>
            <div>Memory Nodes: {f.memoryNodes}</div>
            <div>Interactions: {f.interactions}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

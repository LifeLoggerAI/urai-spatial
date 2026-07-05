"use client";

import { useUniverse } from "../hooks/useUniverse";
import UniverseViz from "./UniverseViz";

export default function LiveControlPanel() {
  const { state, refresh, loading } = useUniverse();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div>
        <h2>Controls</h2>
        <button onClick={refresh}>
          {loading ? "Running..." : "Run Simulation Step"}
        </button>

        <pre style={{ marginTop: 20 }}>
          {JSON.stringify(state, null, 2)}
        </pre>
      </div>

      <div>
        <h2>Universe View</h2>
        <UniverseViz state={state} />
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";

/**
 * URAI OS COCKPIT UI
 * ------------------
 * Live control interface for URAI Brain Map + Control Plane
 */

type Service = {
  name: string;
  type?: string;
  status?: string;
};

export default function App() {
  const [data, setData] = useState<any>(null);

  async function load() {
    try {
      const res = await fetch("/control-plane/status");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setData(null);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", height: "100vh", background: "#0b0f19", color: "white" }}>
      {/* LEFT PANEL */}
      <div style={{ padding: 16, borderRight: "1px solid #222" }}>
        <h2>URAI OS Cockpit</h2>

        <h3>System Summary</h3>
        <pre style={{ fontSize: 12 }}>
          {data ? JSON.stringify(data.health?.summary || {}, null, 2) : "Loading..."}
        </pre>

        <h3>Services</h3>
        <ul>
          {data?.health?.services?.map((s: Service, i: number) => (
            <li key={i}>
              {s.name} — {s.status}
            </li>
          ))}
        </ul>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ padding: 16 }}>
        <h3>Live Brain Map View</h3>
        <div style={{ border: "1px solid #333", height: "90%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ opacity: 0.7 }}>
            Brain Map Canvas will render here (connected to urai-studio BrainMap)
          </p>
        </div>
      </div>
    </div>
  );
}
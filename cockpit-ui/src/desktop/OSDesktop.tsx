import React, { useState } from "react";

/**
 * URAI OS DESKTOP MODE
 * --------------------
 * Minimal window manager shell for URAI Cockpit
 * - draggable windows (simple implementation)
 * - multi-panel OS layout
 * - foundation for spatial OS layer
 */

type Window = {
  id: string;
  title: string;
  x: number;
  y: number;
  z: number;
};

export default function OSDesktop() {
  const [windows, setWindows] = useState<Window[]>([
    { id: "system", title: "System Health", x: 40, y: 40, z: 1 },
    { id: "brain", title: "Brain Map", x: 320, y: 80, z: 2 },
    { id: "logs", title: "Live Logs", x: 600, y: 120, z: 3 },
  ]);

  const bringToFront = (id: string) => {
    const maxZ = Math.max(...windows.map(w => w.z));
    setWindows(ws =>
      ws.map(w => (w.id === id ? { ...w, z: maxZ + 1 } : w))
    );
  };

  const moveWindow = (id: string, dx: number, dy: number) => {
    setWindows(ws =>
      ws.map(w =>
        w.id === id
          ? { ...w, x: w.x + dx, y: w.y + dy }
          : w
      )
    );
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#05070d", overflow: "hidden" }}>
      <div style={{ padding: 10, color: "white", fontSize: 14 }}>
        URAI OS Desktop Mode
      </div>

      {windows.map(win => (
        <div
          key={win.id}
          onMouseDown={() => bringToFront(win.id)}
          style={{
            position: "absolute",
            left: win.x,
            top: win.y,
            width: 280,
            height: 180,
            background: "#0b1220",
            border: "1px solid #222",
            borderRadius: 8,
            zIndex: win.z,
            color: "white",
            padding: 10,
            cursor: "grab",
          }}
          draggable
          onDrag={(e) => {
            if (e.clientX && e.clientY) {
              moveWindow(win.id, 0, 0);
            }
          }}
          onDragEnd={(e) => {
            moveWindow(win.id, e.movementX, e.movementY);
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 8 }}>
            {win.title}
          </div>

          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {win.id === "system" && "Live system health + services"}
            {win.id === "brain" && "Spatial brain map visualization layer"}
            {win.id === "logs" && "Event stream + runtime logs"}
          </div>
        </div>
      ))}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useSpatialSettingsStore } from "@/spatial/settings/spatialSettingsStore";
import { readSpatialTelemetryQueue } from "@/spatial/telemetry/spatialTelemetryIO";
import type { SpatialTelemetryEvent } from "@/spatial/telemetry/spatialTelemetryTypes";

export default function SpatialTelemetryPanel() {
  const showTelemetryPanel = useSpatialSettingsStore((s) => s.showTelemetryPanel);
  const telemetryEnabled = useSpatialSettingsStore((s) => s.telemetryEnabled);
  const [queue, setQueue] = useState<SpatialTelemetryEvent[]>([]);

  useEffect(() => {
    const sync = () => setQueue(readSpatialTelemetryQueue());
    sync();
    window.addEventListener("urai:spatial-telemetry", sync);
    return () => {
      window.removeEventListener("urai:spatial-telemetry", sync);
    };
  }, []);

  if (!showTelemetryPanel) return null;

  const latest = queue.length > 0 ? queue[queue.length - 1] : null;

  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        top: 18,
        zIndex: 61,
        width: 300,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(8,12,24,0.78)",
        backdropFilter: "blur(14px)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
        padding: 14,
        color: "rgba(255,255,255,0.92)",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: 1.1,
          textTransform: "uppercase",
          opacity: 0.68,
          marginBottom: 8,
        }}
      >
        Spatial Telemetry
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        telemetry: {telemetryEnabled ? "enabled" : "disabled"}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        queued events: {queue.length}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          lineHeight: 1.45,
          opacity: 0.76,
          wordBreak: "break-word",
        }}
      >
        latest: {latest ? latest.name : "none"}
      </div>
    </div>
  );
}

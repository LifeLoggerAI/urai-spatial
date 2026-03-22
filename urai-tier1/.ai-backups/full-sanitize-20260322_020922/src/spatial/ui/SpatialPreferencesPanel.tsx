"use client";

import type { CSSProperties } from "react";
import { useSpatialSettingsStore } from "@/spatial/settings/spatialSettingsStore";

export default function SpatialPreferencesPanel() {
  const reducedMotion = useSpatialSettingsStore((s) => s.reducedMotion);
  const showImportExport = useSpatialSettingsStore((s) => s.showImportExport);
  const telemetryEnabled = useSpatialSettingsStore((s) => s.telemetryEnabled);
  const showTelemetryPanel = useSpatialSettingsStore((s) => s.showTelemetryPanel);
  const persistSnapshots = useSpatialSettingsStore((s) => s.persistSnapshots);

  const setReducedMotion = useSpatialSettingsStore((s) => s.setReducedMotion);
  const setShowImportExport = useSpatialSettingsStore((s) => s.setShowImportExport);
  const setTelemetryEnabled = useSpatialSettingsStore((s) => s.setTelemetryEnabled);
  const setShowTelemetryPanel = useSpatialSettingsStore((s) => s.setShowTelemetryPanel);
  const setPersistSnapshots = useSpatialSettingsStore((s) => s.setPersistSnapshots);

  return (
    <div
      style={{
        position: "fixed",
        left: 18,
        bottom: 18,
        zIndex: 61,
        width: 292,
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
        Spatial Preferences
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <ToggleRow
          label="Reduced motion"
          value={reducedMotion}
          onClick={() => setReducedMotion(!reducedMotion)}
        />
        <ToggleRow
          label="Show import/export"
          value={showImportExport}
          onClick={() => setShowImportExport(!showImportExport)}
        />
        <ToggleRow
          label="Telemetry enabled"
          value={telemetryEnabled}
          onClick={() => setTelemetryEnabled(!telemetryEnabled)}
        />
        <ToggleRow
          label="Show telemetry panel"
          value={showTelemetryPanel}
          onClick={() => setShowTelemetryPanel(!showTelemetryPanel)}
        />
        <ToggleRow
          label="Persist snapshots"
          value={persistSnapshots}
          onClick={() => setPersistSnapshots(!persistSnapshots)}
        />
      </div>
    </div>
  );
}

function ToggleRow(input: {
  label: string;
  value: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={input.onClick} style={rowStyle}>
      <span>{input.label}</span>
      <span style={{ opacity: 0.72 }}>{input.value ? "on" : "off"}</span>
    </button>
  );
}

const rowStyle: CSSProperties = {
  appearance: "none",
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  fontSize: 13,
  padding: "10px 12px",
  cursor: "pointer",
};

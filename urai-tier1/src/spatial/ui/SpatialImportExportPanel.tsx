"use client";

import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import {
  SPATIAL_PERSISTENCE_STORAGE_KEY,
  type SpatialPersistenceSnapshot,
} from "@/spatial/persistence/spatialPersistenceTypes";
import {
  readSpatialPersistenceSnapshot,
  writeSpatialPersistenceSnapshot,
} from "@/spatial/persistence/spatialPersistenceIO";
import { isSpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceValidation";
import { useSpatialSettingsStore } from "@/spatial/settings/spatialSettingsStore";

type PersistenceWindow = Window & {
  __URAI_SPATIAL_PERSISTENCE__?: SpatialPersistenceSnapshot;
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SpatialImportExportPanel() {
  const showImportExport = useSpatialSettingsStore((s) => s.showImportExport);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string>("idle");

  const snapshot = useMemo(() => readSpatialPersistenceSnapshot(), [status]);

  if (!showImportExport) return null;

  const exportSnapshot = () => {
    const current = readSpatialPersistenceSnapshot();
    if (!current) {
      setStatus("no saved snapshot to export");
      return;
    }

    downloadJson(
      `urai-spatial-snapshot-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`,
      current,
    );
    setStatus("snapshot exported");
  };

  const importSnapshot = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      if (!isSpatialPersistenceSnapshot(parsed)) {
        setStatus("invalid snapshot file");
        return;
      }

      writeSpatialPersistenceSnapshot(parsed);

      const target = window as PersistenceWindow;
      target.__URAI_SPATIAL_PERSISTENCE__ = parsed;

      window.dispatchEvent(
        new CustomEvent("urai:spatial-persistence-imported", {
          detail: parsed,
        }),
      );

      setStatus("snapshot imported");
    } catch (_err) {
      setStatus("import failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const clearSnapshot = () => {
    try {
      window.localStorage.removeItem(SPATIAL_PERSISTENCE_STORAGE_KEY);
      const target = window as PersistenceWindow;
      target.__URAI_SPATIAL_PERSISTENCE__ = undefined;
      window.dispatchEvent(
        new CustomEvent("urai:spatial-persistence-cleared"),
      );
      setStatus("snapshot cleared");
    } catch (_err) {
      setStatus("clear failed");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 60,
        width: 280,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(8,12,24,0.76)",
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
        Spatial I/O
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.45,
          opacity: 0.88,
          marginBottom: 10,
        }}
      >
        current snapshot: {snapshot ? "present" : "none"}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <button type="button" onClick={exportSnapshot} style={buttonStyle}>
          Export snapshot
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={buttonStyle}
        >
          Import snapshot
        </button>

        <button type="button" onClick={clearSnapshot} style={buttonStyle}>
          Clear saved snapshot
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void importSnapshot(file);
          }
        }}
      />

      <div
        style={{
          fontSize: 12,
          opacity: 0.7,
          lineHeight: 1.4,
        }}
      >
        status: {status}
      </div>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  appearance: "none",
  width: "100%",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  fontSize: 13,
  padding: "10px 12px",
  textAlign: "left",
  cursor: "pointer",
};

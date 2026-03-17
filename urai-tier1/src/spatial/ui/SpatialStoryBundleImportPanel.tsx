"use client";

import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import type { SpatialStoryBundle } from "@/spatial/bundles/spatialStoryBundleTypes";
import { isSpatialStoryBundle } from "@/spatial/bundles/spatialStoryBundleValidation";
import {
  readSpatialPersistenceSnapshot,
  writeSpatialPersistenceSnapshot,
} from "@/spatial/persistence/spatialPersistenceIO";

type BundleWindow = Window & {
  __URAI_SPATIAL_IMPORTED_STORY_BUNDLE__?: SpatialStoryBundle;
};

type PersistenceWindow = Window & {
  __URAI_SPATIAL_PERSISTENCE__?: unknown;
};

export default function SpatialStoryBundleImportPanel() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState("idle");
  const [bundle, setBundle] = useState<SpatialStoryBundle | null>(null);

  const currentSnapshot = useMemo(() => readSpatialPersistenceSnapshot(), [status]);

  const importBundle = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      if (!isSpatialStoryBundle(parsed)) {
        setStatus("invalid story bundle");
        return;
      }

      setBundle(parsed);

      const bundleWindow = window as BundleWindow;
      bundleWindow.__URAI_SPATIAL_IMPORTED_STORY_BUNDLE__ = parsed;

      window.dispatchEvent(
        new CustomEvent("urai:spatial-story-bundle-imported", {
          detail: parsed,
        }),
      );

      setStatus("story bundle imported");
    } catch (_err) {
      setStatus("bundle import failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const restoreSnapshot = () => {
    if (!bundle?.snapshot) {
      setStatus("no imported bundle snapshot");
      return;
    }

    writeSpatialPersistenceSnapshot(bundle.snapshot);

    const target = window as PersistenceWindow;
    target.__URAI_SPATIAL_PERSISTENCE__ = bundle.snapshot;

    window.dispatchEvent(
      new CustomEvent("urai:spatial-story-bundle-restored", {
        detail: bundle,
      }),
    );

    setStatus("bundle snapshot restored");
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 706,
        bottom: 190,
        zIndex: 71,
        width: 332,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(8,12,24,0.80)",
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
        Story Bundle Import
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        current snapshot: {currentSnapshot ? "present" : "none"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        imported bundle: {bundle ? bundle.account.label ?? bundle.account.id : "none"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        imported lens: {bundle?.activeLens?.label ?? "none"}
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 10, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={buttonStyle}
        >
          Import story bundle JSON
        </button>
        <button type="button" onClick={restoreSnapshot} style={buttonStyle}>
          Restore imported snapshot
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
            void importBundle(file);
          }
        }}
      />

      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        status: {status}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          lineHeight: 1.45,
          opacity: 0.82,
          whiteSpace: "pre-wrap",
          maxHeight: 140,
          overflow: "auto",
        }}
      >
        {bundle ? bundle.summaryText : "No imported story bundle."}
      </div>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  appearance: "none",
  width: "100%",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  fontSize: 13,
  padding: "10px 12px",
  textAlign: "left",
  cursor: "pointer",
};

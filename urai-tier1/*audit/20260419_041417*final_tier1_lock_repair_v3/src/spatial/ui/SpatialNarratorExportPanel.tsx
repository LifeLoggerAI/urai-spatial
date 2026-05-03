"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useSpatialAccountStore } from "@/spatial/account/spatialAccountStore";
import { useSpatialCompareStore } from "@/spatial/compare/spatialCompareStore";
import { useSpatialLensStore } from "@/spatial/lenses/spatialLensStore";
import { buildSpatialNarratorExport } from "@/spatial/narrator/buildSpatialNarratorExport";
import { readSpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceIO";

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJson(filename: string, data: any) {
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

export default function SpatialNarratorExportPanel() {
  const activeAccountId = useSpatialAccountStore((s) => s.activeAccountId);
  const profiles = useSpatialAccountStore((s) => s.profiles);

  const activeLensId = useSpatialLensStore((s) => s.activeLensId);
  const lenses = useSpatialLensStore((s) => s.lenses);

  const compareSets = useSpatialCompareStore((s) => s.sets);

  const [status, setStatus] = useState("idle");

  const snapshot = useMemo(() => readSpatialPersistenceSnapshot(), [status]);

  const activeProfile = useMemo(
    () => profiles.find((item) => item.id === activeAccountId) ?? null,
    [profiles, activeAccountId],
  );

  const activeLens = useMemo(
    () => lenses.find((item) => item.id === activeLensId) ?? null,
    [lenses, activeLensId],
  );

  const activeCompareSet = useMemo(() => {
    if (!activeLens?.compareSetId) return compareSets.length > 0 ? compareSets[compareSets.length - 1] : null;
    return compareSets.find((item) => item.id === activeLens.compareSetId) ?? null;
  }, [compareSets, activeLens]);

  const normalizedActiveCompareSet = activeCompareSet
    ? ({
        ...(activeCompareSet as Record<string, unknown>),
        label:
          (activeCompareSet as { label?: string; id?: string }).label ??
          (activeCompareSet as { label?: string; id?: string }).id ??
          "Compare Set",
      } as any)
    : null;

  const exportPackage = useMemo(() => {
    const normalizedActiveCompareSet = activeCompareSet
      ? ({
          ...(activeCompareSet as Record<string, unknown>),
          label:
            (activeCompareSet as { label?: string; id?: string }).label ??
            (activeCompareSet as { label?: string; id?: string }).id ??
            "Compare Set",
        } as any)
      : null;
    if (!snapshot) return null;


    return buildSpatialNarratorExport({
      accountId: activeAccountId,
      accountLabel: ((activeProfile as { title?: string; name?: string } | null)?.title ?? (activeProfile as { title?: string; name?: string } | null)?.name ?? activeAccountId),
      activeLens,
      activeCompareSet: normalizedActiveCompareSet,
      compareSetCount: compareSets.length,
      snapshot,
    });
  }, [
    snapshot,
    activeAccountId,
    activeProfile,
    activeLens,
    activeCompareSet,
    compareSets.length,
  ]);

  const exportTxt = () => {
    if (!exportPackage) {
      setStatus("no persistence snapshot to export");
      return;
    }

    downloadText(
      exportPackage.scriptText,
    );
    setStatus("narrator txt exported");
  };

  const exportJson = () => {
    if (!exportPackage) {
      setStatus("no persistence snapshot to export");
      return;
    }

    downloadJson(
      exportPackage,
    );
    setStatus("narrator json exported");
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        bottom: 150,
        zIndex: 66,
        width: 320,
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
        Narrator Export
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        account: {((activeProfile as { title?: string; name?: string } | null)?.title ?? (activeProfile as { title?: string; name?: string } | null)?.name ?? activeAccountId)}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        lens: {activeLens?.label ?? "none"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        compare set: {activeCompareSet?.label ?? "none"}
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 10, marginBottom: 10 }}>
        <button type="button" onClick={exportTxt} style={buttonStyle}>
          Export narrator TXT
        </button>
        <button type="button" onClick={exportJson} style={buttonStyle}>
          Export narrator JSON
        </button>
      </div>

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
        {exportPackage ? exportPackage.scriptText : "No persistence snapshot available."}
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

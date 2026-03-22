"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useSpatialAccountStore } from "@/spatial/account/spatialAccountStore";
import { useSpatialArcStore } from "@/spatial/arcs/spatialArcStore";
import { buildSpatialStoryBundle } from "@/spatial/bundles/buildSpatialStoryBundle";
import { useSpatialCompareStore } from "@/spatial/compare/spatialCompareStore";
import { useSpatialLensStore } from "@/spatial/lenses/spatialLensStore";
import { buildSpatialNarratorExport } from "@/spatial/narrator/buildSpatialNarratorExport";
import { readSpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceIO";
import { useSpatialSeasonalArcStore } from "@/spatial/seasonal/spatialSeasonalArcStore";
import { toSpatialNarrativeArcs } from "@/spatial/narrative/toSpatialNarrativeArc";

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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

export default function SpatialStoryBundlePanel() {
  const activeAccountId = useSpatialAccountStore((s) => s.activeAccountId);
  const profiles = useSpatialAccountStore((s) => s.profiles);

  const activeLensId = useSpatialLensStore((s) => s.activeLensId);
  const lenses = useSpatialLensStore((s) => s.lenses);

  const compareSets = useSpatialCompareStore((s) => s.sets);
  const arcs = useSpatialArcStore((s) => s.arcs);
  const seasonalArcs = useSpatialSeasonalArcStore((s) => s.seasonalArcs);

  const [status, setStatus] = useState("idle");

  const snapshot = useMemo(() => readSpatialPersistenceSnapshot(), [
    activeAccountId,
    activeLensId,
    compareSets.length,
    arcs.length,
    seasonalArcs.length,
    status,
  ]);

  const activeProfile = useMemo(
    () => profiles.find((item) => item.id === activeAccountId) ?? null,
    [profiles, activeAccountId],
  );

  const activeLens = useMemo(
    () => lenses.find((item) => item.id === activeLensId) ?? null,
    [lenses, activeLensId],
  );

  const activeCompareSet = useMemo(() => {
    if (!activeLens?.compareSetId) {
      return compareSets.length > 0 ? compareSets[compareSets.length - 1] : null;
    }
    return compareSets.find((item) => item.id === activeLens.compareSetId) ?? null;
  }, [compareSets, activeLens]);

  const narratorExport = useMemo(() => {
    if (!snapshot) return null;
    const normalizedActiveCompareSet = activeCompareSet
      ? ({
          ...(activeCompareSet as Record<string, unknown>),
          label:
            (activeCompareSet as { label?: string; id?: string }).label ??
            (activeCompareSet as { label?: string; id?: string }).id ??
            "Compare Set",
        } as any)
      : null;

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

  const bundle = useMemo(() => {
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
    const normalizedArcs = toSpatialNarrativeArcs(arcs);
    const normalizedSeasonalArcs = seasonalArcs;
    return buildSpatialStoryBundle({
      accountId: activeAccountId,
      accountLabel: ((activeProfile as { title?: string; name?: string } | null)?.title ?? (activeProfile as { title?: string; name?: string } | null)?.name ?? activeAccountId),
      snapshot,
      activeLens,
      activeCompareSet: normalizedActiveCompareSet,
    arcs: normalizedArcs,
    seasonalArcs: normalizedSeasonalArcs,
      narrator: narratorExport,
    });
  }, [
    snapshot,
    activeAccountId,
    activeProfile,
    activeLens,
    activeCompareSet,
    arcs,
    seasonalArcs,
    narratorExport,
  ]);

  const exportTxt = () => {
    if (!bundle) {
      setStatus("no persistence snapshot to bundle");
      return;
    }

    const text = [
      bundle.summaryText,
      "",
      "Narrator script:",
      bundle.narrator?.scriptText ?? "none",
    ].join("\n");

    downloadText(
      `urai-story-bundle-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`,
      text,
    );
    setStatus("story bundle txt exported");
  };

  const exportJson = () => {
    if (!bundle) {
      setStatus("no persistence snapshot to bundle");
      return;
    }

    downloadJson(
      `urai-story-bundle-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
      bundle,
    );
    setStatus("story bundle json exported");
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 360,
        bottom: 190,
        zIndex: 70,
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
        Story Bundle
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        account: {((activeProfile as { title?: string; name?: string } | null)?.title ?? (activeProfile as { title?: string; name?: string } | null)?.name ?? activeAccountId)}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        arcs: {arcs.length}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        seasonal arcs: {seasonalArcs.length}
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 10, marginBottom: 10 }}>
        <button type="button" onClick={exportTxt} style={buttonStyle}>
          Export bundle TXT
        </button>
        <button type="button" onClick={exportJson} style={buttonStyle}>
          Export bundle JSON
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
        {bundle ? bundle.summaryText : "No story bundle available."}
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

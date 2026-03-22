import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useSpatialAccountStore } from "@/spatial/account/spatialAccountStore";
import { buildSpatialCuratedDeckExport } from "@/spatial/curation/buildSpatialCuratedDeckExport";
import { useSpatialCurationBoardStore } from "@/spatial/curation/spatialCurationBoardStore";
import { useSpatialStoryBundleVaultStore } from "@/spatial/vault/spatialStoryBundleVaultStore";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

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

export default function SpatialCuratedDeckExportPanel() {
  const activeAccountId = useSpatialAccountStore((s) => s.activeAccountId);
  const profiles = useSpatialAccountStore((s) => s.profiles);

  const boardItems = useSpatialCurationBoardStore((s) => s.items);
  const vaultEntries = useSpatialStoryBundleVaultStore((s) => s.entries);

  const [status, setStatus] = useState("idle");

  const activeProfile = useMemo(
    () => profiles.find((item) => item.id === activeAccountId) ?? null,
    [profiles, activeAccountId],
  );

  const exportPackage = useMemo(
    () =>
      buildSpatialCuratedDeckExport({
        accountId: activeAccountId,
        accountLabel: ((activeProfile as { title?: string; name?: string } | null)?.title ?? (activeProfile as { title?: string; name?: string } | null)?.name ?? null),
        items: boardItems,
        vaultEntries,
      }),
    [activeAccountId, activeProfile, boardItems, vaultEntries],
  );

  const exportTxt = () => {
    if (exportPackage.cardCount === 0) {
      setStatus("no curated cards to export");
      return;
    }

    const text = [
      exportPackage.summaryText,
      "",
      ...exportPackage.cards.map(
        (card, index) =>
          `Card ${index + 1}\n` +
          `Label: ${card.label}\n` +
          `Source: ${card.source}\n` +
          `Scene: ${card.sceneMode}\n` +
          `Selected star: ${card.selectedStarId ?? "none"}\n` +
          `Narrator: ${card.narratorTitle ?? "none"}\n` +
          `Note: ${card.note}\n` +
          `Summary: ${card.summary}\n`,
      ),
    ].join("\n");

    downloadText(
      `urai-curated-deck-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`,
      text,
    );
    setStatus("curated deck txt exported");
  };

  const exportJson = () => {
    if (exportPackage.cardCount === 0) {
      setStatus("no curated cards to export");
      return;
    }

    downloadJson(
      `urai-curated-deck-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
      exportPackage,
    );
    setStatus("curated deck json exported");
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 1052,
        top: 150,
        zIndex: 77,
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
        Curated Deck Export
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        account: {((activeProfile as { title?: string; name?: string } | null)?.title ?? (activeProfile as { title?: string; name?: string } | null)?.name ?? activeAccountId)}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        curated cards: {exportPackage.cardCount}
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 10, marginBottom: 10 }}>
        <button type="button" onClick={exportTxt} style={buttonStyle}>
          Export curated TXT
        </button>
        <button type="button" onClick={exportJson} style={buttonStyle}>
          Export curated JSON
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
        {exportPackage.summaryText}
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

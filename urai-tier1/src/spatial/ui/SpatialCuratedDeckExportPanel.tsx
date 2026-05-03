"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useSpatialAccountStore } from "@/spatial/account/spatialAccountStore";
import { buildSpatialCuratedDeckExport } from "@/spatial/curation/buildSpatialCuratedDeckExport";
import { useSpatialCurationBoardStore } from "@/spatial/curation/spatialCurationBoardStore";
import { useSpatialStoryBundleVaultStore } from "@/spatial/vault/spatialStoryBundleVaultStore";

function downloadText(filename: string, text: string) { const blob = new Blob([text], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
function downloadJson(filename: string, data: unknown) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }

export default function SpatialCuratedDeckExportPanel() {
  const activeAccountId = useSpatialAccountStore((s) => s.activeAccountId);
  const profiles = useSpatialAccountStore((s) => s.profiles);
  const boardItems = useSpatialCurationBoardStore((s) => s.items);
  const vaultEntries = useSpatialStoryBundleVaultStore((s) => s.entries);
  const [status, setStatus] = useState("idle");

  const activeProfile = useMemo(() => profiles.find((item) => item.id === activeAccountId) ?? null, [profiles, activeAccountId]);
  const accountLabel = (activeProfile as { title?: string; name?: string } | null)?.title ?? (activeProfile as { title?: string; name?: string } | null)?.name ?? activeAccountId;

  const exportPackage = useMemo(() => buildSpatialCuratedDeckExport({ accountId: activeAccountId, accountLabel, items: boardItems, vaultEntries }), [activeAccountId, accountLabel, boardItems, vaultEntries]);

  const exportTxt = () => {
    if (exportPackage.cardCount === 0) return setStatus("no curated cards to export");
    const text = [exportPackage.summaryText, "", ...exportPackage.cards.map((card, index) => `${index + 1}. ${card.title}\n${card.summary}`)].join("\n");
    downloadText(`urai-curated-${Date.now()}.txt`, text);
    setStatus("curated deck txt exported");
  };
  const exportJson = () => { if (exportPackage.cardCount === 0) return setStatus("no curated cards to export"); downloadJson(`urai-curated-${Date.now()}.json`, exportPackage); setStatus("curated deck json exported"); };

  return <div style={panelStyle}><div style={titleStyle}>Curated Deck Export</div><div style={metaStyle}>account: {accountLabel}</div><div style={metaStyle}>curated cards: {exportPackage.cardCount}</div><div style={{ display: "grid", gap: 8, marginTop: 10, marginBottom: 10 }}><button type="button" onClick={exportTxt} style={buttonStyle}>Export curated TXT</button><button type="button" onClick={exportJson} style={buttonStyle}>Export curated JSON</button></div><div style={metaStyle}>status: {status}</div><div style={summaryStyle}>{exportPackage.summaryText}</div></div>;
}

const panelStyle: CSSProperties = { position: "fixed", left: 1052, top: 150, zIndex: 77, width: 332, borderRadius: 16, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(8,12,24,0.80)", backdropFilter: "blur(14px)", boxShadow: "0 18px 60px rgba(0,0,0,0.28)", padding: 14, color: "rgba(255,255,255,0.92)", fontFamily: "inherit" };
const titleStyle: CSSProperties = { fontSize: 12, letterSpacing: 1.1, textTransform: "uppercase", opacity: 0.68, marginBottom: 8 };
const metaStyle: CSSProperties = { fontSize: 12, lineHeight: 1.45, opacity: 0.82 };
const summaryStyle: CSSProperties = { marginTop: 10, fontSize: 12, lineHeight: 1.45, opacity: 0.82, whiteSpace: "pre-wrap", maxHeight: 140, overflow: "auto" };
const buttonStyle: CSSProperties = { appearance: "none", width: "100%", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.92)", fontSize: 13, padding: "10px 12px", textAlign: "left", cursor: "pointer" };

"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useSpatialAccountStore } from "@/spatial/account/spatialAccountStore";
import { buildSpatialCuratedDeckExport } from "@/spatial/curation/buildSpatialCuratedDeckExport";
import {
  appendSpatialCuratedDeckVaultEntry,
  readSpatialCuratedDeckVaultManifest,
  writeSpatialCuratedDeckVaultManifest,
} from "@/spatial/curation/spatialCuratedDeckVaultIO";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";
import type { SpatialCuratedDeckExport } from "@/spatial/curation/spatialCuratedDeckExportTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";
import {
  SPATIAL_CURATED_DECK_VAULT_RESTORED_EVENT,
} from "@/spatial/curation/spatialCuratedDeckImportTypes";
import type {
  SpatialCuratedDeckImportWindow,
  SpatialCuratedDeckVaultRestoredEventDetail,
} from "@/spatial/curation/spatialCuratedDeckImportTypes";
import { useSpatialCurationBoardStore } from "@/spatial/curation/spatialCurationBoardStore";
import { useSpatialStoryBundleVaultStore } from "@/spatial/vault/spatialStoryBundleVaultStore";

export default function SpatialCuratedDeckVaultPanel() {
  const activeAccountId = useSpatialAccountStore((s) => s.activeAccountId);
  const profiles = useSpatialAccountStore((s) => s.profiles);

  const boardItems = useSpatialCurationBoardStore((s) => s.items);
  const vaultEntries = useSpatialStoryBundleVaultStore((s) => s.entries);

  const activeEntryId = useSpatialCuratedDeckVaultStore((s) => s.activeEntryId);
  const entries = useSpatialCuratedDeckVaultStore((s) => s.entries);
  const replaceManifest = useSpatialCuratedDeckVaultStore((s) => s.replaceManifest);
  const setActiveEntryId = useSpatialCuratedDeckVaultStore((s) => s.setActiveEntryId);

  const [status, setStatus] = useState("idle");

  const activeProfile = useMemo(
    () => profiles.find((item) => item.id === activeAccountId) ?? null,
    [profiles, activeAccountId],
  );

  const generatedDeck = useMemo(
    () =>
      buildSpatialCuratedDeckExport({
        accountId: activeAccountId,
        accountLabel: activeProfile?.label ?? null,
        items: boardItems,
        vaultEntries,
      }),
    [activeAccountId, activeProfile, boardItems, vaultEntries],
  );

  const activeVaultEntry = useMemo(
    () => entries.find((item) => item.id === activeEntryId) ?? null,
    [entries, activeEntryId],
  );

  const persistEntry = (entry: SpatialCuratedDeckVaultEntry) => {
    const manifest = readSpatialCuratedDeckVaultManifest();
    const next = appendSpatialCuratedDeckVaultEntry(manifest, entry);
    writeSpatialCuratedDeckVaultManifest(next);
    replaceManifest(next);
  };

  const archiveGeneratedDeck = () => {
    if (generatedDeck.cardCount === 0) {
      setStatus("no generated curated deck");
      return;
    }

    persistEntry({
      id:
        "curated_vault_" +
        Math.random().toString(36).slice(2) +
        "_" +
        Date.now().toString(36),
      label: `Curated · ${generatedDeck.account.label ?? generatedDeck.account.id}`,
      storedAt: new Date().toISOString(),
      source: "generated",
      deck: generatedDeck,
    });

    setStatus("generated curated deck archived");
  };

  const archiveImportedDeck = () => {
    const imported = (window as SpatialCuratedDeckImportWindow)
      .__URAI_SPATIAL_IMPORTED_CURATED_DECK__;

    if (!imported) {
      setStatus("no imported curated deck");
      return;
    }

    persistEntry({
      id:
        "curated_vault_" +
        Math.random().toString(36).slice(2) +
        "_" +
        Date.now().toString(36),
      label: `Imported · ${imported.account.label ?? imported.account.id}`,
      storedAt: new Date().toISOString(),
      source: "imported",
      deck: imported,
    });

    setStatus("imported curated deck archived");
  };

  const restoreActiveDeck = () => {
    if (!activeVaultEntry?.deck) {
      setStatus("no active curated deck vault entry");
      return;
    }

    const target = window as SpatialCuratedDeckImportWindow;
    target.__URAI_SPATIAL_IMPORTED_CURATED_DECK__ = activeVaultEntry.deck;

    window.dispatchEvent(
      new CustomEvent<SpatialCuratedDeckVaultRestoredEventDetail>(
        SPATIAL_CURATED_DECK_VAULT_RESTORED_EVENT,
        {
          detail: activeVaultEntry,
        },
      ),
    );

    setStatus("active curated deck restored to preview memory");
  };

  const cycle = (direction: -1 | 1) => {
    if (entries.length === 0) return;
    const currentIndex = Math.max(
      0,
      entries.findIndex((item) => item.id === activeEntryId),
    );
    const nextIndex = (currentIndex + direction + entries.length) % entries.length;
    const next = entries[nextIndex];
    if (next) setActiveEntryId(next.id);
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 18,
        bottom: 360,
        zIndex: 79,
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
        Curated Deck Vault
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        entries: {entries.length}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        active: {activeVaultEntry?.label ?? "none"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        cards: {activeVaultEntry?.deck.cardCount ?? 0}
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 10, marginBottom: 10 }}>
        <button type="button" onClick={archiveGeneratedDeck} style={buttonStyle}>
          Archive generated curated deck
        </button>
        <button type="button" onClick={archiveImportedDeck} style={buttonStyle}>
          Archive imported curated deck
        </button>
        <button type="button" onClick={restoreActiveDeck} style={buttonStyle}>
          Restore active curated deck
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={() => cycle(-1)} style={buttonStyle}>
          Previous
        </button>
        <button type="button" onClick={() => cycle(1)} style={buttonStyle}>
          Next
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
        {activeVaultEntry?.deck.summaryText ?? "No curated deck vault entry selected."}
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

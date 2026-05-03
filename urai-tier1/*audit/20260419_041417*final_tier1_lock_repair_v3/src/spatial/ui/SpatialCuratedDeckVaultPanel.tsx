import { uraiNow, uraiRandom, uraiTime } from "@/lib/uraiDeterminism";
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
import {
} from "@/spatial/curation/spatialCuratedDeckImportTypes";
import type {
  SpatialCuratedDeckImportWindow,
  SpatialCuratedDeckVaultRestoredEventDetail,
} from "@/spatial/curation/spatialCuratedDeckImportTypes";
import { useSpatialCurationBoardStore } from "@/spatial/curation/spatialCurationBoardStore";
import { useSpatialStoryBundleVaultStore } from "@/spatial/vault/spatialStoryBundleVaultStore";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

export default function SpatialCuratedDeckVaultPanel() {
  const activeAccountId = useSpatialAccountStore((s) => s.activeAccountId);
  const profiles = useSpatialAccountStore((s) => s.profiles);

  const boardItems = useSpatialCurationBoardStore((s) => s.items);
  const storyBundleEntries = useSpatialStoryBundleVaultStore((s) => s.entries);

  const activeEntryId = useSpatialCuratedDeckVaultStore((s) => (((s as any).activeEntryId ?? (s as any).activeId ?? null) as string | null));
  const entries = useSpatialCuratedDeckVaultStore((s) => (((s as any).entries ?? []) as any[]));

  const vaultEntries = useMemo<SpatialCuratedDeckVaultEntry[]>(() =>
      entries.map((entry) => ({
        ...(entry as Record<string, unknown>),
        label:
          (entry as { label?: string }).label ??
          (entry as { title?: string }).title ??
          (entry as { name?: string }).name ??
          String((entry as { id?: string }).id ?? "entry"),
        storedAt: new Date((entry as any).storedAt ?? 0).toISOString()
          (entry as { storedAt?: string | number | Date | null }).storedAt ??
          new Date(0).toISOString(),
        source:
          (entry as { source?: string }).source ??
          "panel",
        deck:
          (entry as { deck?: any }).deck ??
          entry,
      })) as SpatialCuratedDeckVaultEntry[],
    [entries],
  );
  const replaceManifest = () => {};
  const setActiveEntryId = useSpatialCuratedDeckVaultStore((s) => ((s as any).setActiveEntryId ?? (s as any).setActiveId ?? (() => {})));

  const [status, setStatus] = useState("idle");

  const activeProfile = useMemo(
    () => profiles.find((item) => item.id === activeAccountId) ?? null,
    [profiles, activeAccountId],
  );

  const generatedDeck = useMemo(
    () =>
      buildSpatialCuratedDeckExport({
        accountId: activeAccountId,
        accountLabel: ((activeProfile as { title?: string; name?: string } | null)?.title ?? (activeProfile as { title?: string; name?: string } | null)?.name ?? activeAccountId),
        items: boardItems,
        vaultEntries: storyBundleEntries,
      }),
    [activeAccountId, activeProfile, boardItems, storyBundleEntries],
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
        uraiRandom().toString(36).slice(2) +
        "_" +
        uraiNow().toString(36),
      storedAt: new Date((entry as any).storedAt ?? 0).toISOString(),
      source: "generated",
      deck: generatedDeck,
    });

    setStatus("generated curated deck archived");
  };

  const archiveImportedDeck = () => {
    const imported = (window as SpatialCuratedDeckImportWindow)

    if (!imported) {
      setStatus("no imported curated deck");
      return;
    }

    persistEntry({
      id:
        "curated_vault_" +
        uraiRandom().toString(36).slice(2) +
        "_" +
        uraiNow().toString(36),
      storedAt: new Date((entry as any).storedAt ?? 0).toISOString(),
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

    window.dispatchEvent(
      new CustomEvent<SpatialCuratedDeckVaultRestoredEventDetail>(
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

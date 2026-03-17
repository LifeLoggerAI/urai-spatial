"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useSpatialAccountStore } from "@/spatial/account/spatialAccountStore";
import { useSpatialArcStore } from "@/spatial/arcs/spatialArcStore";
import { buildSpatialStoryBundle } from "@/spatial/bundles/buildSpatialStoryBundle";
import type { SpatialStoryBundle } from "@/spatial/bundles/spatialStoryBundleTypes";
import { useSpatialCompareStore } from "@/spatial/compare/spatialCompareStore";
import { useSpatialLensStore } from "@/spatial/lenses/spatialLensStore";
import { buildSpatialNarratorExport } from "@/spatial/narrator/buildSpatialNarratorExport";
import {
  readSpatialPersistenceSnapshot,
  writeSpatialPersistenceSnapshot,
} from "@/spatial/persistence/spatialPersistenceIO";
import { useSpatialSeasonalArcStore } from "@/spatial/seasonal/spatialSeasonalArcStore";
import {
  appendSpatialStoryBundleVaultEntry,
  readSpatialStoryBundleVaultManifest,
  writeSpatialStoryBundleVaultManifest,
} from "@/spatial/vault/spatialStoryBundleVaultIO";
import { useSpatialStoryBundleVaultStore } from "@/spatial/vault/spatialStoryBundleVaultStore";
import type { SpatialStoryBundleVaultEntry } from "@/spatial/vault/spatialStoryBundleVaultTypes";

type ImportedBundleWindow = Window & {
  __URAI_SPATIAL_IMPORTED_STORY_BUNDLE__?: SpatialStoryBundle;
};

type PersistenceWindow = Window & {
  __URAI_SPATIAL_PERSISTENCE__?: unknown;
};

export default function SpatialStoryBundleVaultPanel() {
  const activeAccountId = useSpatialAccountStore((s) => s.activeAccountId);
  const profiles = useSpatialAccountStore((s) => s.profiles);

  const activeLensId = useSpatialLensStore((s) => s.activeLensId);
  const lenses = useSpatialLensStore((s) => s.lenses);

  const compareSets = useSpatialCompareStore((s) => s.sets);
  const arcs = useSpatialArcStore((s) => s.arcs);
  const seasonalArcs = useSpatialSeasonalArcStore((s) => s.seasonalArcs);

  const activeEntryId = useSpatialStoryBundleVaultStore((s) => s.activeEntryId);
  const entries = useSpatialStoryBundleVaultStore((s) => s.entries);
  const replaceManifest = useSpatialStoryBundleVaultStore((s) => s.replaceManifest);
  const setActiveEntryId = useSpatialStoryBundleVaultStore((s) => s.setActiveEntryId);

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
    return buildSpatialNarratorExport({
      accountId: activeAccountId,
      accountLabel: activeProfile?.label ?? null,
      activeLens,
      activeCompareSet,
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

  const generatedBundle = useMemo(() => {
    if (!snapshot) return null;
    return buildSpatialStoryBundle({
      accountId: activeAccountId,
      accountLabel: activeProfile?.label ?? null,
      snapshot,
      activeLens,
      activeCompareSet,
      arcs,
      seasonalArcs,
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

  const activeEntry = useMemo(
    () => entries.find((item) => item.id === activeEntryId) ?? null,
    [entries, activeEntryId],
  );

  const persistEntry = (entry: SpatialStoryBundleVaultEntry) => {
    const manifest = readSpatialStoryBundleVaultManifest();
    const next = appendSpatialStoryBundleVaultEntry(manifest, entry);
    writeSpatialStoryBundleVaultManifest(next);
    replaceManifest(next);
  };

  const archiveGenerated = () => {
    if (!generatedBundle) {
      setStatus("no generated bundle available");
      return;
    }

    persistEntry({
      id:
        "vault_" +
        Math.random().toString(36).slice(2) +
        "_" +
        Date.now().toString(36),
      label:
        ((generatedBundle as { title?: string; label?: string; name?: string; id?: string }).title ??
          (generatedBundle as { title?: string; label?: string; name?: string; id?: string }).label ??
          (generatedBundle as { title?: string; label?: string; name?: string; id?: string }).name ??
          (generatedBundle as { title?: string; label?: string; name?: string; id?: string }).id ??
          "Generated Bundle"),
      storedAt: new Date().toISOString(),
      source: "generated",
      bundle: generatedBundle,
    });

    setStatus("generated bundle archived");
  };

  const archiveImported = () => {
    const imported = (window as ImportedBundleWindow)
      .__URAI_SPATIAL_IMPORTED_STORY_BUNDLE__;

    if (!imported) {
      setStatus("no imported bundle in memory");
      return;
    }

    persistEntry({
      id:
        "vault_" +
        Math.random().toString(36).slice(2) +
        "_" +
        Date.now().toString(36),
      label:
        ((imported as { title?: string; label?: string; name?: string; id?: string }).title ??
          (imported as { title?: string; label?: string; name?: string; id?: string }).label ??
          (imported as { title?: string; label?: string; name?: string; id?: string }).name ??
          (imported as { title?: string; label?: string; name?: string; id?: string }).id ??
          "Imported Bundle"),
      storedAt: new Date().toISOString(),
      source: "imported",
      bundle: imported,
    });

    setStatus("imported bundle archived");
  };

  const restoreActive = () => {
    if (!activeEntry?.bundle?.snapshot) {
      setStatus("no active vault snapshot");
      return;
    }

    writeSpatialPersistenceSnapshot(activeEntry.bundle.snapshot);

    const target = window as PersistenceWindow;
    target.__URAI_SPATIAL_PERSISTENCE__ = activeEntry.bundle.snapshot;

    window.dispatchEvent(
      new CustomEvent("urai:spatial-story-bundle-vault-restored", {
        detail: activeEntry,
      }),
    );

    setStatus("active vault snapshot restored");
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
        left: 1052,
        bottom: 190,
        zIndex: 72,
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
        Story Bundle Vault
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        entries: {entries.length}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        active: {activeEntry?.label ?? "none"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        source: {activeEntry?.source ?? "n/a"}
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 10, marginBottom: 10 }}>
        <button type="button" onClick={archiveGenerated} style={buttonStyle}>
          Archive current bundle
        </button>
        <button type="button" onClick={archiveImported} style={buttonStyle}>
          Archive imported bundle
        </button>
        <button type="button" onClick={restoreActive} style={buttonStyle}>
          Restore active vault snapshot
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
        {activeEntry?.bundle?.summaryText ?? "No archived story bundle selected."}
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

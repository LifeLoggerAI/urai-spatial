
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialReviewDeck } from "@/spatial/review/buildSpatialReviewDeck";
import { useSpatialStoryBundleVaultStore } from "@/spatial/vault/spatialStoryBundleVaultStore";

export default function SpatialStoryReviewDeckPanel() {
  const activeEntryId = useSpatialStoryBundleVaultStore((s) => s.activeEntryId);
  const entries = useSpatialStoryBundleVaultStore((s) => s.entries);
  const setActiveEntryId = useSpatialStoryBundleVaultStore((s) => s.setActiveEntryId);

  const deck = useMemo(
    () =>
      buildSpatialReviewDeck({
        entries,
        activeEntryId,
      }),
    [entries, activeEntryId],
  );

  const activeIndex = useMemo(
    () =>
      Math.max(
        0,
        deck.cards.findIndex((item) => item.entryId === activeEntryId),
      ),
    [deck.cards, activeEntryId],
  );

  const activeCard = deck.cards[activeIndex] ?? null;

  const cycle = (direction: -1 | 1) => {
    if (deck.cards.length === 0) return;
    const nextIndex = (activeIndex + direction + deck.cards.length) % deck.cards.length;
    const next = deck.cards[nextIndex];
    if (next) setActiveEntryId(next.entryId);
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 360,
        top: 150,
        zIndex: 75,
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
        Review Deck
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        cards: {deck.cards.length}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76, marginBottom: 10 }}>
        {deck.summaryText}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={() => cycle(-1)} style={buttonStyle}>
          Previous
        </button>
        <button type="button" onClick={() => cycle(1)} style={buttonStyle}>
          Next
        </button>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 13, opacity: 0.9 }}>
          {activeCard?.title ?? "No active review card"}
        </div>
        <div style={{ fontSize: 11, opacity: 0.62, marginTop: 4 }}>
          {activeCard?.subtitle ?? "n/a"}
        </div>
        <div style={{ fontSize: 12, opacity: 0.76, marginTop: 8 }}>
          scene: {activeCard?.sceneMode ?? "n/a"}
        </div>
        <div style={{ fontSize: 12, opacity: 0.76 }}>
          star: {activeCard?.selectedStarId ?? "none"}
        </div>
        <div style={{ fontSize: 12, opacity: 0.76 }}>
          narrator: {activeCard?.narratorTitle ?? "none"}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            lineHeight: 1.45,
            opacity: 0.82,
            whiteSpace: "pre-wrap",
            maxHeight: 120,
            overflow: "auto",
          }}
        >
          {activeCard?.summary ?? "No review summary available."}
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        <div style={miniBlockStyle}>
          <div style={miniTitleStyle}>Previous lineage</div>
          <div style={miniBodyStyle}>
            {activeCard?.lineagePrevSummary ?? "n/a"}
          </div>
        </div>
        <div style={miniBlockStyle}>
          <div style={miniTitleStyle}>Next lineage</div>
          <div style={miniBodyStyle}>
            {activeCard?.lineageNextSummary ?? "n/a"}
          </div>
        </div>
      </div>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  appearance: "none",
  flex: 1,
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  fontSize: 12,
  padding: "9px 10px",
  cursor: "pointer",
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  padding: 10,
};

const miniBlockStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  padding: 10,
};

const miniTitleStyle: CSSProperties = {
  fontSize: 11,
  opacity: 0.64,
  textTransform: "uppercase",
  marginBottom: 4,
};

const miniBodyStyle: CSSProperties = {
  fontSize: 12,
  opacity: 0.78,
  lineHeight: 1.4,
};

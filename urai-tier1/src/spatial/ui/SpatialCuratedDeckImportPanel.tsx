"use client";

import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import type { SpatialCuratedDeckExport } from "@/spatial/curation/spatialCuratedDeckExportTypes";
import { isSpatialCuratedDeckExport } from "@/spatial/curation/spatialCuratedDeckExportValidation";

type CuratedDeckWindow = Window & {
  __URAI_SPATIAL_IMPORTED_CURATED_DECK__?: SpatialCuratedDeckExport;
};

export default function SpatialCuratedDeckImportPanel() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState("idle");
  const [deck, setDeck] = useState<SpatialCuratedDeckExport | null>(null);
  const [cardIndex, setCardIndex] = useState(0);

  const activeCard = useMemo(
    () => (deck && deck.cards.length > 0 ? deck.cards[Math.max(0, Math.min(cardIndex, deck.cards.length - 1))] : null),
    [deck, cardIndex],
  );

  const importDeck = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      if (!isSpatialCuratedDeckExport(parsed)) {
        setStatus("invalid curated deck");
        return;
      }

      setDeck(parsed);
      setCardIndex(0);

      const target = window as CuratedDeckWindow;
      target.__URAI_SPATIAL_IMPORTED_CURATED_DECK__ = parsed;

      window.dispatchEvent(
        new CustomEvent("urai:spatial-curated-deck-imported", {
          detail: parsed,
        }),
      );

      setStatus("curated deck imported");
    } catch (_err) {
      setStatus("curated deck import failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const cycle = (direction: -1 | 1) => {
    if (!deck || deck.cards.length === 0) return;
    const next = (cardIndex + direction + deck.cards.length) % deck.cards.length;
    setCardIndex(next);
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 1398,
        top: 150,
        zIndex: 78,
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
        Curated Deck Import
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        imported deck: {deck ? deck.account.label ?? deck.account.id : "none"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        cards: {deck?.cardCount ?? 0}
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 10, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={buttonStyle}
        >
          Import curated deck JSON
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

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importDeck(file);
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
          maxHeight: 170,
          overflow: "auto",
        }}
      >
        {activeCard
          ? [
              `Card: ${activeCard.label}`,
              `Source: ${activeCard.source}`,
              `Scene: ${activeCard.sceneMode}`,
              `Selected star: ${activeCard.selectedStarId ?? "none"}`,
              `Narrator: ${activeCard.narratorTitle ?? "none"}`,
              `Note: ${activeCard.note}`,
              `Summary: ${activeCard.summary}`,
            ].join("\n")
          : deck?.summaryText ?? "No imported curated deck."}
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

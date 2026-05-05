"use client";

import { Html } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";

type NarratorCaptionDetail = {
  event?: string;
  script?: string;
  title?: string | null;
  tone?: string | null;
  timing?: {
    delayMs?: number;
    durationMs?: number;
    beat?: string;
  };
};

type CaptionState = {
  words: string[];
  activeWordIndex: number;
  tone: string | null;
  beat: string | null;
  visible: boolean;
};

function shouldCaption(detail: NarratorCaptionDetail) {
  return Boolean(
    detail.script &&
      (detail.event === "narrator.focus.arrive" ||
        detail.event === "narrator.replay.begin" ||
        detail.event === "narrator.replay.pulse"),
  );
}

function splitWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

export default function NarratorCaptionBridge() {
  const [caption, setCaption] = useState<CaptionState | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const clearTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const wordTimersRef = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const clearTimers = () => {
      if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current);
      if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
      if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current);
      wordTimersRef.current.forEach((timer) => window.clearTimeout(timer));

      showTimerRef.current = null;
      clearTimerRef.current = null;
      fadeTimerRef.current = null;
      wordTimersRef.current = [];
    };

    const handleNarrator = (event: Event) => {
      const detail = (event as CustomEvent<NarratorCaptionDetail>).detail;
      if (!shouldCaption(detail)) return;

      clearTimers();
      setCaption(null);

      const delayMs = Math.max(0, detail.timing?.delayMs ?? 0);
      const durationMs = Math.max(1800, detail.timing?.durationMs ?? 3200);
      const words = splitWords(detail.script ?? "");
      const wordStepMs = words.length > 0 ? Math.max(90, Math.floor(durationMs / words.length)) : durationMs;

      showTimerRef.current = window.setTimeout(() => {
        setCaption({
          words,
          activeWordIndex: 0,
          tone: detail.tone ?? null,
          beat: detail.timing?.beat ?? null,
          visible: true,
        });

        wordTimersRef.current = words.map((_, index) =>
          window.setTimeout(() => {
            setCaption((current) => (current ? { ...current, activeWordIndex: index } : null));
          }, index * wordStepMs),
        );

        clearTimerRef.current = window.setTimeout(() => {
          setCaption((current) => (current ? { ...current, visible: false } : null));
          fadeTimerRef.current = window.setTimeout(() => setCaption(null), 260);
        }, durationMs);
      }, delayMs);
    };

    window.addEventListener("urai:narrator", handleNarrator);

    return () => {
      window.removeEventListener("urai:narrator", handleNarrator);
      clearTimers();
    };
  }, []);

  if (!caption) return null;

  return (
    <Html fullscreen prepend={false} zIndexRange={[100, 0]}>
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "fixed",
          left: "50%",
          bottom: "7vh",
          transform: `translateX(-50%) translateY(${caption.visible ? "0" : "0.6rem"})`,
          maxWidth: "min(42rem, calc(100vw - 2rem))",
          padding: "0.85rem 1.1rem",
          borderRadius: "1.1rem",
          background: "rgba(3, 7, 18, 0.72)",
          border: "1px solid rgba(219, 234, 254, 0.22)",
          color: "rgba(248, 250, 252, 0.96)",
          fontSize: "clamp(0.92rem, 1.6vw, 1.12rem)",
          lineHeight: 1.45,
          letterSpacing: "0.01em",
          textAlign: "center",
          textShadow: "0 1px 18px rgba(125, 211, 252, 0.28)",
          boxShadow: "0 1.25rem 4rem rgba(0, 0, 0, 0.34)",
          backdropFilter: "blur(14px)",
          opacity: caption.visible ? 1 : 0,
          transition: "opacity 260ms ease, transform 260ms ease",
          pointerEvents: "none",
        }}
      >
        {caption.words.map((word, index) => {
          const active = index === caption.activeWordIndex;
          const spoken = index < caption.activeWordIndex;

          return (
            <span
              key={`${word}-${index}`}
              style={{
                display: "inline-block",
                marginRight: "0.28em",
                color: active ? "#ffffff" : spoken ? "rgba(226, 232, 240, 0.82)" : "rgba(226, 232, 240, 0.42)",
                textShadow: active ? "0 0 16px rgba(125, 211, 252, 0.75)" : "none",
                transform: active ? "translateY(-0.03rem) scale(1.035)" : "translateY(0) scale(1)",
                transition: "color 160ms ease, text-shadow 160ms ease, transform 160ms ease",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </Html>
  );
}

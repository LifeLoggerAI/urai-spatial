"use client";

import { Html } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";

type CaptionState = {
  words: string[];
  activeWordIndex: number;
  visible: boolean;
};

export default function NarratorCaptionBridge() {
  const [caption, setCaption] = useState<CaptionState | null>(null);
  const fallbackTimers = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const clearTimers = () => {
      fallbackTimers.current.forEach((t) => window.clearTimeout(t));
      fallbackTimers.current = [];
    };

    const handleNarrator = (event: any) => {
      const detail = event.detail;
      if (!detail?.script) return;

      clearTimers();

      const words = detail.script.split(/\s+/);

      setCaption({
        words,
        activeWordIndex: 0,
        visible: true,
      });

      // fallback timing
      const duration = detail.timing?.durationMs ?? 3000;
      const step = duration / words.length;

      words.forEach((_, i) => {
        const t = window.setTimeout(() => {
          setCaption((c) => (c ? { ...c, activeWordIndex: i } : null));
        }, i * step);
        fallbackTimers.current.push(t);
      });
    };

    const handleBoundary = (event: any) => {
      const detail = event.detail;
      if (detail.wordIndex == null) return;

      setCaption((c) => (c ? { ...c, activeWordIndex: detail.wordIndex } : null));

      if (detail.completed) {
        setCaption((c) => (c ? { ...c, visible: false } : null));
        setTimeout(() => setCaption(null), 300);
      }
    };

    window.addEventListener("urai:narrator", handleNarrator);
    window.addEventListener("urai:narrator-boundary", handleBoundary);

    return () => {
      window.removeEventListener("urai:narrator", handleNarrator);
      window.removeEventListener("urai:narrator-boundary", handleBoundary);
      clearTimers();
    };
  }, []);

  if (!caption) return null;

  return (
    <Html fullscreen>
      <div
        style={{
          position: "fixed",
          bottom: "6vh",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "0.8rem 1.2rem",
          background: "rgba(0,0,0,0.6)",
          borderRadius: "12px",
          fontSize: "1rem",
          color: "white",
          backdropFilter: "blur(10px)",
        }}
      >
        {caption.words.map((w, i) => (
          <span
            key={i}
            style={{
              marginRight: "0.25em",
              opacity: i <= caption.activeWordIndex ? 1 : 0.3,
              textShadow: i === caption.activeWordIndex ? "0 0 8px #7dd3fc" : "none",
            }}
          >
            {w}
          </span>
        ))}
      </div>
    </Html>
  );
}

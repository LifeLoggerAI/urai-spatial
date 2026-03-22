"use client";

import { useEffect, useMemo, useState } from "react";
import { useSceneStore } from "../state/sceneStore";

type LooseRecord = Record<string, unknown>;
type SelectedStar = LooseRecord | null;

function asRecord(value: unknown): LooseRecord | null {
  return value !== null && typeof value === "object" ? (value as LooseRecord) : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function buildReplaySteps(selectedStar: SelectedStar): string[] {
  const title =
    str(selectedStar?.title) ??
    str(selectedStar?.label) ??
    str(selectedStar?.name) ??
    "Memory Replay";

  return [
    `Entering ${title}`,
    "Stabilizing replay frame",
    "Rendering memory context",
  ];
}

function getReplayGlow(selectedStar: SelectedStar): string {
  return (
    str(selectedStar?.glow) ??
    str(selectedStar?.color) ??
    str(selectedStar?.auraColor) ??
    "rgba(255,255,255,0.35)"
  );
}

function getReplayMeta(selectedStar: SelectedStar): { title: string; subtitle: string } {
  return {
    title:
      str(selectedStar?.title) ??
      str(selectedStar?.label) ??
      str(selectedStar?.name) ??
      "Memory Replay",
    subtitle:
      str(selectedStar?.subtitle) ??
      str(selectedStar?.description) ??
      "Replaying the selected memory thread.",
  };
}

export default function ReplayOverlay() {
  const selectedStarRaw = useSceneStore((s: any) => s.selectedStar ?? null);
  const mode = useSceneStore((s: any) => s.mode);
  const enterReplay = useSceneStore((s: any) => s.enterReplay);
  const exitReplay = useSceneStore((s: any) => s.exitReplay);

  const [stepIndex, setStepIndex] = useState(0);

  const selectedStar = useMemo<SelectedStar>(() => {
    return asRecord(selectedStarRaw);
  }, [selectedStarRaw]);

  const steps = useMemo(() => buildReplaySteps(selectedStar), [selectedStar]);
  const glow = useMemo(() => getReplayGlow(selectedStar), [selectedStar]);
  const meta = useMemo(() => getReplayMeta(selectedStar), [selectedStar]);

  useEffect(() => {
    if (mode !== "replay") {
      setStepIndex(0);
      return;
    }

    const id = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % Math.max(steps.length, 1));
    }, 1800);

    return () => window.clearInterval(id);
  }, [mode, steps.length]);

  if (mode !== "replay") return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(circle at center, ${glow}, transparent 60%)`,
        }}
      />
      <div className="pointer-events-auto relative mx-4 w-full max-w-2xl rounded-3xl border border-white/10 bg-black/45 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="text-[11px] uppercase tracking-[0.28em] text-white/50">Replay Mode</div>
        <div className="mt-2 text-2xl font-medium text-white/95">{meta.title}</div>
        <div className="mt-2 text-sm text-white/70">{meta.subtitle}</div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-white/45">Current Step</div>
          <div className="mt-2 text-base text-white/90">
            {steps[Math.min(stepIndex, Math.max(steps.length - 1, 0))]}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => enterReplay?.()}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/90 transition hover:bg-white/15"
          >
            Restart Replay
          </button>
          <button
            type="button"
            onClick={() => exitReplay?.()}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/90 transition hover:bg-white/15"
          >
            Exit Replay
          </button>
        </div>
      </div>
    </div>
  );
}

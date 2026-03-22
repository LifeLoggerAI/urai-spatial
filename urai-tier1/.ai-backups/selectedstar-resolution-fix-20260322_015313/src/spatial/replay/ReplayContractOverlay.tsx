"use client";

import { useMemo } from "react";
import { useSceneStore } from "../state/sceneStore";

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord | null {
  return value !== null && typeof value === "object" ? (value as LooseRecord) : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export default function ReplayContractOverlay() {
  const replay = useSceneStore((s: any) => s.replay ?? null);
  const selectedStarId = useSceneStore((s: any) => s.selectedStarId ?? null);

  const title = useMemo(() => {
    const replayRecord = asRecord(replay);
    const starRecord = asRecord(selectedStarId);

    return (
      str(replayRecord?.title) ??
      str(replayRecord?.label) ??
      str(starRecord?.title) ??
      str(starRecord?.label) ??
      "Memory Replay"
    );
  }, [replay, selectedStarId]);

  const subtitle = useMemo(() => {
    const replayRecord = asRecord(replay);
    const starRecord = asRecord(selectedStarId);

    return (
      str(replayRecord?.subtitle) ??
      str(replayRecord?.description) ??
      str(starRecord?.subtitle) ??
      str(starRecord?.description) ??
      "Reviewing the selected memory."
    );
  }, [replay, selectedStarId]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-4">
      <div className="max-w-xl rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-center text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/55">Replay</div>
        <div className="mt-1 text-lg font-medium text-white/95">{title}</div>
        <div className="mt-1 text-sm text-white/70">{subtitle}</div>
      </div>
    </div>
  );
}

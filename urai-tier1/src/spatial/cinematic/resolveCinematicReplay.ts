import { resolveNarrativeReplayById } from "@/spatial/narrative/resolveNarrativeReplay";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

export type CinematicReplay = {
  id: string;
  sceneLabel: string;
  beatTitle: string;
  beatLine: string;
  stageLine: string;
  cueLine: string;
  pulse: "low" | "medium" | "high";
  accent?: string;
  chips: string[];
};

function toPulse(intensity?: number): "low" | "medium" | "high" {
  if (typeof intensity !== "number" || !Number.isFinite(intensity)) return "medium";
  if (intensity >= 7) return "high";
  if (intensity >= 4) return "medium";
  return "low";
}

export function resolveCinematicReplayById(
  id: string | null | undefined
): CinematicReplay | undefined {
  if (!id) return undefined;

  const narrative = resolveNarrativeReplayById(id);
  const memory = resolveMemorySphereById(id);

  if (!narrative && !memory) return undefined;

  const pulse = toPulse(memory?.intensity);
  const sceneLabel =
    pulse === "high"
      ? "Peak Replay"
      : pulse === "low"
      ? "Quiet Replay"
      : "Cinematic Replay";

  const beatTitle = narrative?.title ?? memory?.title ?? "Memory Replay";

  const beatLine =
    narrative?.line ??
    memory?.summary ??
    "Cinematic replay contract is active.";

  const stageParts = [
    memory?.chapter ? `chapter ${memory.chapter}` : undefined,
    memory?.timeband ? `band ${memory.timeband}` : undefined,
    memory?.emotion ? `tone ${memory.emotion}` : undefined,
  ].filter((value): value is string => Boolean(value));

  const stageLine =
    stageParts.length > 0
      ? stageParts.join(" · ")
      : "narrative staging active";

  const cueLine =
    pulse === "high"
      ? "Hold the frame, increase glow, keep the scene anchored."
      : pulse === "low"
      ? "Reduce motion, soften atmosphere, keep detail close."
      : "Sustain depth, preserve focus, keep replay motion smooth.";

  const chips = [
    ...(narrative?.chips ?? []),
    pulse,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .slice(0, 6);

  return {
    id,
    sceneLabel,
    beatTitle,
    beatLine,
    stageLine,
    cueLine,
    pulse,
    accent: narrative?.tone ?? memory?.color,
    chips,
  };
}

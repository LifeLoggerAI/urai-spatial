import { resolveReplaySceneById } from "@/spatial/replay/resolveReplayScene";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

type LooseRecord = Record<string, unknown>;

export type NarrativeReplay = {
  id: string;
  title: string;
  kicker: string;
  line: string;
  detail: string;
  chips: string[];
  tone?: string;
};

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function resolveNarrativeReplayById(
  id: string | null | undefined
): NarrativeReplay | undefined {
  if (!id) return undefined;

  const replay = resolveReplaySceneById(id) as LooseRecord | undefined;
  const memory = resolveMemorySphereById(id);

  if (!replay && !memory) return undefined;

  const title =
    str(replay?.title) ??
    memory?.title ??
    "Narrative Replay";

  const kickerParts = [memory?.chapter, memory?.timeband].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  const kicker =
    str(replay?.subtitle) ??
    (kickerParts.length > 0 ? kickerParts.join(" · ") : "Canonical replay");

  const line =
    str(replay?.description) ??
    memory?.summary ??
    "This replay is now resolving from the real memory contract.";

  const emotion = memory?.emotion ?? str(replay?.emotion);
  const chapter = memory?.chapter ?? str(replay?.chapter);
  const timeband = memory?.timeband ?? str(replay?.timeband);

  const detailParts = [
    chapter ? `Chapter: ${chapter}` : undefined,
    timeband ? `Band: ${timeband}` : undefined,
    emotion ? `Tone: ${emotion}` : undefined,
    typeof memory?.intensity === "number" ? `Intensity: ${memory.intensity}` : undefined,
  ].filter((value): value is string => Boolean(value));

  const detail =
    detailParts.length > 0
      ? detailParts.join("  •  ")
      : "Replay narrative layer active.";

  const chips = [
    ...(memory?.tags ?? []),
    chapter,
    timeband,
    emotion,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .slice(0, 6);

  return {
    id,
    title,
    kicker,
    line,
    detail,
    chips,
    tone: memory?.color ?? str(replay?.color),
  };
}

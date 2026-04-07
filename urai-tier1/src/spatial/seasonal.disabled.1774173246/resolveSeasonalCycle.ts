import { getMemoryDataset } from "@/spatial/replay/resolveReplayScene";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";
import { resolveStoryArcById } from "@/spatial/storyarc/resolveStoryArc";
import { resolveEraCompareById } from "@/spatial/era/resolveEraCompare";

type LooseRecord = Record<string, unknown>;

export type SeasonalCycleState = {
  id: string;
  title: string;
  seasonFocus: string;
  summary: string;
  readiness: number;
  emotionalClimate: string[];
  seasonalTransitions: string[];
  cycleSignal?: string;
};

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function unique(values: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (!out.includes(value)) out.push(value);
  }
  return out;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeSeason(input?: string): string | undefined {
  if (!input) return undefined;
  const lower = input.toLowerCase();
  if (lower.includes("spring")) return "Spring";
  if (lower.includes("summer")) return "Summer";
  if (lower.includes("autumn") || lower.includes("fall")) return "Autumn";
  if (lower.includes("winter")) return "Winter";
  if (lower.includes("night")) return "Night";
  if (lower.includes("dawn")) return "Dawn";
  return input;
}

export function resolveSeasonalCycleById(
  id: string | null | undefined
): SeasonalCycleState | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  if (!memory) return undefined;

  const storyArc = resolveStoryArcById(id);
  const era = resolveEraCompareById(id);
  const dataset = getMemoryDataset() as LooseRecord[];

  const focusSeason = normalizeSeason(memory.timeband) ?? "Seasonal Focus";

  const matchingRows = dataset.filter((row) => {
    const rowSeason = normalizeSeason(str(row.timeband) ?? str(row.season));
    return rowSeason === focusSeason;
  });

  const emotionalClimate = unique(
    matchingRows
      .map((row) => str(row.emotion) ?? str(row.primaryEmotion))
      .filter((value): value is string => Boolean(value))
  ).slice(0, 6);

  const seasonalTransitions = unique([
    focusSeason,
    era?.compareTargetTitle ? "compare-shift active" : undefined,
    storyArc?.arcStage ? `arc-${storyArc.arcStage}` : undefined,
    memory.chapter ? `chapter-${memory.chapter}` : undefined,
  ]).slice(0, 6);

  const cycleSignal =
    emotionalClimate[0] ??
    seasonalTransitions[0] ??
    focusSeason;

  const readiness = clamp(
    Math.round(
      matchingRows.length * 14 +
      emotionalClimate.length * 9 +
      seasonalTransitions.length * 8 +
      (storyArc?.readiness ?? 0) * 0.25
    ),
    0,
    100
  );

  const summary =
    readiness >= 70
      ? "Seasonal cycle synthesis is now readable across repeated timeband, emotion, and story-arc signals."
      : "Seasonal cycle synthesis is active, but more recurring seasonal data will improve clarity and recurrence strength.";

  return {
    id,
    title: `${memory.title} Seasonal Cycle`,
    seasonFocus: focusSeason,
    summary,
    readiness,
    emotionalClimate,
    seasonalTransitions,
    cycleSignal,
  };
}

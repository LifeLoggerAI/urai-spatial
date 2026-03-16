import * as datasetMod from "@/spatial/data/memoryDataset";
import type { MemoryNode, ReplayScene } from "@/spatial/types/memory";

type SelectedStarLike = {
  id?: string | null;
  title?: string | null;
  label?: string | null;
  chapter?: string | null;
  timeband?: string | null;
  color?: string | null;
} | null | undefined;

type LooseRecord = Record<string, unknown>;

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function getDataset(): MemoryNode[] {
  const mod = datasetMod as LooseRecord;

  return asArray<MemoryNode>(
    mod.memoryDataset ??
      mod.MEMORY_DATASET ??
      mod.memoryNodes ??
      mod.MEMORY_NODES ??
      mod.default
  );
}

function nodeReplay(node: MemoryNode): ReplayScene | undefined {
  const raw = node as unknown as LooseRecord;
  const replay = raw.replayScene as ReplayScene | undefined;
  if (replay) return replay;

  const title = firstString(raw.title, raw.label, raw.name, "Memory Replay");
  const subtitle = firstString(raw.chapter, raw.timeband, raw.season, raw.arc);
  const description = firstString(
    raw.summary,
    raw.description,
    raw.caption,
    raw.note,
    raw.text
  );

  const derived: LooseRecord = {
    id: firstString(raw.id, "replay"),
    title,
    subtitle,
    description,
    chapter: firstString(raw.chapter, raw.arc),
    timeband: firstString(raw.timeband, raw.season),
    color: firstString(raw.color, raw.auraColor),
    emotion: firstString(raw.emotion, raw.primaryEmotion),
    intensity: firstNumber(raw.intensity, raw.weight, raw.score),
    nodeId: firstString(raw.id),
  };

  return derived as ReplayScene;
}

export function getMemoryDataset(): MemoryNode[] {
  return getDataset();
}

export function resolveMemoryNodeById(id: string | null | undefined): MemoryNode | undefined {
  if (!id) return undefined;
  return getDataset().find((node) => {
    const raw = node as unknown as LooseRecord;
    return firstString(raw.id) === id;
  });
}

export function resolveReplaySceneById(id: string | null | undefined): ReplayScene | undefined {
  const node = resolveMemoryNodeById(id);
  return node ? nodeReplay(node) : undefined;
}

export function resolveReplaySceneFromSelectedStar(
  selectedStar: SelectedStarLike
): ReplayScene | undefined {
  const id = selectedStar?.id ?? undefined;
  const byId = resolveReplaySceneById(id);
  if (byId) return byId;

  if (!selectedStar) return undefined;

  const fallback: LooseRecord = {
    id: firstString(selectedStar.id, "replay-fallback"),
    title: firstString(selectedStar.title, selectedStar.label, "Memory Replay"),
    subtitle: firstString(selectedStar.chapter, selectedStar.timeband),
    description: "Replay resolver fallback path active.",
    chapter: firstString(selectedStar.chapter),
    timeband: firstString(selectedStar.timeband),
    color: firstString(selectedStar.color),
    nodeId: firstString(selectedStar.id),
  };

  return fallback as ReplayScene;
}

import { resolveMemoryNodeById } from "@/spatial/replay/resolveReplayScene";

type LooseRecord = Record<string, unknown>;

export type MemorySphereDetail = {
  id: string;
  title: string;
  summary: string;
  chapter?: string;
  timeband?: string;
  color?: string;
  emotion?: string;
  intensity?: number;
  tags: string[];
};

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

export function resolveMemorySphereById(id: string | null | undefined): MemorySphereDetail | undefined {
  const node = resolveMemoryNodeById(id) as LooseRecord | undefined;
  if (!node) return undefined;

  const title =
    str(node.title) ??
    str(node.label) ??
    str(node.name) ??
    "Memory Sphere";

  const summary =
    str(node.summary) ??
    str(node.description) ??
    str(node.caption) ??
    str(node.note) ??
    "Canonical memory detail resolved from the real memory dataset.";

  const tags = [
    ...strArray(node.tags),
    ...strArray(node.keywords),
  ].slice(0, 6);

  return {
    id: str(node.id) ?? "memory-sphere",
    title,
    summary,
    chapter: str(node.chapter) ?? str(node.arc),
    timeband: str(node.timeband) ?? str(node.season),
    color: str(node.color) ?? str(node.auraColor),
    emotion: str(node.emotion) ?? str(node.primaryEmotion),
    intensity: num(node.intensity) ?? num(node.weight) ?? num(node.score),
    tags,
  };
}

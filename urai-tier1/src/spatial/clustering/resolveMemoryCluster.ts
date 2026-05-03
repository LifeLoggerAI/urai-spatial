import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

export type MemoryCluster = {
  id: string;
  title: string;
  summary: string;
  axis: string;
  neighbors: string[];
};

type LooseRecord = Record<string, unknown>;

function stringFrom(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function resolveMemoryClusterById(
  id: string | null | undefined
): MemoryCluster | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  const record = (memory ?? {}) as LooseRecord;

  const title =
    stringFrom(record.title) ||
    stringFrom(record.label) ||
    stringFrom(record.name) ||
    "Memory cluster";

  const axis =
    stringFrom(record.axis) ||
    stringFrom(record.emotion) ||
    stringFrom(record.chapter) ||
    "memory";

  const neighbors = arrayOfStrings(record.neighbors);

  const summary =
    stringFrom(record.summary) ||
    "This cluster groups nearby memory signals around " + axis + ".";

  return {
    id,
    title,
    summary,
    axis,
    neighbors,
  };
}

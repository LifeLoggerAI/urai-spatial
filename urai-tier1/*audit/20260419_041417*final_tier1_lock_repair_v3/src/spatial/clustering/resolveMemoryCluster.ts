import { getMemoryDataset } from "@/spatial/replay/resolveReplayScene";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

type LooseRecord = Record<string, unknown>;

export type ClusterNeighbor = {
  id: string;
  title: string;
  chapter?: string;
  timeband?: string;
  emotion?: string;
  color?: string;
  score: number;
};

export type MemoryCluster = {
  id: string;
  title: string;
  summary: string;
  axis: string[];
  neighbors: ClusterNeighbor[];
};

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function unique(values: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (!out.includes(value)) out.push(value);
  }
  return out;
}

function scoreNode(seed: LooseRecord, node: LooseRecord): number {
  let score = 0;

  if (str(seed.chapter) && str(seed.chapter) === str(node.chapter)) score += 4;
  if (str(seed.timeband) && str(seed.timeband) === str(node.timeband)) score += 3;
  if (str(seed.emotion) && str(seed.emotion) === str(node.emotion)) score += 2;
  if (str(seed.color) && str(seed.color) === str(node.color)) score += 1;

  return score;
}

export function resolveMemoryClusterById(
  id: string | null | undefined
): MemoryCluster | undefined {
  if (!id) return undefined;

  const seed = resolveMemorySphereById(id);
  if (!seed) return undefined;

  const dataset = getMemoryDataset() as LooseRecord[];

  const neighbors = dataset
    .filter((node) => str(node.id) && str(node.id) !== id)
    .map((node) => {
      const score = scoreNode(seed as unknown as LooseRecord, node);

      return {
        id: str(node.id) ?? "neighbor",
        title:
          str(node.title) ??
          str(node.label) ??
          str(node.name) ??
          "Related Memory",
        chapter: str(node.chapter) ?? str(node.arc),
        timeband: str(node.timeband) ?? str(node.season),
        emotion: str(node.emotion) ?? str(node.primaryEmotion),
        color: str(node.color) ?? str(node.auraColor),
        score,
      };
    })
    .filter((node) => node.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 6);

  const axis = unique([
    seed.chapter,
    seed.timeband,
    seed.emotion,
  ]);

  const title =
    neighbors.length > 0

  const summary =
    neighbors.length > 0

  return {
    id,
    title,
    summary,
    axis,
    neighbors,
  };
}

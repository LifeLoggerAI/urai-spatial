type LooseRecord = Record<string, unknown>;
type SelectedStarLike = string | LooseRecord | null | undefined;

export type ReplayScene = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
};

export type MemoryNode = {
  id: string;
  title?: string;
  label?: string;
  subtitle?: string;
  description?: string;
};

const REPLAY_SCENES: ReplayScene[] = [];
const MEMORY_DATASET: MemoryNode[] = REPLAY_SCENES.map((scene) => ({
  id: scene.id,
  title: scene.title,
  subtitle: scene.subtitle,
  description: scene.description,
}));

function asRecord(value: unknown): LooseRecord | null {
  return value !== null && typeof value === "object" ? (value as LooseRecord) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function getMemoryDataset(): MemoryNode[] {
  return MEMORY_DATASET;
}

export function resolveMemoryNodeById(
  id: string | null | undefined,
): MemoryNode | undefined {
  if (!id) return undefined;
  return MEMORY_DATASET.find((node) => node.id === id);
}

export function resolveReplaySceneById(
  id: string | null | undefined,
): ReplayScene | undefined {
  if (!id) return undefined;
  return REPLAY_SCENES.find((scene) => scene.id === id);
}

export function resolveReplayScene(
  selectedStar: SelectedStarLike,
): ReplayScene | undefined {
  const record = asRecord(selectedStar);

  const id =
    asString(selectedStar) ??
    asString(record?.id) ??
    asString(record?.starId) ??
    undefined;

  const byId = resolveReplaySceneById(id);
  if (byId) return byId;

  const title =
    asString(record?.title) ??
    asString(record?.label) ??
    asString(record?.name) ??
    undefined;

  if (!title) return undefined;

  return {
    id: id ?? title,
    title,
    subtitle: asString(record?.subtitle),
    description: asString(record?.description),
  };
}

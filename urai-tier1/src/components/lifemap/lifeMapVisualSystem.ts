import type { LifeMapNode } from "./lifeMapData";

export type LifeMapArtifactFamily =
  | "visual"
  | "audio"
  | "relationship"
  | "place"
  | "emotion"
  | "pattern"
  | "achievement"
  | "goal"
  | "future"
  | "everyday"
  | "archive"
  | "protected";

export type LifeMapPathKind =
  | "family"
  | "friendship"
  | "work"
  | "conflict"
  | "goal"
  | "temporal"
  | "pattern"
  | "confirmed"
  | "inferred"
  | "corrected"
  | "protected";

export type LifeMapChapterDescriptor = {
  id: string;
  title: string;
  position: [number, number, number];
  rotation: [number, number, number];
  radius: number;
  arc: number;
  aura: string;
  depth: "near" | "middle" | "far";
};

// V3 restrained astronomical palette: deep space remains dominant while chapter
// identity is carried by temperature and atmosphere rather than neon saturation.
export const LIFE_MAP_CHAPTERS: readonly LifeMapChapterDescriptor[] = [
  {
    id: "spring-becoming",
    title: "Becoming",
    position: [-5.8, 2.1, -3.8],
    rotation: [-0.22, 0.2, -0.12],
    radius: 3.8,
    arc: 1.75,
    aura: "#b7d4e8",
    depth: "near",
  },
  {
    id: "threshold-return",
    title: "Return",
    position: [-1.5, -2.15, -8.9],
    rotation: [0.08, -0.32, 0.16],
    radius: 3.15,
    arc: 1.5,
    aura: "#c9c2d6",
    depth: "middle",
  },
  {
    id: "relationship-orbit",
    title: "Connection",
    position: [5.45, 0.75, -12.8],
    rotation: [0.3, 0.1, -0.24],
    radius: 3.25,
    arc: 1.62,
    aura: "#d7e3e8",
    depth: "middle",
  },
  {
    id: "forward-weather",
    title: "Possible Future",
    position: [1.35, 4.5, -19.2],
    rotation: [-0.15, 0.42, 0.08],
    radius: 4.4,
    arc: 1.35,
    aura: "#dbc9a4",
    depth: "far",
  },
] as const;

const FAMILY_LABELS: Record<LifeMapArtifactFamily, string> = {
  visual: "Visual memory",
  audio: "Voice memory",
  relationship: "Relationship",
  place: "Place",
  emotion: "Emotional turning point",
  pattern: "Recurring pattern",
  achievement: "Achievement",
  goal: "Active goal",
  future: "Possible future",
  everyday: "Everyday memory",
  archive: "Deep archive",
  protected: "Protected memory",
};

export const LIFE_MAP_PATH_PALETTE: Record<LifeMapPathKind, string> = {
  family: "#d8c7b3",
  friendship: "#b7d7e2",
  work: "#aebbd0",
  conflict: "#c69aa6",
  goal: "#d8c393",
  temporal: "#91bdca",
  pattern: "#b6abc8",
  confirmed: "#d8e7eb",
  inferred: "#74869a",
  corrected: "#929ca5",
  protected: "#716d7d",
};

function hasTag(node: LifeMapNode, ...tags: string[]) {
  const values = new Set((node.tags || []).map((tag) => tag.toLowerCase()));
  return tags.some((tag) => values.has(tag));
}

function stableChapterIndex(node: LifeMapNode) {
  let hash = 2166136261;
  const key = `${node.id}:${node.clusterId || "unassigned-cluster"}`;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % LIFE_MAP_CHAPTERS.length;
}

export function resolveArtifactFamily(node: LifeMapNode): LifeMapArtifactFamily {
  if (node.locked || node.privacyLevel === "hidden" || hasTag(node, "protected", "sealed", "private-vault")) return "protected";
  if (hasTag(node, "achievement", "milestone", "earned")) return "achievement";
  if (hasTag(node, "goal", "active-goal", "commitment")) return "goal";
  if (node.type === "forecast" || hasTag(node, "future", "possibility")) return "future";
  if (node.sourceType === "audio" || hasTag(node, "audio", "voice", "sound")) return "audio";
  if (node.type === "relationship" || node.sourceType === "relationship") return "relationship";
  if (hasTag(node, "place", "location", "home", "room")) return "place";
  // Grounding and calm recovery are represented as settling rhythm, not the high-energy emotional-turning-point enclosure.
  if (hasTag(node, "quiet-reset", "calm-reflection", "grounding")) return "pattern";
  if (node.type === "threshold" || node.type === "recovery" || hasTag(node, "emotion", "grief", "joy", "repair")) return "emotion";
  if (node.type === "ritual" || hasTag(node, "pattern", "habit", "recurring")) return "pattern";
  if (node.type === "legacy" || hasTag(node, "archive", "deep-time")) return "archive";
  if (node.sourceType === "conversation" || hasTag(node, "photo", "visual", "image")) return "visual";
  return node.intensity >= 0.78 ? "visual" : "everyday";
}

export function artifactFamilyLabel(node: LifeMapNode) {
  return FAMILY_LABELS[resolveArtifactFamily(node)];
}

export function artifactImportance(node: LifeMapNode) {
  const family = resolveArtifactFamily(node);
  const familyWeight = family === "achievement" || family === "goal" || family === "protected" ? 0.14 : family === "everyday" ? -0.1 : 0;
  return Math.max(0.24, Math.min(1, node.intensity + familyWeight));
}

export function resolvePathKind(source: LifeMapNode, target: LifeMapNode): LifeMapPathKind {
  if (source.locked || target.locked || source.privacyLevel === "hidden" || target.privacyLevel === "hidden") return "protected";
  if (hasTag(source, "corrected") || hasTag(target, "corrected")) return "corrected";
  if (hasTag(source, "inferred") || hasTag(target, "inferred")) return "inferred";
  if (hasTag(source, "family") || hasTag(target, "family")) return "family";
  if (hasTag(source, "friendship") || hasTag(target, "friendship")) return "friendship";
  if (hasTag(source, "work") || hasTag(target, "work")) return "work";
  if (hasTag(source, "conflict") || hasTag(target, "conflict")) return "conflict";
  if (resolveArtifactFamily(source) === "goal" || resolveArtifactFamily(target) === "goal") return "goal";
  if (resolveArtifactFamily(source) === "pattern" || resolveArtifactFamily(target) === "pattern") return "pattern";
  if (source.eraId && target.eraId && source.eraId === target.eraId) return "temporal";
  return "confirmed";
}

export function chapterForNode(node: LifeMapNode, _index = 0) {
  return LIFE_MAP_CHAPTERS.find((chapter) => chapter.id === node.eraId) || LIFE_MAP_CHAPTERS[stableChapterIndex(node)];
}

import type { LifeMapMode, LifeMapNode } from "./lifeMapModel";

export type FocusTier = "tier-1" | "tier-2" | "tier-3" | "tier-4" | "tier-5";

export type FocusLayerId = "signal" | "why" | "pattern" | "replay" | "ritual" | "council";

export type PrivacyTier = "private" | "circle" | "shareable";

export type FocusCameraState = {
  x: number;
  y: number;
  z: number;
  scale: number;
  parallax: number;
  blur: number;
  auraRadius: number;
};

export type FocusReplayPhase = {
  id: string;
  label: "memory" | "emotion" | "pattern" | "insight" | "return";
  text: string;
  startsAtMs: number;
  durationMs: number;
};

export type FocusReplayRecord = {
  id: string;
  nodeId: string;
  title: string;
  phases: FocusReplayPhase[];
  voiceTrackUrl: string | null;
  subtitleTrack: string[];
  particleTimeline: Array<{ atMs: number; aura: string; intensity: number }>;
  cameraPath: FocusCameraState[];
  nodePath: string[];
  emotionalIntensityCurve: number[];
  ritualEnding: string;
  exportableScrollId: string;
};

export type FocusLayer = {
  id: FocusLayerId;
  label: string;
  headline: string;
  body: string;
  evidence: string[];
};

export type FocusChamberNode = {
  id: string;
  title: string;
  subtitle: string;
  nodeType: string;
  emotion: string;
  intensity: number;
  auraColor: string;
  glyphType: string;
  privacyTier: PrivacyTier;
  timestamp: string;
  sourceSignalIds: string[];
  relatedNodeIds: string[];
  causalNodeIds: string[];
  nextLikelyState: LifeMapMode;
  explainabilitySummary: string;
  createdFrom: string;
  ritualAvailable: boolean;
  replayAvailable: boolean;
  replay: FocusReplayRecord;
  layers: FocusLayer[];
  camera: FocusCameraState;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);

function nextStateFor(node: LifeMapNode): LifeMapMode {
  if (node.isRecovery) return "recovery";
  if (node.isShadow) return "shadow";
  if (node.isDream) return "dream";
  if (node.isRelationship) return "relationship";
  if (node.isRitual) return "recovery";
  if (node.nodeType === "mirrorMoment" || node.nodeType === "legacy" || node.nodeType === "rebirth") return "mirror";
  return "timeline";
}

function ritualEndingFor(node: LifeMapNode) {
  if (node.isRecovery) return "Recovery bloom anniversary ritual";
  if (node.isShadow) return "Gentle shadow naming ritual";
  if (node.isDream) return "Dream symbol capture ritual";
  if (node.isRelationship) return "Relationship orbit reflection";
  if (node.isRitual) return "Ritual card export";
  return "Private memory grounding ritual";
}

function buildReplay(node: LifeMapNode, camera: FocusCameraState): FocusReplayRecord {
  const intensity = clamp(node.emotionalIntensity, 0, 1);
  const source = node.replayScript.length > 0 ? node.replayScript : [node.subtitle, node.description, node.narratorLine];

  return {
    id: `focus-replay-${node.id}`,
    nodeId: node.id,
    title: `${node.title} Replay`,
    voiceTrackUrl: null,
    subtitleTrack: source,
    nodePath: [node.id, ...node.relatedTags.slice(0, 3).map((tag) => `tag:${tag}`)],
    cameraPath: [
      { ...camera, scale: Math.max(1.08, camera.scale - 0.18), blur: 0 },
      { ...camera, scale: camera.scale, blur: camera.blur },
      { ...camera, scale: camera.scale + 0.12, auraRadius: camera.auraRadius + 16 },
    ],
    particleTimeline: [
      { atMs: 0, aura: node.auraColor, intensity: intensity * 0.5 },
      { atMs: 2600, aura: node.auraColor, intensity },
      { atMs: 6400, aura: node.auraColor, intensity: Math.min(1, intensity + 0.12) },
    ],
    emotionalIntensityCurve: [0.18, intensity * 0.7, intensity, Math.max(0.22, intensity - 0.18)],
    ritualEnding: ritualEndingFor(node),
    exportableScrollId: `scroll-${node.id}`,
    phases: [
      { id: `${node.id}-memory`, label: "memory", text: node.subtitle, startsAtMs: 0, durationMs: 2200 },
      { id: `${node.id}-emotion`, label: "emotion", text: `${node.emotionalTone} aura at ${Math.round(intensity * 100)}% intensity`, startsAtMs: 2200, durationMs: 2200 },
      { id: `${node.id}-pattern`, label: "pattern", text: node.description, startsAtMs: 4400, durationMs: 2800 },
      { id: `${node.id}-insight`, label: "insight", text: node.narratorLine, startsAtMs: 7200, durationMs: 2400 },
      { id: `${node.id}-return`, label: "return", text: ritualEndingFor(node), startsAtMs: 9600, durationMs: 2400 },
    ],
  };
}

export function buildFocusCamera(node: LifeMapNode): FocusCameraState {
  const intensity = clamp(node.emotionalIntensity, 0, 1);
  return {
    x: clamp(node.x, 0, 100),
    y: clamp(node.y, 0, 100),
    z: clamp(node.z, 0, 100),
    scale: 1.18 + intensity * 0.28,
    parallax: 0.16 + intensity * 0.34,
    blur: 1 + intensity * 5,
    auraRadius: 44 + intensity * 72,
  };
}

export function buildFocusLayers(node: LifeMapNode): FocusLayer[] {
  const chapter = node.chapterId.replace(/^chapter-/, "").replaceAll("-", " ");
  const signalText = node.sourceSignals.length > 0 ? node.sourceSignals.join(", ") : "private passive signal cluster";
  const relationshipEvidence = [...node.relatedPeople, ...node.relatedLocations, ...node.relatedTags].filter(Boolean);

  return [
    {
      id: "signal",
      label: "Signal",
      headline: node.title,
      body: node.description,
      evidence: [node.subtitle, `Chapter: ${chapter}`, `Tone: ${node.emotionalTone}`],
    },
    {
      id: "why",
      label: "Why",
      headline: "Why URAI surfaced this",
      body: `This node crossed the focus threshold through ${signalText}.`,
      evidence: node.sourceSignals,
    },
    {
      id: "pattern",
      label: "Pattern",
      headline: "What it connects to",
      body: node.narratorLine,
      evidence: relationshipEvidence.length > 0 ? relationshipEvidence : [node.clusterId, node.season],
    },
    {
      id: "replay",
      label: "Replay",
      headline: "Memory / emotion / pattern / return",
      body: "Replay is pre-wired with camera path, subtitles, particle curve, and ritual ending metadata.",
      evidence: node.replayScript,
    },
    {
      id: "ritual",
      label: "Ritual",
      headline: ritualEndingFor(node),
      body: "The ritual path is private by default and can become a memory scroll only after consent.",
      evidence: [node.privacyLevel, node.isRitual ? "ritual node" : "ritual suggestion"],
    },
    {
      id: "council",
      label: "Council",
      headline: "Companion interpretation",
      body: node.narratorLine,
      evidence: [node.glyphType, node.visualState],
    },
  ];
}

export function buildFocusChamberNode(node: LifeMapNode, relatedNodeIds: string[] = [], causalNodeIds: string[] = []): FocusChamberNode {
  const camera = buildFocusCamera(node);
  return {
    id: node.id,
    title: node.title,
    subtitle: node.subtitle,
    nodeType: node.nodeType,
    emotion: node.emotionalTone,
    intensity: clamp(node.emotionalIntensity, 0, 1),
    auraColor: node.auraColor,
    glyphType: node.glyphType,
    privacyTier: node.privacyLevel,
    timestamp: node.timestamp,
    sourceSignalIds: node.sourceSignals,
    relatedNodeIds,
    causalNodeIds,
    nextLikelyState: nextStateFor(node),
    explainabilitySummary: `URAI is showing this because ${node.sourceSignals.join(", ") || "private signals"} formed a ${node.nodeType} pattern in ${node.season}.`,
    createdFrom: node.clusterId || node.chapterId || "lifeMapNodes",
    ritualAvailable: node.isRitual || node.isRecovery || node.isShadow || node.isDream || node.isRelationship,
    replayAvailable: node.replayScript.length > 0 || Boolean(node.narratorLine),
    replay: buildReplay(node, camera),
    layers: buildFocusLayers(node),
    camera,
  };
}

export function getFocusCompletionTiers(chamber: FocusChamberNode): Record<FocusTier, boolean> {
  const hasCore = Boolean(chamber.id && chamber.title && chamber.subtitle && chamber.nodeType);
  const hasSpatial = chamber.camera.scale > 1 && chamber.camera.parallax > 0 && chamber.relatedNodeIds !== undefined;
  const hasReplay = chamber.replay.phases.length >= 4 && chamber.replay.cameraPath.length >= 2;
  const hasIntelligence = Boolean(chamber.explainabilitySummary && chamber.sourceSignalIds.length > 0 && chamber.layers.length === 6);
  const hasMythic = chamber.ritualAvailable && chamber.replay.particleTimeline.length > 0 && chamber.replay.exportableScrollId.length > 0;

  return {
    "tier-1": hasCore,
    "tier-2": hasCore && hasSpatial,
    "tier-3": hasCore && hasSpatial && hasReplay,
    "tier-4": hasCore && hasSpatial && hasReplay && hasIntelligence,
    "tier-5": hasCore && hasSpatial && hasReplay && hasIntelligence && hasMythic,
  };
}

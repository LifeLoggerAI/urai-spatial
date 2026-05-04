import type { LifeMapMode, LifeMapNode } from "./lifeMapModel";

export type FocusTier = "tier-1" | "tier-2" | "tier-3" | "tier-4" | "tier-5";
export type FocusLayerId = "signal" | "why" | "pattern" | "replay" | "ritual" | "council";

export type FocusLayer = {
  id: FocusLayerId;
  label: string;
  headline: string;
  body: string;
  evidence: string[];
};

export type FocusReplayPhase = {
  id: string;
  label: "memory" | "emotion" | "pattern" | "insight" | "return";
  text: string;
};

export type FocusChamberNode = {
  id: string;
  title: string;
  subtitle: string;
  nodeType: string;
  auraColor: string;
  sourceSignalIds: string[];
  relatedNodeIds: string[];
  causalNodeIds: string[];
  nextLikelyState: LifeMapMode;
  explainabilitySummary: string;
  ritualAvailable: boolean;
  replayAvailable: boolean;
  camera: { x: number; y: number; z: number; scale: number; parallax: number; blur: number; auraRadius: number };
  replay: { id: string; title: string; phases: FocusReplayPhase[]; particleTimeline: Array<{ atMs: number; aura: string; intensity: number }>; exportableScrollId: string; ritualEnding: string };
  layers: FocusLayer[];
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);

function nextStateFor(node: LifeMapNode): LifeMapMode {
  if (node.isRecovery) return "recovery";
  if (node.isShadow) return "shadow";
  if (node.isDream) return "dream";
  if (node.isRelationship) return "relationship";
  if (node.nodeType === "mirrorMoment" || node.nodeType === "legacy" || node.nodeType === "rebirth") return "mirror";
  return "timeline";
}

function ritualEndingFor(node: LifeMapNode) {
  if (node.isRecovery) return "Recovery bloom ritual";
  if (node.isShadow) return "Gentle shadow naming ritual";
  if (node.isDream) return "Dream symbol capture ritual";
  if (node.isRelationship) return "Relationship orbit reflection";
  return "Private grounding ritual";
}

export function buildFocusChamberNode(node: LifeMapNode, relatedNodeIds: string[] = [], causalNodeIds: string[] = []): FocusChamberNode {
  const intensity = clamp(node.emotionalIntensity, 0, 1);
  const explanation = `URAI is showing this because ${node.sourceSignals.join(", ") || "private signals"} formed a ${node.nodeType} pattern in ${node.season}.`;
  const phases: FocusReplayPhase[] = [
    { id: `${node.id}-memory`, label: "memory", text: node.subtitle },
    { id: `${node.id}-emotion`, label: "emotion", text: `${node.emotionalTone} aura at ${Math.round(intensity * 100)}% intensity` },
    { id: `${node.id}-pattern`, label: "pattern", text: node.description },
    { id: `${node.id}-insight`, label: "insight", text: node.narratorLine },
    { id: `${node.id}-return`, label: "return", text: ritualEndingFor(node) },
  ];

  return {
    id: node.id,
    title: node.title,
    subtitle: node.subtitle,
    nodeType: node.nodeType,
    auraColor: node.auraColor,
    sourceSignalIds: node.sourceSignals,
    relatedNodeIds,
    causalNodeIds,
    nextLikelyState: nextStateFor(node),
    explainabilitySummary: explanation,
    ritualAvailable: node.isRitual || node.isRecovery || node.isShadow || node.isDream || node.isRelationship,
    replayAvailable: node.replayScript.length > 0 || Boolean(node.narratorLine),
    camera: { x: clamp(node.x, 0, 100), y: clamp(node.y, 0, 100), z: clamp(node.z, 0, 100), scale: 1.18 + intensity * 0.28, parallax: 0.16 + intensity * 0.34, blur: 1 + intensity * 5, auraRadius: 44 + intensity * 72 },
    replay: { id: `focus-replay-${node.id}`, title: `${node.title} Replay`, phases, particleTimeline: [{ atMs: 0, aura: node.auraColor, intensity: intensity * 0.5 }, { atMs: 2600, aura: node.auraColor, intensity }], exportableScrollId: `scroll-${node.id}`, ritualEnding: ritualEndingFor(node) },
    layers: [
      { id: "signal", label: "Signal", headline: node.title, body: node.description, evidence: [node.subtitle, node.emotionalTone, node.chapterId] },
      { id: "why", label: "Why", headline: "Why URAI surfaced this", body: explanation, evidence: node.sourceSignals },
      { id: "pattern", label: "Pattern", headline: "What it connects to", body: node.narratorLine, evidence: [...node.relatedTags, node.clusterId] },
      { id: "replay", label: "Replay", headline: "Memory / emotion / pattern / return", body: "Replay is wired with phases, particles, subtitles, and export metadata.", evidence: node.replayScript },
      { id: "ritual", label: "Ritual", headline: ritualEndingFor(node), body: "Private by default. Export only after consent.", evidence: [node.privacyLevel] },
      { id: "council", label: "Council", headline: "Companion interpretation", body: node.narratorLine, evidence: [node.glyphType, node.visualState] },
    ],
  };
}

export function getFocusCompletionTiers(chamber: FocusChamberNode): Record<FocusTier, boolean> {
  const hasCore = Boolean(chamber.id && chamber.title && chamber.subtitle && chamber.nodeType);
  const hasSpatial = chamber.camera.scale > 1 && chamber.camera.parallax > 0;
  const hasReplay = chamber.replay.phases.length >= 4;
  const hasIntelligence = Boolean(chamber.explainabilitySummary && chamber.layers.length === 6);
  const hasMythic = chamber.replay.particleTimeline.length > 0 && chamber.replay.exportableScrollId.length > 0;
  return { "tier-1": hasCore, "tier-2": hasCore && hasSpatial, "tier-3": hasCore && hasSpatial && hasReplay, "tier-4": hasCore && hasSpatial && hasReplay && hasIntelligence, "tier-5": hasCore && hasSpatial && hasReplay && hasIntelligence && hasMythic };
}

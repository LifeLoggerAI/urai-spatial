import { Timestamp } from "firebase/firestore";
import type { CompanionState, ConstellationEdge, DreamMapNode, EmotionalBiome, LegacyScroll, LifeMapNode, MemoryStar, MoodForecast, RitualEvent, ShadowRealmEvent, SpatialWorld } from "@/lib/firebase/firebaseSpatialSchema";

export const DEMO_USER_ID = "public-safe-preview";
const t = (offsetDays = 0) => Timestamp.fromMillis(Date.UTC(2026, 0, 15 + offsetDays, 12, 0, 0));

export const demoSpatialWorld: SpatialWorld = {
  userId: DEMO_USER_ID,
  mode: "publicPreview",
  activeRealm: "home",
  skyTheme: "aurora",
  emotionalWeather: { mood: "calm focus", intensity: 0.62, valence: 0.58, arousal: 0.34 },
  companionStateId: "demo-companion-state",
  activeBiomeId: "demo-emotional-biome",
  lastGeneratedAt: t(0),
  createdAt: t(-7),
  updatedAt: t(0),
};

export const demoCompanionState: CompanionState = {
  userId: DEMO_USER_ID,
  mood: "reflective",
  message: "Your world is quiet. Eight public-safe memory stars are ready to explore.",
  voiceTone: "soft",
  orb: { color: "#77d9ff", glow: 0.86, pulseRate: 5.4, scale: 1.12 },
  suggestedAction: { label: "Enter Life Map", route: "/spatial/life-map", type: "lifeMap" },
  updatedAt: t(0),
};

const nodeSpecs = [
  ["demo-node-focus", "memory", "Morning Focus Returned", "A sample signal cluster shows steady attention returning after a quiet start.", -3.4, 1.7, -2.2, "#8bdcff", "focus"],
  ["demo-node-evening", "mood", "Quiet Evening Reflection", "A low-arousal evening moment becomes a soft reflection node in the sky.", -1.7, 2.8, -3.1, "#b7a6ff", "calm"],
  ["demo-node-pattern", "recovery", "Old Pattern Softened", "Repeated friction signals ease into a recovery arc without exposing private data.", 0.1, 2.2, -2.7, "#8ff0c9", "recovery"],
  ["demo-node-relationship", "relationship", "Relationship Thread Brightened", "A public-safe relationship pattern is represented as warmer connection energy.", 2.0, 3.1, -3.5, "#ffd98b", "connection"],
  ["demo-node-recovery", "ritual", "Recovery Arc Began", "A ritual node marks the beginning of a supportive rebound sequence.", 3.4, 1.8, -2.5, "#95ffb8", "ritual"],
  ["demo-node-dream", "dream", "Dream Symbol: Blue Door", "A dream-map sample links a symbolic image to the Life Map without raw journal content.", -2.6, 4.1, -4.2, "#6fb7ff", "dream"],
  ["demo-node-forecast", "forecast", "Forecast: Lighter Tomorrow", "A mood forecast node shows a gentle upward shift in emotional weather.", 0.9, 4.3, -4.6, "#dfffa8", "forecast"],
  ["demo-node-legacy", "legacy", "Legacy Thread: Becoming", "A legacy thread previews how repeated moments can become a larger narrative arc.", 3.1, 4.0, -4.0, "#f2d7ff", "legacy"],
] as const;

export const demoLifeMapNodes: Array<LifeMapNode & { id: string }> = nodeSpecs.map(([id, type, title, summary, x, y, z, color, tag], index) => ({
  id,
  userId: DEMO_USER_ID,
  type: type as LifeMapNode["type"],
  title,
  summary,
  timestamp: t(index - 7),
  position: { x, y, z },
  visual: { color, size: 0.42 + index * 0.02, glow: 0.7, glyph: "✦", aura: tag },
  sourceRefs: [{ collection: "publicSafePreview", id }],
  emotionalTags: [tag, "public-safe"],
  privacyLevel: "publicSafe",
  createdAt: t(index - 8),
}));

export const demoMemoryStars: Array<MemoryStar & { id: string }> = demoLifeMapNodes.map((node, index) => ({
  id: `demo-star-${index + 1}`,
  userId: DEMO_USER_ID,
  nodeId: node.id,
  brightness: 0.62 + index * 0.04,
  pulseRate: 4.2 + (index % 4) * 0.7,
  constellationGroupId: index < 4 ? "demo-arc-origin" : "demo-arc-becoming",
  position: node.position,
  label: node.title,
  unlocked: true,
  previewSafe: true,
}));

export const demoConstellationEdges: Array<ConstellationEdge & { id: string }> = [
  ["demo-node-focus", "demo-node-evening", "sameSeason"],
  ["demo-node-evening", "demo-node-pattern", "recoveryArc"],
  ["demo-node-pattern", "demo-node-recovery", "ritualChain"],
  ["demo-node-relationship", "demo-node-legacy", "legacyThread"],
  ["demo-node-dream", "demo-node-forecast", "forecastLink"],
  ["demo-node-recovery", "demo-node-legacy", "recoveryArc"],
].map(([fromNodeId, toNodeId, relationType], index) => ({
  id: `demo-edge-${index + 1}`,
  userId: DEMO_USER_ID,
  fromNodeId,
  toNodeId,
  relationType: relationType as ConstellationEdge["relationType"],
  strength: 0.55 + index * 0.06,
  visible: true,
  createdAt: t(index - 5),
}));

export const demoEmotionalBiome: EmotionalBiome & { id: string } = {
  id: "demo-emotional-biome",
  userId: DEMO_USER_ID,
  period: "week",
  dominantMood: "quiet recovery",
  terrainType: "aurora",
  intensityMap: { stress: 0.22, recovery: 0.74, joy: 0.46, fatigue: 0.31, connection: 0.52 },
  visualParams: { fogDensity: 0.44, particleDensity: 0.48, horizonGlow: 0.76, skyMotion: 0.32 },
  generatedAt: t(0),
};

export const demoMoodForecast: MoodForecast & { id: string } = {
  id: "demo-mood-forecast",
  userId: DEMO_USER_ID,
  periodStart: t(0),
  periodEnd: t(1),
  forecastMood: "lighter tomorrow",
  confidence: 0.71,
  riskSignals: ["late fatigue"],
  supportiveSignals: ["recovery arc", "connection thread"],
  visual: { skyShift: "soft aurora lift", cloudSpeed: 0.25, glowColor: "#8bdcff" },
  generatedAt: t(0),
};

export const demoRitualEvents: Array<RitualEvent & { id: string }> = [
  { id: "demo-ritual-reflect", userId: DEMO_USER_ID, nodeId: "demo-node-evening", title: "Name the quiet signal", type: "reflection", prompt: "What did your calmer evening make possible?", status: "suggested", visualGlyph: "◌", createdAt: t(0) },
  { id: "demo-ritual-release", userId: DEMO_USER_ID, nodeId: "demo-node-pattern", title: "Release the old loop", type: "release", prompt: "Let the softened pattern become a new threshold.", status: "suggested", visualGlyph: "⌁", createdAt: t(0) },
];

export const demoLegacyScroll: LegacyScroll & { id: string } = {
  id: "demo-legacy-scroll",
  userId: DEMO_USER_ID,
  title: "Legacy Thread: Becoming",
  periodStart: t(-7),
  periodEnd: t(0),
  nodeIds: demoLifeMapNodes.map((node) => node.id),
  narrative: "A public-safe preview of how repeated symbolic moments can become a coherent life arc.",
  visualTheme: "aurora-night",
  exportStatus: "draft",
  createdAt: t(0),
};

export const demoShadowRealmEvent: ShadowRealmEvent & { id: string } = {
  id: "demo-shadow-event",
  userId: DEMO_USER_ID,
  title: "Private Shadow Threshold",
  summary: "A private-only shadow sample demonstrates where difficult patterns would route without exposing details.",
  severity: 0.42,
  sourceSignals: ["public-safe-shadow-sample"],
  nodeId: "demo-node-pattern",
  suggestedRitualId: "demo-ritual-release",
  privacyLevel: "private",
  createdAt: t(0),
};

export const demoDreamMapNodes: Array<DreamMapNode & { id: string }> = [
  { id: "demo-dream-blue-door", userId: DEMO_USER_ID, title: "Blue Door", symbols: ["door", "blue light", "threshold"], emotionalTone: "curious", linkedMemoryNodeIds: ["demo-node-dream"], position: { x: -2.6, y: 4.1, z: -4.2 }, createdAt: t(0) },
  { id: "demo-dream-quiet-water", userId: DEMO_USER_ID, title: "Quiet Water", symbols: ["water", "reflection"], emotionalTone: "settled", linkedMemoryNodeIds: ["demo-node-evening"], position: { x: -1.2, y: 3.6, z: -4.8 }, createdAt: t(0) },
];

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

export type LifeMapPhase = "home" | "lifemap" | "focus" | "replay" | "mirror";

export type LifeMapMode =
  | "timeline"
  | "constellation"
  | "weather"
  | "recovery"
  | "shadow"
  | "dream"
  | "relationship"
  | "chapter"
  | "mirror";

export type LifeMapNodeType =
  | "memory"
  | "insight"
  | "ritual"
  | "dream"
  | "relationship"
  | "recovery"
  | "shadow"
  | "milestone"
  | "chapter"
  | "voiceMoment"
  | "locationMoment"
  | "emotionalShift"
  | "habitPattern"
  | "socialPattern"
  | "threshold"
  | "rebirth"
  | "legacy"
  | "mirrorMoment";

export type EmotionalTone =
  | "calm"
  | "clarity"
  | "memory"
  | "milestone"
  | "purpose"
  | "dream"
  | "mystery"
  | "pain"
  | "conflict"
  | "recovery"
  | "growth"
  | "rebirth"
  | "shadow";

export type LifeMapNode = {
  id: string;
  userId: string;
  title: string;
  subtitle: string;
  description: string;
  timestamp: string;
  nodeType: LifeMapNodeType;
  emotionalTone: EmotionalTone;
  emotionalIntensity: number;
  auraColor: string;
  glyphType: string;
  chapterId: string;
  season: string;
  importanceScore: number;
  privacyLevel: "private" | "circle" | "shareable";
  x: number;
  y: number;
  z: number;
  clusterId: string;
  relatedPeople: string[];
  relatedLocations: string[];
  relatedTags: string[];
  sourceSignals: string[];
  replayScript: string[];
  narratorLine: string;
  visualState: "quiet" | "glowing" | "blooming" | "fogged" | "orbiting" | "resolved";
  isMilestone: boolean;
  isShadow: boolean;
  isRecovery: boolean;
  isDream: boolean;
  isRelationship: boolean;
  isRitual: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LifeMapEdge = {
  id: string;
  from: string;
  to: string;
  strength: number;
  edgeType: "chapter" | "relationship" | "recovery" | "shadow" | "dream" | "ritual" | "mirror";
  label: string;
};

export type LifeChapter = {
  id: string;
  title: string;
  summary: string;
  dominantEmotions: EmotionalTone[];
  coverGradient: string;
  keyNodeIds: string[];
  narratorVoiceover: string;
};

export type ReplayFrame = {
  nodeId: string;
  cameraLabel: string;
  narrator: string;
  weather: LifeMapMode;
};

type GeneratedLifeMap = {
  userId: string;
  nodes: LifeMapNode[];
  edges: LifeMapEdge[];
  source: "firestore" | "demo-fallback";
};

const now = "2026-05-04T12:00:00.000Z";
const LIFE_MAP_SETTINGS_DOC_ID = "default";
const MIRROR_DOC_ID = "mirrorOfBecoming";

const toneColor: Record<EmotionalTone, string> = {
  calm: "#9bdcff",
  clarity: "#dbeafe",
  memory: "#b9d8ff",
  milestone: "#f6d365",
  purpose: "#facc15",
  dream: "#c4b5fd",
  mystery: "#a78bfa",
  pain: "#fb7185",
  conflict: "#f97316",
  recovery: "#86efac",
  growth: "#34d399",
  rebirth: "#f8fafc",
  shadow: "#8b5cf6",
};

const nodeBlueprints: Array<[LifeMapNodeType, EmotionalTone, string, string, string, number, number, string]> = [
  ["memory", "memory", "First Signal", "A faint pattern begins", "The earliest visible pulse in the sky, before the pattern had a name.", 14, 35, "chapter-becoming"],
  ["voiceMoment", "calm", "Quiet Voice", "Soft steadiness returns", "A voice moment that lowered the weather and made the map feel safe again.", 22, 47, "chapter-becoming"],
  ["locationMoment", "clarity", "Known Place", "The body recognized safety", "A location cluster where calm, routine, and memory began connecting.", 31, 58, "chapter-becoming"],
  ["emotionalShift", "conflict", "Static Spike", "Energy rose too quickly", "A difficult day where behavior, motion, and communication signals intensified.", 42, 40, "chapter-threshold"],
  ["shadow", "shadow", "Hidden Loop", "The old pattern returned", "A recurring loop wrapped in fog, shown gently without clinical judgment.", 52, 53, "chapter-threshold"],
  ["threshold", "pain", "The Door", "The before and after moment", "A threshold state where the map contracts before it opens again.", 62, 36, "chapter-threshold"],
  ["recovery", "recovery", "Recovery Bloom", "A soft return after overload", "The first brightening after a low point, with growth visible in the edges.", 68, 62, "chapter-return"],
  ["ritual", "growth", "Small Ritual", "A repeatable act became medicine", "A quiet ritual anchored the week and converted stress into rhythm.", 78, 72, "chapter-return"],
  ["relationship", "purpose", "Warm Orbit", "Someone became a steady star", "A relationship node with closeness, warmth, and recurring emotional gravity.", 84, 45, "chapter-return"],
  ["dream", "dream", "Purple Dream", "The subconscious left a symbol", "A dream node that linked mystery, mood, and a memory cluster.", 38, 22, "chapter-dream"],
  ["dream", "mystery", "Dream Echo", "A symbol repeated", "A second dream event that carried the same shape across seasons.", 48, 16, "chapter-dream"],
  ["insight", "milestone", "Named Pattern", "The mind finally saw it", "A narrator insight turned scattered signals into a useful story.", 58, 23, "chapter-dream"],
  ["socialPattern", "conflict", "Tension Thread", "A bond changed shape", "A relationship pattern with warmth, absence, and tension moving together.", 73, 26, "chapter-return"],
  ["habitPattern", "calm", "Rhythm Anchor", "Routine became visible", "A habit pattern that stabilized the emotional weather.", 18, 69, "chapter-becoming"],
  ["milestone", "milestone", "Gold Marker", "A major life point", "A high-importance moment that deserves a larger star and exportable card.", 46, 75, "chapter-return"],
  ["rebirth", "rebirth", "White Bloom", "The map opened wider", "A bright rebirth marker where the old chapter finally loosened.", 56, 82, "chapter-mirror"],
  ["legacy", "clarity", "Legacy Thread", "A lesson became shareable", "A thread that can become a scroll, card, or future Mirror voiceover.", 70, 84, "chapter-mirror"],
  ["mirrorMoment", "purpose", "Mirror of Becoming", "The life arc zooms out", "A zoom-out point that links recovery, shadow, relationship, and purpose.", 86, 84, "chapter-mirror"],
  ["insight", "growth", "Hidden Growth", "Survival became evidence", "A narrator insight reveals growth that was invisible while it was happening.", 26, 82, "chapter-return"],
  ["relationship", "calm", "Absence Trail", "Silence became a shape", "A relationship orbit where distance is visible without blame.", 11, 52, "chapter-threshold"],
  ["recovery", "growth", "Second Bloom", "The rebound got faster", "Another recovery event shows that the nervous system learned the route back.", 35, 88, "chapter-return"],
  ["shadow", "pain", "Red Thread", "A painful recurrence", "A difficult pattern represented as a flicker, not a diagnosis.", 64, 70, "chapter-threshold"],
  ["ritual", "clarity", "Crystal Card", "A ritual became exportable", "A ritual memory ready for a scroll-style card or private anniversary reminder.", 74, 57, "chapter-return"],
  ["memory", "calm", "Soft Morning", "The day opened quietly", "A low-intensity memory that gives the galaxy texture and emotional grounding.", 20, 24, "chapter-becoming"],
  ["insight", "purpose", "Purpose Thread", "The pattern points forward", "A purpose insight that connects habit, recovery, and relationship nodes.", 90, 64, "chapter-mirror"],
];

export const lifeMapNodes: LifeMapNode[] = nodeBlueprints.map((item, index) => {
  const [nodeType, emotionalTone, title, subtitle, description, x, y, chapterId] = item;
  const id = `node-${String(index + 1).padStart(2, "0")}`;

  return {
    id,
    userId: "demo-user",
    title,
    subtitle,
    description,
    timestamp: new Date(Date.UTC(2025, index % 12, Math.max(1, index + 1))).toISOString(),
    nodeType,
    emotionalTone,
    emotionalIntensity: 0.35 + ((index % 7) * 0.09),
    auraColor: toneColor[emotionalTone],
    glyphType: nodeType,
    chapterId,
    season: ["winter", "spring", "summer", "autumn"][index % 4],
    importanceScore: 42 + ((index * 11) % 55),
    privacyLevel: index % 5 === 0 ? "circle" : "private",
    x,
    y,
    z: (index % 6) * 8,
    clusterId: chapterId.replace("chapter-", "cluster-"),
    relatedPeople: nodeType === "relationship" || nodeType === "socialPattern" ? ["Trusted orbit"] : [],
    relatedLocations: nodeType === "locationMoment" ? ["Home radius"] : [],
    relatedTags: [nodeType, emotionalTone, chapterId],
    sourceSignals: ["passive rhythm", "mood weather", "interaction metadata"],
    replayScript: [
      "The camera slows near this star.",
      "The aura opens and reveals what changed.",
      "The companion translates the pattern gently.",
    ],
    narratorLine: narratorLineFor(nodeType, emotionalTone),
    visualState:
      nodeType === "shadow"
        ? "fogged"
        : nodeType === "recovery"
          ? "blooming"
          : nodeType === "relationship"
            ? "orbiting"
            : "glowing",
    isMilestone: nodeType === "milestone" || nodeType === "rebirth" || nodeType === "mirrorMoment",
    isShadow: nodeType === "shadow",
    isRecovery: nodeType === "recovery",
    isDream: nodeType === "dream",
    isRelationship: nodeType === "relationship" || nodeType === "socialPattern",
    isRitual: nodeType === "ritual",
    createdAt: now,
    updatedAt: now,
  };
});

export const lifeMapEdges: LifeMapEdge[] = [
  ["node-01", "node-04", "chapter", "early signal to intensity"],
  ["node-04", "node-05", "shadow", "static became loop"],
  ["node-05", "node-07", "recovery", "loop softened into bloom"],
  ["node-07", "node-08", "ritual", "bloom stabilized by ritual"],
  ["node-09", "node-13", "relationship", "warmth and tension orbit"],
  ["node-10", "node-11", "dream", "symbol repeated"],
  ["node-11", "node-12", "dream", "dream became insight"],
  ["node-15", "node-16", "mirror", "milestone to rebirth"],
  ["node-16", "node-18", "mirror", "rebirth to mirror"],
  ["node-19", "node-21", "recovery", "growth arc repeated"],
  ["node-20", "node-22", "shadow", "absence and red thread"],
  ["node-23", "node-25", "ritual", "ritual to purpose"],
].map(([from, to, edgeType, label], index) => ({
  id: `edge-${index + 1}`,
  from,
  to,
  strength: 0.34 + ((index % 6) * 0.11),
  edgeType: edgeType as LifeMapEdge["edgeType"],
  label,
}));

export const lifeChapters: LifeChapter[] = [
  {
    id: "chapter-becoming",
    title: "The Season of Becoming",
    summary: "Early signals, calm anchors, and the first visible shape of the life map.",
    dominantEmotions: ["memory", "calm", "clarity"],
    coverGradient: "linear-gradient(135deg, #0f2747, #7dd3fc)",
    keyNodeIds: ["node-01", "node-02", "node-03", "node-14", "node-24"],
    narratorVoiceover: "This chapter began quietly. URAI noticed small signals before they became a story.",
  },
  {
    id: "chapter-threshold",
    title: "The Threshold",
    summary: "A difficult region where static, shadow, and tension became visible without judgment.",
    dominantEmotions: ["conflict", "shadow", "pain"],
    coverGradient: "linear-gradient(135deg, #18091f, #f97316)",
    keyNodeIds: ["node-04", "node-05", "node-06", "node-20", "node-22"],
    narratorVoiceover: "This was not failure. It was the door before the return.",
  },
  {
    id: "chapter-return",
    title: "The Recovery Arc",
    summary: "Recovery blooms, ritual anchors, and relationship orbits turned pressure into movement.",
    dominantEmotions: ["recovery", "growth", "purpose"],
    coverGradient: "linear-gradient(135deg, #052e1d, #86efac)",
    keyNodeIds: ["node-07", "node-08", "node-09", "node-15", "node-19", "node-21", "node-23"],
    narratorVoiceover: "The bloom returned more than once. That repetition is evidence of resilience.",
  },
  {
    id: "chapter-dream",
    title: "The Purple Dream Field",
    summary: "Dream symbols and mystery nodes linked the inner life to mood weather.",
    dominantEmotions: ["dream", "mystery", "milestone"],
    coverGradient: "linear-gradient(135deg, #1e1b4b, #c4b5fd)",
    keyNodeIds: ["node-10", "node-11", "node-12"],
    narratorVoiceover: "The symbols repeated because some part of you was already organizing the truth.",
  },
  {
    id: "chapter-mirror",
    title: "Mirror of Becoming",
    summary: "The zoom-out chapter where rebirth, legacy, purpose, and the full symbolic arc connect.",
    dominantEmotions: ["rebirth", "clarity", "purpose"],
    coverGradient: "linear-gradient(135deg, #020617, #f8fafc)",
    keyNodeIds: ["node-16", "node-17", "node-18", "node-25"],
    narratorVoiceover: "You were becoming someone new before you had language for it.",
  },
];

export const mirrorReplayPath: ReplayFrame[] = [
  {
    nodeId: "node-01",
    cameraLabel: "First signal",
    narrator: "The map begins where the first signal glows.",
    weather: "timeline",
  },
  {
    nodeId: "node-05",
    cameraLabel: "Shadow loop",
    narrator: "A hidden loop appears, not as judgment, but as information.",
    weather: "shadow",
  },
  {
    nodeId: "node-07",
    cameraLabel: "Recovery bloom",
    narrator: "This was the beginning of a recovery bloom.",
    weather: "recovery",
  },
  {
    nodeId: "node-11",
    cameraLabel: "Dream field",
    narrator: "The dream returned with the same symbol across seasons.",
    weather: "dream",
  },
  {
    nodeId: "node-18",
    cameraLabel: "Mirror zoom-out",
    narrator: "This is one of your hidden growth arcs.",
    weather: "mirror",
  },
];

export const lifeMapModes: Array<{ id: LifeMapMode; label: string; helper: string }> = [
  { id: "timeline", label: "Timeline", helper: "Chronological emotional flight" },
  { id: "constellation", label: "Constellations", helper: "Related memories and arcs" },
  { id: "weather", label: "Weather", helper: "Fog, rain, aurora, sunrise" },
  { id: "recovery", label: "Recovery", helper: "Blooming rebound paths" },
  { id: "shadow", label: "Shadow", helper: "Gentle difficult patterns" },
  { id: "dream", label: "Dreams", helper: "Purple symbolic field" },
  { id: "relationship", label: "Relations", helper: "Orbiting social stars" },
  { id: "chapter", label: "Chapters", helper: "Life regions and portals" },
  { id: "mirror", label: "Mirror", helper: "Full arc zoom-out" },
];

function userSubcollection(userId: string, collectionName: string) {
  return collection(getFirebaseDb(), "users", userId, collectionName);
}

function userSubdocument(userId: string, collectionName: string, documentId: string) {
  return doc(getFirebaseDb(), "users", userId, collectionName, documentId);
}

function isConfiguredUser(userId: string) {
  return Boolean(userId && userId !== "demo-user");
}

function getString(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function getNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function getStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
}

function getTone(value: unknown, fallback: EmotionalTone): EmotionalTone {
  return Object.prototype.hasOwnProperty.call(toneColor, String(value)) ? (value as EmotionalTone) : fallback;
}

function getNodeType(value: unknown, fallback: LifeMapNodeType): LifeMapNodeType {
  const allowed: LifeMapNodeType[] = [
    "memory",
    "insight",
    "ritual",
    "dream",
    "relationship",
    "recovery",
    "shadow",
    "milestone",
    "chapter",
    "voiceMoment",
    "locationMoment",
    "emotionalShift",
    "habitPattern",
    "socialPattern",
    "threshold",
    "rebirth",
    "legacy",
    "mirrorMoment",
  ];
  return allowed.includes(value as LifeMapNodeType) ? (value as LifeMapNodeType) : fallback;
}

function getVisualState(value: unknown, fallback: LifeMapNode["visualState"]): LifeMapNode["visualState"] {
  const allowed: Array<LifeMapNode["visualState"]> = ["quiet", "glowing", "blooming", "fogged", "orbiting", "resolved"];
  return allowed.includes(value as LifeMapNode["visualState"]) ? (value as LifeMapNode["visualState"]) : fallback;
}

function getPrivacyLevel(value: unknown, fallback: LifeMapNode["privacyLevel"]): LifeMapNode["privacyLevel"] {
  const allowed: Array<LifeMapNode["privacyLevel"]> = ["private", "circle", "shareable"];
  return allowed.includes(value as LifeMapNode["privacyLevel"]) ? (value as LifeMapNode["privacyLevel"]) : fallback;
}

function firestoreDate(value: unknown, fallback: string) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return fallback;
}

function nodeFromFirestore(id: string, data: DocumentData, fallback: LifeMapNode): LifeMapNode {
  const nodeType = getNodeType(data.nodeType, fallback.nodeType);
  const emotionalTone = getTone(data.emotionalTone, fallback.emotionalTone);

  return {
    id: getString(data.id, id),
    userId: getString(data.userId, fallback.userId),
    title: getString(data.title, fallback.title),
    subtitle: getString(data.subtitle, fallback.subtitle),
    description: getString(data.description, fallback.description),
    timestamp: firestoreDate(data.timestamp, fallback.timestamp),
    nodeType,
    emotionalTone,
    emotionalIntensity: getNumber(data.emotionalIntensity, fallback.emotionalIntensity),
    auraColor: getString(data.auraColor, toneColor[emotionalTone]),
    glyphType: getString(data.glyphType, nodeType),
    chapterId: getString(data.chapterId, fallback.chapterId),
    season: getString(data.season, fallback.season),
    importanceScore: getNumber(data.importanceScore, fallback.importanceScore),
    privacyLevel: getPrivacyLevel(data.privacyLevel, fallback.privacyLevel),
    x: getNumber(data.x, fallback.x),
    y: getNumber(data.y, fallback.y),
    z: getNumber(data.z, fallback.z),
    clusterId: getString(data.clusterId, fallback.clusterId),
    relatedPeople: getStringArray(data.relatedPeople, fallback.relatedPeople),
    relatedLocations: getStringArray(data.relatedLocations, fallback.relatedLocations),
    relatedTags: getStringArray(data.relatedTags, fallback.relatedTags),
    sourceSignals: getStringArray(data.sourceSignals, fallback.sourceSignals),
    replayScript: getStringArray(data.replayScript, fallback.replayScript),
    narratorLine: getString(data.narratorLine, narratorLineFor(nodeType, emotionalTone)),
    visualState: getVisualState(data.visualState, fallback.visualState),
    isMilestone: getBoolean(data.isMilestone, fallback.isMilestone),
    isShadow: getBoolean(data.isShadow, fallback.isShadow),
    isRecovery: getBoolean(data.isRecovery, fallback.isRecovery),
    isDream: getBoolean(data.isDream, fallback.isDream),
    isRelationship: getBoolean(data.isRelationship, fallback.isRelationship),
    isRitual: getBoolean(data.isRitual, fallback.isRitual),
    createdAt: firestoreDate(data.createdAt, fallback.createdAt),
    updatedAt: firestoreDate(data.updatedAt, fallback.updatedAt),
  };
}

function edgeFromFirestore(id: string, data: DocumentData, fallback: LifeMapEdge): LifeMapEdge {
  const edgeTypes: Array<LifeMapEdge["edgeType"]> = ["chapter", "relationship", "recovery", "shadow", "dream", "ritual", "mirror"];
  const edgeType = edgeTypes.includes(data.edgeType as LifeMapEdge["edgeType"]) ? (data.edgeType as LifeMapEdge["edgeType"]) : fallback.edgeType;

  return {
    id: getString(data.id, id),
    from: getString(data.from, fallback.from),
    to: getString(data.to, fallback.to),
    strength: getNumber(data.strength, fallback.strength),
    edgeType,
    label: getString(data.label, fallback.label),
  };
}

function chapterFromFirestore(id: string, data: DocumentData, fallback: LifeChapter): LifeChapter {
  return {
    id: getString(data.id, id),
    title: getString(data.title, fallback.title),
    summary: getString(data.summary, fallback.summary),
    dominantEmotions: getStringArray(data.dominantEmotions, fallback.dominantEmotions).map((tone) => getTone(tone, "memory")),
    coverGradient: getString(data.coverGradient, fallback.coverGradient),
    keyNodeIds: getStringArray(data.keyNodeIds, fallback.keyNodeIds),
    narratorVoiceover: getString(data.narratorVoiceover, fallback.narratorVoiceover),
  };
}

async function seedDemoLifeMap(userId: string) {
  const batch = writeBatch(getFirebaseDb());
  const stampedAt = new Date().toISOString();

  lifeMapNodes.forEach((node) => {
    batch.set(userSubdocument(userId, "lifeMapNodes", node.id), {
      ...node,
      userId,
      seededFrom: "urai-spatial-demo",
      updatedAt: stampedAt,
      createdAt: node.createdAt || stampedAt,
    });
  });

  lifeMapEdges.forEach((edge) => {
    batch.set(userSubdocument(userId, "lifeMapEdges", edge.id), edge);
  });

  lifeChapters.forEach((chapter) => {
    batch.set(userSubdocument(userId, "lifeChapters", chapter.id), chapter);
  });

  await batch.commit();
}

export function narratorLineFor(nodeType: LifeMapNodeType, tone: EmotionalTone) {
  if (nodeType === "recovery") return "This was the beginning of a recovery bloom.";
  if (nodeType === "relationship" || nodeType === "socialPattern") return "This relationship changed shape here.";
  if (nodeType === "shadow") return "This cluster carries pain, but also evidence of survival.";
  if (nodeType === "dream") return "A symbol surfaced before the conscious story was ready.";
  if (nodeType === "mirrorMoment") return "You were becoming someone new before you had language for it.";
  if (tone === "milestone" || tone === "purpose") return "This was not just a memory. It became a turning point.";

  return "Notice how this moment belongs to a larger pattern.";
}

export function filteredNodes(mode: LifeMapMode, nodes = lifeMapNodes) {
  if (mode === "recovery") return nodes.filter((node) => node.isRecovery || node.emotionalTone === "growth");

  if (mode === "shadow") {
    return nodes.filter(
      (node) => node.isShadow || node.emotionalTone === "pain" || node.emotionalTone === "conflict",
    );
  }

  if (mode === "dream") return nodes.filter((node) => node.isDream || node.chapterId === "chapter-dream");

  if (mode === "relationship") return nodes.filter((node) => node.isRelationship);

  if (mode === "chapter") {
    return nodes.filter((node) => node.isMilestone || node.nodeType === "chapter" || node.chapterId.includes("mirror"));
  }

  if (mode === "mirror") {
    return nodes.filter((node) => node.isMilestone || node.nodeType === "mirrorMoment" || node.nodeType === "legacy");
  }

  return nodes;
}

export function edgeNodes(edge: LifeMapEdge, nodes = lifeMapNodes) {
  return {
    from: nodes.find((node) => node.id === edge.from),
    to: nodes.find((node) => node.id === edge.to),
  };
}

export async function fetchLifeMapNodes(userId: string): Promise<LifeMapNode[]> {
  if (!isConfiguredUser(userId)) return lifeMapNodes;

  try {
    const snapshot = await getDocs(query(userSubcollection(userId, "lifeMapNodes"), orderBy("timestamp", "asc")));
    if (snapshot.empty) return lifeMapNodes.map((node) => ({ ...node, userId }));

    return snapshot.docs.map((document, index) =>
      nodeFromFirestore(document.id, document.data(), {
        ...lifeMapNodes[index % lifeMapNodes.length],
        id: document.id,
        userId,
      }),
    );
  } catch (error) {
    console.warn("[LifeMap] Falling back to demo nodes after Firestore read failed", error);
    return lifeMapNodes.map((node) => ({ ...node, userId }));
  }
}

export async function fetchLifeMapEdges(userId: string): Promise<LifeMapEdge[]> {
  if (!isConfiguredUser(userId)) return lifeMapEdges;

  try {
    const snapshot = await getDocs(userSubcollection(userId, "lifeMapEdges"));
    if (snapshot.empty) return lifeMapEdges;

    return snapshot.docs.map((document, index) =>
      edgeFromFirestore(document.id, document.data(), {
        ...lifeMapEdges[index % lifeMapEdges.length],
        id: document.id,
      }),
    );
  } catch (error) {
    console.warn("[LifeMap] Falling back to demo edges after Firestore read failed", error);
    return lifeMapEdges;
  }
}

export async function fetchLifeChapters(userId: string): Promise<LifeChapter[]> {
  if (!isConfiguredUser(userId)) return lifeChapters;

  try {
    const snapshot = await getDocs(userSubcollection(userId, "lifeChapters"));
    if (snapshot.empty) return lifeChapters;

    return snapshot.docs.map((document, index) =>
      chapterFromFirestore(document.id, document.data(), {
        ...lifeChapters[index % lifeChapters.length],
        id: document.id,
      }),
    );
  } catch (error) {
    console.warn("[LifeMap] Falling back to demo chapters after Firestore read failed", error);
    return lifeChapters;
  }
}

export async function saveLifeMapSettings(userId: string, settings: Record<string, unknown>) {
  const payload = {
    ...settings,
    userId,
    updatedAt: serverTimestamp(),
  };

  if (!isConfiguredUser(userId)) {
    return {
      userId,
      settings,
      savedAt: new Date().toISOString(),
      source: "demo-fallback" as const,
    };
  }

  try {
    await setDoc(userSubdocument(userId, "lifeMapSettings", LIFE_MAP_SETTINGS_DOC_ID), payload, { merge: true });

    return {
      userId,
      settings,
      savedAt: new Date().toISOString(),
      source: "firestore" as const,
    };
  } catch (error) {
    console.warn("[LifeMap] Failed to save settings", error);
    return {
      userId,
      settings,
      savedAt: new Date().toISOString(),
      source: "demo-fallback" as const,
    };
  }
}

export async function createLifeMapNode(userId: string, node: Partial<LifeMapNode>) {
  const timestamp = new Date().toISOString();
  const id = node.id ?? `node-${Date.now()}`;
  const baseNode: LifeMapNode = {
    ...lifeMapNodes[0],
    ...node,
    id,
    userId,
    timestamp: node.timestamp ?? timestamp,
    createdAt: node.createdAt ?? timestamp,
    updatedAt: timestamp,
    privacyLevel: node.privacyLevel ?? "private",
  } as LifeMapNode;

  if (!isConfiguredUser(userId)) return baseNode;

  try {
    await setDoc(userSubdocument(userId, "lifeMapNodes", id), {
      ...baseNode,
      createdAt: baseNode.createdAt,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn("[LifeMap] Failed to create node; returning local node", error);
  }

  return baseNode;
}

export async function updateLifeMapNode(userId: string, nodeId: string, updates: Partial<LifeMapNode>) {
  const updatedAt = new Date().toISOString();
  const payload = {
    ...updates,
    id: nodeId,
    userId,
    updatedAt: serverTimestamp(),
  };

  if (!isConfiguredUser(userId)) {
    return {
      userId,
      nodeId,
      updates,
      updatedAt,
      source: "demo-fallback" as const,
    };
  }

  try {
    await updateDoc(userSubdocument(userId, "lifeMapNodes", nodeId), payload);

    return {
      userId,
      nodeId,
      updates,
      updatedAt,
      source: "firestore" as const,
    };
  } catch (error) {
    console.warn("[LifeMap] Failed to update node", error);
    return {
      userId,
      nodeId,
      updates,
      updatedAt,
      source: "demo-fallback" as const,
    };
  }
}

export async function generateLifeMapFromSignals(userId: string): Promise<GeneratedLifeMap> {
  if (!isConfiguredUser(userId)) {
    return {
      userId,
      nodes: lifeMapNodes,
      edges: lifeMapEdges,
      source: "demo-fallback",
    };
  }

  try {
    let nodes = await fetchLifeMapNodes(userId);
    let edges = await fetchLifeMapEdges(userId);

    const isDemoOnly = nodes.length === lifeMapNodes.length && nodes.every((node) => node.userId === userId && node.id.startsWith("node-"));
    if (isDemoOnly && edges.length === lifeMapEdges.length) {
      await seedDemoLifeMap(userId);
      nodes = await fetchLifeMapNodes(userId);
      edges = await fetchLifeMapEdges(userId);
    }

    return {
      userId,
      nodes,
      edges,
      source: "firestore",
    };
  } catch (error) {
    console.warn("[LifeMap] Failed to generate from Firestore signals", error);
    return {
      userId,
      nodes: lifeMapNodes.map((node) => ({ ...node, userId })),
      edges: lifeMapEdges,
      source: "demo-fallback",
    };
  }
}

export async function generateReplayPath(userId: string, nodeIds: string[]) {
  const nodes = await fetchLifeMapNodes(userId);

  return nodeIds.map((nodeId, index) => ({
    nodeId,
    cameraLabel: nodes.find((node) => node.id === nodeId)?.title ?? `Replay frame ${index + 1}`,
    narrator: nodes.find((node) => node.id === nodeId)?.narratorLine ?? "The camera moves through this memory.",
    weather: "timeline" as LifeMapMode,
  }));
}

export async function generateMirrorOfBecoming(userId: string) {
  const chapters = await fetchLifeChapters(userId);
  const nodes = await fetchLifeMapNodes(userId);
  const path = mirrorReplayPath.map((frame) => {
    const node = nodes.find((candidate) => candidate.id === frame.nodeId);
    return node
      ? {
          ...frame,
          cameraLabel: node.title,
          narrator: node.narratorLine,
          weather: node.isShadow ? "shadow" : node.isRecovery ? "recovery" : node.isDream ? "dream" : frame.weather,
        }
      : frame;
  });

  const mirror = {
    userId,
    path,
    chapters,
    generatedAt: new Date().toISOString(),
  };

  if (!isConfiguredUser(userId)) return mirror;

  try {
    await setDoc(userSubdocument(userId, "narratorInsights", MIRROR_DOC_ID), {
      ...mirror,
      updatedAt: serverTimestamp(),
      insightType: "mirrorOfBecoming",
      privacyLevel: "private",
    }, { merge: true });
  } catch (error) {
    console.warn("[LifeMap] Failed to persist Mirror of Becoming", error);
  }

  return mirror;
}

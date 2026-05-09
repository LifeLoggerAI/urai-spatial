export type LifeMapNodeType =
  | "memory"
  | "season"
  | "ritual"
  | "forecast"
  | "threshold"
  | "relationship"
  | "recovery"
  | "legacy";

export type LifeMapNode = {
  id: string;
  title: string;
  subtitle: string;
  type: LifeMapNodeType;
  position: [number, number, number];
  intensity: number;
  aura: string;
  dateLabel: string;
  replayAvailable: boolean;
  locked?: boolean;
  summary: string;
  connectedTo: string[];
  occurredAt?: string;
  sourceType?: LifeMapEventSourceType;
  clusterId?: string;
  eraId?: string;
  narratorHint?: string;
  privacyLevel?: LifeMapPrivacyLevel;
  tags?: string[];
};

export type LifeMapPrivacyLevel = "private" | "hidden" | "shareable";

export type LifeMapEventSourceType =
  | "audio"
  | "conversation"
  | "ritual"
  | "forecast"
  | "manual_seed"
  | "system_generated"
  | "relationship"
  | "recovery"
  | "legacy";

export type LifeMapEvent = {
  id: string;
  userId: string;
  title: string;
  subtitle?: string;
  summary: string;
  type: LifeMapNodeType;
  sourceType: LifeMapEventSourceType;
  sourceId?: string;
  occurredAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  intensity: number;
  aura?: string;
  position?: [number, number, number];
  clusterId?: string;
  eraId?: string;
  replayAvailable?: boolean;
  locked?: boolean;
  connectedTo?: string[];
  privacyLevel?: LifeMapPrivacyLevel;
  narratorHint?: string;
  tags?: string[];
};

export type LifeMapEraType =
  | "all"
  | "season"
  | "relationship"
  | "recovery"
  | "work"
  | "family"
  | "threshold"
  | "custom"
  | "system_generated";

export type LifeMapEra = {
  id: string;
  userId: string;
  title: string;
  subtitle?: string;
  startLabel: string;
  endLabel?: string;
  type: LifeMapEraType;
  summary: string;
  dominantAura: string;
  nodeIds: string[];
};

export type LifeMapTimeScope = "all" | "year" | "season" | "month" | "week" | "era";

export type MirrorOfBecoming = {
  id: string;
  userId: string;
  generatedLabel: string;
  dominantArchetypes: string[];
  recurringPatterns: string[];
  recoverySignals: string[];
  relationshipThemes: string[];
  creativeSignals: string[];
  thresholdMoments: string[];
  summary: string;
  becomingStatement: string;
  sourceNodeIds: string[];
  sourceEraIds: string[];
  confidence: number;
};

export type LifeMapNarrationTone =
  | "gentle"
  | "reflective"
  | "grounding"
  | "celebratory"
  | "protective"
  | "mythic";

export type LifeMapNarrationEvent =
  | "enter_lifemap"
  | "focus_node"
  | "start_replay"
  | "complete_replay"
  | "select_era"
  | "zoom_out_mirror"
  | "return_home";

export type LifeMapNarration = {
  id: string;
  event: LifeMapNarrationEvent;
  nodeId?: string;
  eraId?: string;
  text: string;
  tone: LifeMapNarrationTone;
  ttsEnabled: boolean;
};

export const lifeMapTypeLabels: Record<LifeMapNodeType, string> = {
  memory: "Memory",
  season: "Season",
  ritual: "Ritual",
  forecast: "Forecast",
  threshold: "Threshold",
  relationship: "Relationship",
  recovery: "Recovery",
  legacy: "Legacy",
};

export const lifeMapTimeScopeLabels: Record<LifeMapTimeScope, string> = {
  all: "All Time",
  year: "Year",
  season: "Season",
  month: "Month",
  week: "Week",
  era: "Era",
};

export const lifeMapAuraByType: Record<LifeMapNodeType, string> = {
  memory: "#8adfff",
  season: "#73e4ff",
  ritual: "#a980ff",
  forecast: "#b68cff",
  threshold: "#ff7bd6",
  relationship: "#d5eaff",
  recovery: "#7ddcff",
  legacy: "#d1f5ff",
};

export const lifeMapNodes: LifeMapNode[] = [
  {
    id: "memory-thread",
    title: "Memory Thread",
    subtitle: "A bright thread of remembered becoming",
    type: "memory",
    position: [-4.2, 1.4, 0.2],
    intensity: 0.86,
    aura: "#8adfff",
    dateLabel: "Now",
    replayAvailable: true,
    summary:
      "A central memory current where recent signals, emotional tone, and symbolic events begin to braid into a visible personal constellation.",
    connectedTo: ["seasonal-arc", "ritual-marker", "recovery-bloom"],
    occurredAt: "2026-05-09T12:00:00.000Z",
    sourceType: "manual_seed",
    eraId: "spring-becoming",
    narratorHint: "This moment stayed with you longer than the day itself.",
    privacyLevel: "private",
  },
  {
    id: "seasonal-arc",
    title: "Seasonal Arc",
    subtitle: "The larger weather pattern around the self",
    type: "season",
    position: [-1.1, 2.0, -1.8],
    intensity: 0.78,
    aura: "#73e4ff",
    dateLabel: "Spring Cycle",
    replayAvailable: true,
    summary:
      "A seasonal sweep of changes in energy, rhythm, reflection, and inner climate, shown as a high orbital node in the Life Map.",
    connectedTo: ["forecast-path", "threshold-moment", "legacy-thread"],
    occurredAt: "2026-04-01T12:00:00.000Z",
    sourceType: "system_generated",
    eraId: "spring-becoming",
    narratorHint: "The season is showing a larger weather pattern, not a fixed identity.",
    privacyLevel: "private",
  },
  {
    id: "ritual-marker",
    title: "Ritual Marker",
    subtitle: "A chosen point of restoration",
    type: "ritual",
    position: [-2.8, -0.35, 1.45],
    intensity: 0.62,
    aura: "#a980ff",
    dateLabel: "Weekly Ritual",
    replayAvailable: false,
    summary:
      "A small ritual anchor created by the system to help convert a hard signal into a calmer symbolic return path.",
    connectedTo: ["threshold-moment", "recovery-bloom"],
    occurredAt: "2026-04-19T12:00:00.000Z",
    sourceType: "ritual",
    eraId: "spring-becoming",
    narratorHint: "This was a small return path, not a demand to fix everything.",
    privacyLevel: "private",
  },
  {
    id: "forecast-path",
    title: "Forecast Path",
    subtitle: "The next emotional weather line",
    type: "forecast",
    position: [3.9, 2.55, 1.05],
    intensity: 0.56,
    aura: "#b68cff",
    dateLabel: "Ahead",
    replayAvailable: false,
    locked: true,
    summary:
      "A forward-looking path that becomes clearer as URAI receives enough rhythm, context, and recovery evidence to render safely.",
    connectedTo: ["relationship-echo", "legacy-thread"],
    occurredAt: "2026-05-15T12:00:00.000Z",
    sourceType: "forecast",
    eraId: "forward-weather",
    narratorHint: "This path is not fixed. It is only beginning to glow.",
    privacyLevel: "hidden",
  },
  {
    id: "threshold-moment",
    title: "Threshold Moment",
    subtitle: "A passage where the old state released",
    type: "threshold",
    position: [1.45, 0.55, -0.35],
    intensity: 0.92,
    aura: "#ff7bd6",
    dateLabel: "Turning Point",
    replayAvailable: true,
    summary:
      "A high-intensity turning point where emotional pressure, decision, and identity shift converge into a single cinematic Life Map star.",
    connectedTo: ["relationship-echo", "recovery-bloom"],
    occurredAt: "2026-03-24T12:00:00.000Z",
    sourceType: "system_generated",
    eraId: "threshold-return",
    narratorHint: "This was a crossing. Not an ending.",
    privacyLevel: "private",
  },
  {
    id: "recovery-bloom",
    title: "Recovery Bloom",
    subtitle: "Evidence of nervous-system return",
    type: "recovery",
    position: [-1.95, -1.6, 0.85],
    intensity: 0.74,
    aura: "#7ddcff",
    dateLabel: "Afterward",
    replayAvailable: true,
    summary:
      "A soft recovery node showing rebound, stabilization, and a new pathway that appeared after a difficult emotional cluster.",
    connectedTo: ["relationship-echo", "legacy-thread"],
    occurredAt: "2026-03-30T12:00:00.000Z",
    sourceType: "recovery",
    eraId: "threshold-return",
    narratorHint: "Here, something in you began returning.",
    privacyLevel: "private",
  },
  {
    id: "relationship-echo",
    title: "Relationship Echo",
    subtitle: "A social signal with emotional gravity",
    type: "relationship",
    position: [4.6, -0.7, -1.35],
    intensity: 0.68,
    aura: "#d5eaff",
    dateLabel: "Social Orbit",
    replayAvailable: true,
    summary:
      "A relationship echo that carries tone, distance, repair, and resonance into the spatial memory field without exposing raw private content.",
    connectedTo: ["legacy-thread"],
    occurredAt: "2026-02-20T12:00:00.000Z",
    sourceType: "relationship",
    eraId: "relationship-orbit",
    narratorHint: "This connection seemed to shift your emotional weather.",
    privacyLevel: "private",
  },
  {
    id: "legacy-thread",
    title: "Legacy Thread",
    subtitle: "Deep-time continuity of the story",
    type: "legacy",
    position: [2.25, -2.1, -3.2],
    intensity: 0.5,
    aura: "#d1f5ff",
    dateLabel: "Deep Time",
    replayAvailable: false,
    summary:
      "A distant legacy star holding the deeper pattern of what keeps repeating, evolving, and becoming meaningful across longer life arcs.",
    connectedTo: [],
    occurredAt: "2025-12-21T12:00:00.000Z",
    sourceType: "legacy",
    eraId: "legacy-deep-time",
    narratorHint: "This thread reaches farther back than memory.",
    privacyLevel: "private",
  },
];

export const lifeMapEras: LifeMapEra[] = [
  {
    id: "spring-becoming",
    userId: "demo-user",
    title: "Spring Becoming",
    subtitle: "The recent arc where memory, ritual, and season braided together.",
    startLabel: "Spring 2026",
    type: "season",
    summary: "A bright rebuilding season where recent memory and ritual signals begin forming a larger personal weather pattern.",
    dominantAura: "#8adfff",
    nodeIds: ["memory-thread", "seasonal-arc", "ritual-marker"],
  },
  {
    id: "threshold-return",
    userId: "demo-user",
    title: "Threshold Return",
    subtitle: "A difficult crossing followed by recovery evidence.",
    startLabel: "Late March",
    type: "threshold",
    summary: "The emotional field tightens, crosses a threshold, and then begins showing recovery bloom evidence.",
    dominantAura: "#ff7bd6",
    nodeIds: ["threshold-moment", "recovery-bloom"],
  },
  {
    id: "relationship-orbit",
    userId: "demo-user",
    title: "Relationship Orbit",
    subtitle: "A social signal with gravity around the wider Life Map.",
    startLabel: "Social Cycle",
    type: "relationship",
    summary: "A relationship echo becomes visible as a gravitational influence without exposing private raw content.",
    dominantAura: "#d5eaff",
    nodeIds: ["relationship-echo"],
  },
  {
    id: "legacy-deep-time",
    userId: "demo-user",
    title: "Legacy Deep Time",
    subtitle: "The farther-back pattern beneath the present constellation.",
    startLabel: "Deep Time",
    type: "system_generated",
    summary: "Deep continuity across older arcs, long-term meaning, and the larger Mirror of Becoming.",
    dominantAura: "#d1f5ff",
    nodeIds: ["legacy-thread"],
  },
  {
    id: "forward-weather",
    userId: "demo-user",
    title: "Forward Weather",
    subtitle: "The safe preview of what may be emerging next.",
    startLabel: "Ahead",
    type: "system_generated",
    summary: "A future-facing forecast path that remains locked until enough evidence exists to render it safely.",
    dominantAura: "#b68cff",
    nodeIds: ["forecast-path"],
  },
];

export const demoMirrorOfBecoming: MirrorOfBecoming = {
  id: "mirror-demo",
  userId: "demo-user",
  generatedLabel: "Current Arc",
  dominantArchetypes: ["The Builder Returning", "The Weather Reader", "The Quiet Phoenix"],
  recurringPatterns: [
    "Pressure compresses into structure instead of disappearing.",
    "Recovery appears as small repeatable rituals before it becomes confidence.",
    "Relationship signals shape the field, but do not define the whole map.",
  ],
  recoverySignals: ["Recovery Bloom", "Ritual Marker", "Seasonal Arc"],
  relationshipThemes: ["Distance, resonance, and repair are tracked as weather, not verdicts."],
  creativeSignals: ["The Life Map itself is becoming a spatial language for inner data."],
  thresholdMoments: ["Threshold Moment"],
  summary:
    "The current map suggests a person turning emotional pressure into navigable structure. The story is not about being fixed; it is about learning where the signal moves next.",
  becomingStatement: "You are becoming someone who turns pressure into structure without losing the softness that helped you notice it.",
  sourceNodeIds: lifeMapNodes.map((node) => node.id),
  sourceEraIds: lifeMapEras.map((era) => era.id),
  confidence: 0.74,
};

export const lifeMapFilters = Object.keys(lifeMapTypeLabels) as LifeMapNodeType[];

export function isLifeMapNodeType(value: unknown): value is LifeMapNodeType {
  return typeof value === "string" && value in lifeMapTypeLabels;
}

export function clampLifeMapIntensity(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

export function stableLifeMapPosition(id: string, type: LifeMapNodeType, intensity: number): [number, number, number] {
  const seed = Array.from(id).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 17), 0);
  const radiusByType: Record<LifeMapNodeType, number> = {
    memory: 3.2,
    season: 4.0,
    ritual: 2.6,
    forecast: 4.8,
    threshold: 2.9,
    relationship: 4.2,
    recovery: 3.0,
    legacy: 5.3,
  };
  const angle = (seed % 628) / 100;
  const radius = radiusByType[type] + intensity * 0.7;
  const zBias = type === "legacy" ? -3.4 : type === "forecast" ? 1.8 : type === "relationship" ? -1.1 : -0.4;
  const yBias = type === "forecast" || type === "season" ? 1.4 : type === "recovery" ? -1.2 : 0;

  return [
    Number((Math.cos(angle) * radius).toFixed(2)),
    Number((Math.sin(angle * 0.7) * 1.6 + yBias).toFixed(2)),
    Number((Math.sin(angle) * 1.9 + zBias).toFixed(2)),
  ];
}

export function mapLifeMapEventToNode(event: LifeMapEvent): LifeMapNode {
  const type = isLifeMapNodeType(event.type) ? event.type : "memory";
  const intensity = clampLifeMapIntensity(event.intensity);
  const occurredAt = stringifyLifeMapDate(event.occurredAt);

  return {
    id: event.id,
    title: event.title || lifeMapTypeLabels[type],
    subtitle: event.subtitle || `${lifeMapTypeLabels[type]} signal`,
    type,
    position: event.position ?? stableLifeMapPosition(event.id, type, intensity),
    intensity,
    aura: event.aura || lifeMapAuraByType[type],
    dateLabel: formatLifeMapDateLabel(occurredAt) || lifeMapTypeLabels[type],
    replayAvailable: Boolean(event.replayAvailable),
    locked: event.locked,
    summary: event.summary || "A private URAI Life Map signal ready for spatial rendering.",
    connectedTo: Array.isArray(event.connectedTo) ? event.connectedTo : [],
    occurredAt,
    sourceType: event.sourceType,
    clusterId: event.clusterId,
    eraId: event.eraId,
    narratorHint: event.narratorHint,
    privacyLevel: event.privacyLevel ?? "private",
    tags: event.tags,
  };
}

export function stringifyLifeMapDate(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    try {
      const date = value.toDate();
      if (date instanceof Date) return date.toISOString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function formatLifeMapDateLabel(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function narrationForNode(node: LifeMapNode): LifeMapNarration {
  const fallbackByType: Record<LifeMapNodeType, string> = {
    memory: "This moment stayed with you longer than the day itself.",
    season: "The season is showing a larger weather pattern, not a fixed identity.",
    ritual: "This was a small return path, not a demand to fix everything.",
    forecast: "This path is not fixed. It is only beginning to glow.",
    threshold: "This was a crossing. Not an ending.",
    relationship: "This connection seemed to shift your emotional weather.",
    recovery: "Here, something in you began returning.",
    legacy: "This thread reaches farther back than memory.",
  };

  return {
    id: `narration-${node.id}`,
    event: "focus_node",
    nodeId: node.id,
    text: node.narratorHint || fallbackByType[node.type],
    tone: node.type === "threshold" ? "protective" : node.type === "legacy" ? "mythic" : "reflective",
    ttsEnabled: true,
  };
}

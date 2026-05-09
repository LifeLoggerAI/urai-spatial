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
  },
];

export const lifeMapFilters = Object.keys(lifeMapTypeLabels) as LifeMapNodeType[];

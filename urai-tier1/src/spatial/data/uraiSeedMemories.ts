export type UraiMemoryTone =
  | "calm"
  | "awe"
  | "grief"
  | "tension"
  | "hope"
  | "recovery"
  | "threshold";

export type UraiSeedMemoryKind =
  | "ordinary"
  | "milestone"
  | "wound"
  | "recovery"
  | "relationship"
  | "dream"
  | "threshold";

export type UraiSymbolicWeight =
  | "light"
  | "medium"
  | "heavy"
  | "threshold";

export type UraiSeedMemory = {
  id: string;
  title: string;
  subtitle: string;
  kind: UraiSeedMemoryKind;
  tone: UraiMemoryTone;
  symbolicWeight: UraiSymbolicWeight;
  position: [number, number, number];
  scale: number;
  auraColor: string;
  auraIntensity: number;
  focusPresence: number;
  replayDensity: number;
  focusAsset: string;
  replayAsset: string;
  chamberAsset: string;
  narratorSeed: string;
};

export const URAI_SEED_MEMORIES: UraiSeedMemory[] = [
  {
    id: "seed-first-light",
    title: "First Light",
    subtitle: "A quiet beginning point",
    kind: "ordinary",
    tone: "calm",
    symbolicWeight: "light",
    position: [-5.2, 1.4, -10.5],
    scale: 0.72,
    auraColor: "#8fd7ff",
    auraIntensity: 0.42,
    focusPresence: 0.38,
    replayDensity: 0.28,
    focusAsset: "/assets/urai/memories/focus-first-light.png",
    replayAsset: "/assets/urai/memories/replay-first-light.png",
    chamberAsset: "/assets/urai/chambers/chamber-calm.png",
    narratorSeed: "This was not loud. It simply stayed."
  },
  {
    id: "seed-threshold-door",
    title: "Threshold Door",
    subtitle: "A moment before everything changed",
    kind: "threshold",
    tone: "threshold",
    symbolicWeight: "threshold",
    position: [0.2, 2.7, -14.2],
    scale: 1.38,
    auraColor: "#b16cff",
    auraIntensity: 0.95,
    focusPresence: 0.92,
    replayDensity: 0.88,
    focusAsset: "/assets/urai/memories/focus-threshold-door.png",
    replayAsset: "/assets/urai/memories/replay-threshold-door.png",
    chamberAsset: "/assets/urai/chambers/chamber-threshold.png",
    narratorSeed: "This is where the old pattern stopped being invisible."
  },
  {
    id: "seed-heavy-room",
    title: "Heavy Room",
    subtitle: "Dense memory pressure",
    kind: "wound",
    tone: "grief",
    symbolicWeight: "heavy",
    position: [4.8, -0.8, -12.8],
    scale: 1.16,
    auraColor: "#6f7cff",
    auraIntensity: 0.82,
    focusPresence: 0.78,
    replayDensity: 0.94,
    focusAsset: "/assets/urai/memories/focus-heavy-room.png",
    replayAsset: "/assets/urai/memories/replay-heavy-room.png",
    chamberAsset: "/assets/urai/chambers/chamber-grief.png",
    narratorSeed: "The room kept its shape long after the moment passed."
  },
  {
    id: "seed-recovery-bloom",
    title: "Recovery Bloom",
    subtitle: "A rebound after collapse",
    kind: "recovery",
    tone: "recovery",
    symbolicWeight: "medium",
    position: [-2.6, -2.0, -16.4],
    scale: 1.0,
    auraColor: "#77ffc8",
    auraIntensity: 0.76,
    focusPresence: 0.71,
    replayDensity: 0.52,
    focusAsset: "/assets/urai/memories/focus-recovery-bloom.png",
    replayAsset: "/assets/urai/memories/replay-recovery-bloom.png",
    chamberAsset: "/assets/urai/chambers/chamber-recovery.png",
    narratorSeed: "You did not return unchanged. You returned with evidence."
  },
  {
    id: "seed-relationship-echo",
    title: "Relationship Echo",
    subtitle: "A connection still orbiting",
    kind: "relationship",
    tone: "tension",
    symbolicWeight: "medium",
    position: [6.2, 1.8, -18.2],
    scale: 0.96,
    auraColor: "#ff8fb7",
    auraIntensity: 0.68,
    focusPresence: 0.64,
    replayDensity: 0.7,
    focusAsset: "/assets/urai/memories/focus-relationship-echo.png",
    replayAsset: "/assets/urai/memories/replay-relationship-echo.png",
    chamberAsset: "/assets/urai/chambers/chamber-tension.png",
    narratorSeed: "Some voices leave gravity behind."
  },
  {
    id: "seed-dream-water",
    title: "Dream Water",
    subtitle: "Symbolic, unstable, half-remembered",
    kind: "dream",
    tone: "awe",
    symbolicWeight: "light",
    position: [-7.4, 3.2, -20.0],
    scale: 0.84,
    auraColor: "#7aa8ff",
    auraIntensity: 0.55,
    focusPresence: 0.5,
    replayDensity: 0.46,
    focusAsset: "/assets/urai/memories/focus-dream-water.png",
    replayAsset: "/assets/urai/memories/replay-dream-water.png",
    chamberAsset: "/assets/urai/chambers/chamber-dream.png",
    narratorSeed: "This one never became language. It became weather."
  }
];

export const URAI_SEED_MEMORY_ASSETS = URAI_SEED_MEMORIES.flatMap((memory) => [
  memory.focusAsset,
  memory.replayAsset,
  memory.chamberAsset
]);

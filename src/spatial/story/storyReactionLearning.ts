export type StoryReaction = "skip" | "neutral" | "resonated" | "calming" | "too_much";

export type StoryReactionSample = {
  id: string;
  storyId: string;
  reaction: StoryReaction;
  beatIndex?: number;
  intensityBefore?: number;
  intensityAfter?: number;
  timestamp: string;
};

export type StoryLearningProfile = {
  version: 1;
  totalReactions: number;
  resonanceScore: number;
  calmScore: number;
  overloadScore: number;
  preferredTone: "gentle" | "direct" | "quiet" | "energizing";
  updatedAt: string;
};

const SAMPLE_KEY = "urai.spatial.storyReactions.v1";
const PROFILE_KEY = "urai.spatial.storyLearningProfile.v1";
const MAX_SAMPLES = 300;

const DEFAULT_PROFILE: StoryLearningProfile = {
  version: 1,
  totalReactions: 0,
  resonanceScore: 0.5,
  calmScore: 0.5,
  overloadScore: 0.12,
  preferredTone: "gentle",
  updatedAt: "",
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function safeReadSamples(): StoryReactionSample[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAMPLE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteSamples(samples: StoryReactionSample[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAMPLE_KEY, JSON.stringify(samples.slice(-MAX_SAMPLES)));
  } catch {
    // Learning capture is optional and must never break the experience.
  }
}

function readProfile(): StoryLearningProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw), version: 1 };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function writeProfile(profile: StoryLearningProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Optional persistence only.
  }
}

function idForNow() {
  return `story_reaction_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function preferredToneFor(profile: StoryLearningProfile): StoryLearningProfile["preferredTone"] {
  if (profile.overloadScore > 0.32) return "quiet";
  if (profile.calmScore > 0.68) return "gentle";
  if (profile.resonanceScore > 0.72) return "direct";
  return "gentle";
}

function evolveProfile(previous: StoryLearningProfile, reaction: StoryReaction): StoryLearningProfile {
  const resonanceDelta = reaction === "resonated" ? 0.08 : reaction === "skip" || reaction === "too_much" ? -0.06 : 0;
  const calmDelta = reaction === "calming" ? 0.08 : reaction === "too_much" ? -0.08 : 0;
  const overloadDelta = reaction === "too_much" ? 0.1 : reaction === "calming" ? -0.04 : -0.01;

  const next: StoryLearningProfile = {
    version: 1,
    totalReactions: previous.totalReactions + 1,
    resonanceScore: clamp01(previous.resonanceScore * 0.9 + (previous.resonanceScore + resonanceDelta) * 0.1),
    calmScore: clamp01(previous.calmScore * 0.9 + (previous.calmScore + calmDelta) * 0.1),
    overloadScore: clamp01(previous.overloadScore * 0.88 + (previous.overloadScore + overloadDelta) * 0.12),
    preferredTone: previous.preferredTone,
    updatedAt: new Date().toISOString(),
  };

  next.preferredTone = preferredToneFor(next);
  return next;
}

export function recordStoryReaction(args: {
  storyId: string;
  reaction: StoryReaction;
  beatIndex?: number;
  intensityBefore?: number;
  intensityAfter?: number;
}) {
  const sample: StoryReactionSample = {
    id: idForNow(),
    storyId: args.storyId,
    reaction: args.reaction,
    beatIndex: args.beatIndex,
    intensityBefore: args.intensityBefore,
    intensityAfter: args.intensityAfter,
    timestamp: new Date().toISOString(),
  };

  safeWriteSamples([...safeReadSamples(), sample]);
  const profile = evolveProfile(readProfile(), args.reaction);
  writeProfile(profile);

  return { sample, profile };
}

export function getStoryLearningProfile() {
  return readProfile();
}

export function exportStoryReactionLearning() {
  return JSON.stringify(
    {
      schema: "urai.spatial.storyReactionLearning.v1",
      exportedAt: new Date().toISOString(),
      profile: readProfile(),
      samples: safeReadSamples(),
    },
    null,
    2
  );
}

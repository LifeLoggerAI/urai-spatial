import type { StorySequence, StorySequenceId } from "./storySequences";
import { getStorySequence } from "./storySequences";
import { adaptStorySequence } from "./adaptiveStory";

type GenerativeNarrativeContext = {
  storyId: StorySequenceId;
  companion?: {
    bondLevel?: string;
    greeting?: string;
    warmth?: number;
    trust?: number;
  };
  prediction?: {
    currentNeed?: string;
    nextLikelyState?: string;
    message?: string;
  };
  personality?: {
    dominantMode?: string;
    emotionalStabilityIndex?: number;
    recoverySpeed?: number;
  };
};

export type NarrativeGenerationRequest = {
  schema: "urai.spatial.generativeNarrative.v1";
  system: string;
  user: string;
  constraints: {
    preserveTiming: true;
    maxLineLength: number;
    safeTone: true;
    noMedicalAdvice: true;
    noDiagnosis: true;
  };
};

export type GeneratedNarrativeResult = {
  sequence: StorySequence;
  mode: "fallback" | "external-ready";
  request: NarrativeGenerationRequest;
};

export function buildNarrativeGenerationRequest(context: GenerativeNarrativeContext): NarrativeGenerationRequest {
  const base = getStorySequence(context.storyId);

  return {
    schema: "urai.spatial.generativeNarrative.v1",
    system:
      "You write brief, cinematic, emotionally safe URAI spatial story narration. Preserve sequence timing and beat count. Do not diagnose, prescribe, or claim certainty about the user's mental state.",
    user: JSON.stringify(
      {
        baseSequence: base,
        userContext: context,
        instruction:
          "Rewrite only the narrator text for each beat. Keep cameraPath, pattern, environmentCue, atMs, durationMs, and story id stable.",
      },
      null,
      2
    ),
    constraints: {
      preserveTiming: true,
      maxLineLength: 160,
      safeTone: true,
      noMedicalAdvice: true,
      noDiagnosis: true,
    },
  };
}

function fallbackLine(index: number, context: GenerativeNarrativeContext) {
  const need = context.prediction?.currentNeed;
  const bond = context.companion?.bondLevel;
  const mode = context.personality?.dominantMode;

  if (index === 0 && bond === "trusted") return "I know this terrain with you now. We will move through it gently.";
  if (need === "reassurance") return "We will lower the signal and keep the scene soft enough to cross.";
  if (need === "focus") return "One thread is enough. The environment will narrow around it.";
  if (mode === "recovering") return "This is a recovery path. The story will not rush you.";
  if (mode === "momentum") return "There is motion here. We will brighten it without pushing.";
  return "The scene is adjusting to what the signal can hold.";
}

export function generateNarrativeFallback(context: GenerativeNarrativeContext): StorySequence {
  const base = getStorySequence(context.storyId);
  const adapted = adaptStorySequence(base, context);

  return {
    ...adapted,
    title: `${base.title} · Generated Fallback`,
    beats: adapted.beats.map((beat, index) => ({
      ...beat,
      narrator: beat.narrator ? `${beat.narrator} ${fallbackLine(index, context)}` : fallbackLine(index, context),
    })),
  };
}

export function createGenerativeNarrative(context: GenerativeNarrativeContext): GeneratedNarrativeResult {
  const request = buildNarrativeGenerationRequest(context);
  const sequence = generateNarrativeFallback(context);

  return {
    sequence,
    mode: "external-ready",
    request,
  };
}

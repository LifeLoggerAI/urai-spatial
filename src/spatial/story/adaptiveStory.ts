import type { StoryBeat, StorySequence } from "./storySequences";

type AdaptiveContext = {
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

function tonePrefix(context: AdaptiveContext) {
  const need = context.prediction?.currentNeed;
  const bond = context.companion?.bondLevel;

  if (need === "reassurance") return "I will keep this gentle.";
  if (need === "focus") return "We will narrow this to one clear thread.";
  if (need === "rest") return "We will move softly.";
  if (bond === "trusted") return "I know this terrain with you.";
  if (bond === "attuned") return "I can feel the pattern forming.";
  return "I am here with you.";
}

function personalizeNarratorLine(line: string | undefined, context: AdaptiveContext, beatIndex: number) {
  if (!line) return line;

  const prefix = tonePrefix(context);
  const dominantMode = context.personality?.dominantMode;
  const nextState = context.prediction?.nextLikelyState;

  if (beatIndex === 0) {
    return `${prefix} ${line}`;
  }

  if (nextState === "overloaded") {
    return `${line} We will slow the signal before it becomes too loud.`;
  }

  if (dominantMode === "recovering") {
    return `${line} This recovery pattern matters.`;
  }

  if (dominantMode === "momentum") {
    return `${line} There is momentum here, but we will not force it.`;
  }

  return line;
}

function adaptBeat(beat: StoryBeat, context: AdaptiveContext, index: number): StoryBeat {
  return {
    ...beat,
    narrator: personalizeNarratorLine(beat.narrator, context, index),
  };
}

export function adaptStorySequence(sequence: StorySequence, context: AdaptiveContext): StorySequence {
  return {
    ...sequence,
    title: `${sequence.title} · Adaptive`,
    beats: sequence.beats.map((beat, index) => adaptBeat(beat, context, index)),
  };
}

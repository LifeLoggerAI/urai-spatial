import type { CameraPathKind } from "../animation/cameraPaths";
import type { CinematicPatternKind } from "../animation/cinematicPatterns";

export type StorySequenceId = "awakening" | "skyToTimeline" | "thresholdReview";

export type StoryBeat = {
  atMs: number;
  narrator?: string;
  cameraPath?: CameraPathKind;
  pattern?: CinematicPatternKind;
  environmentCue?: string;
};

export type StorySequence = {
  id: StorySequenceId;
  title: string;
  durationMs: number;
  beats: StoryBeat[];
};

export const STORY_SEQUENCES: Record<StorySequenceId, StorySequence> = {
  awakening: {
    id: "awakening",
    title: "Awakening the Living Environment",
    durationMs: 8200,
    beats: [
      { atMs: 0, narrator: "The environment is waking with you.", pattern: "bloom", environmentCue: "story-awaken" },
      { atMs: 2400, narrator: "The ground remembers rhythm. The sky holds the map.", pattern: "ripple" },
      { atMs: 5200, narrator: "When you are ready, the horizon can open.", pattern: "threshold" },
    ],
  },
  skyToTimeline: {
    id: "skyToTimeline",
    title: "Sky to Life Map",
    durationMs: 6200,
    beats: [
      { atMs: 0, narrator: "Look up. The sky is becoming a map.", cameraPath: "skyToTimeline", pattern: "threshold", environmentCue: "story-sky-to-timeline" },
      { atMs: 2600, narrator: "Each point is not a marker. It is a remembered state.", pattern: "focus" },
      { atMs: 5000, narrator: "You are entering the living timeline.", pattern: "bloom" },
    ],
  },
  thresholdReview: {
    id: "thresholdReview",
    title: "Threshold Review",
    durationMs: 7200,
    beats: [
      { atMs: 0, narrator: "A threshold is opening. We will move slowly.", cameraPath: "thresholdDive", pattern: "threshold", environmentCue: "story-threshold" },
      { atMs: 3000, narrator: "Notice what changed before you named it.", pattern: "ripple" },
      { atMs: 5600, narrator: "The system will hold the signal while you cross.", pattern: "bloom" },
    ],
  },
};

export function getStorySequence(id: StorySequenceId): StorySequence {
  return STORY_SEQUENCES[id];
}

"use client";

import { useEffect, useRef, useState } from "react";
import { type StorySequence, type StorySequenceId } from "./storySequences";
import { createGenerativeNarrative } from "./generativeNarrative";
import { requestGeneratedNarrative } from "./generativeNarrativeClient";
import { getStoryLearningProfile } from "./storyReactionLearning";

type StoryEventDetail = {
  storyId?: StorySequenceId;
};

type UraiRuntimeContext = {
  companion?: unknown;
  prediction?: unknown;
  personality?: unknown;
};

function readRuntimeContext(): UraiRuntimeContext {
  if (typeof window === "undefined") return {};
  return ((window as Window & { __URAI_CONTEXT__?: UraiRuntimeContext }).__URAI_CONTEXT__ ?? {}) as UraiRuntimeContext;
}

export default function StoryPlayer() {
  const [activeStory, setActiveStory] = useState<StorySequence | null>(null);
  const startTime = useRef(0);
  const triggeredBeats = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<StoryEventDetail>).detail;
      if (!detail?.storyId) return;

      void (async () => {
        const runtimeContext = readRuntimeContext();
        const learning = getStoryLearningProfile();

        const base = createGenerativeNarrative({
          storyId: detail.storyId,
          ...runtimeContext,
          learning,
        });

        const result = await requestGeneratedNarrative(base);
        const sequence = result.sequence;
        if (!sequence) return;

        startTime.current = performance.now();
        triggeredBeats.current.clear();
        setActiveStory(sequence);

        window.dispatchEvent(
          new CustomEvent("urai:story-state", {
            detail: {
              status: "started",
              storyId: sequence.id,
              title: sequence.title,
              generationMode: result.mode,
              learning,
            },
          })
        );
      })();
    };

    window.addEventListener("urai:story", handler);
    return () => window.removeEventListener("urai:story", handler);
  }, []);

  useEffect(() => {
    if (!activeStory || typeof window === "undefined") return;

    const interval = window.setInterval(() => {
      const elapsed = performance.now() - startTime.current;

      activeStory.beats.forEach((beat, index) => {
        if (elapsed < beat.atMs || triggeredBeats.current.has(index)) return;
        triggeredBeats.current.add(index);

        if (beat.narrator) {
          window.dispatchEvent(
            new CustomEvent("urai:narrator", {
              detail: {
                cue: beat.narrator,
                speech: {
                  text: beat.narrator,
                  tone: "calm",
                  shouldRequestVoice: true,
                  reason: `story:${activeStory.id}:${index}`,
                },
                story: { id: activeStory.id, beat: index },
              },
            })
          );
        }

        if (beat.cameraPath) {
          window.dispatchEvent(
            new CustomEvent("urai:camera", {
              detail: { cameraPath: beat.cameraPath, storyId: activeStory.id, beat: index },
            })
          );
        }

        if (beat.pattern || beat.environmentCue) {
          window.dispatchEvent(
            new CustomEvent("urai:environment", {
              detail: {
                cue: beat.environmentCue,
                story: { id: activeStory.id, beat: index },
                cinematicPatternKind: beat.pattern,
              },
            })
          );
        }
      });

      if (elapsed > activeStory.durationMs) {
        window.clearInterval(interval);
        window.dispatchEvent(
          new CustomEvent("urai:story-state", {
            detail: { status: "ended", storyId: activeStory.id, title: activeStory.title },
          })
        );
        setActiveStory(null);
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [activeStory]);

  return null;
}

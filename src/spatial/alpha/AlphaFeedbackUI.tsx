"use client";

import { useState } from "react";
import { captureAlphaMetric } from "./alphaMetrics";
import { recordStoryReaction } from "../story/storyReactionLearning";

type Props = {
  storyId?: string;
  intensityBefore?: number;
  intensityAfter?: number;
};

export default function AlphaFeedbackUI({ storyId, intensityBefore, intensityAfter }: Props) {
  const [submitted, setSubmitted] = useState(false);

  function handleReaction(reaction: "calming" | "resonated" | "too_much" | "neutral") {
    if (!storyId) return;

    recordStoryReaction({
      storyId,
      reaction,
      intensityBefore,
      intensityAfter,
    });

    captureAlphaMetric({
      name:
        reaction === "calming"
          ? "reaction_calming"
          : reaction === "resonated"
            ? "reaction_resonated"
            : reaction === "too_much"
              ? "reaction_too_much"
              : "reaction_neutral",
      storyId,
    });

    if (typeof intensityBefore === "number" && typeof intensityAfter === "number") {
      captureAlphaMetric({
        name: "regulation_delta",
        storyId,
        value: intensityAfter - intensityBefore,
      });
    }

    setSubmitted(true);
  }

  function handleScore(type: "felt_understanding_score" | "trust_score", value: number) {
    if (!storyId) return;

    captureAlphaMetric({
      name: type,
      storyId,
      value,
    });
  }

  if (submitted) {
    return <div className="text-xs opacity-60">Thanks - this helps URAI adapt.</div>;
  }

  return (
    <div className="p-2 rounded-xl bg-black/40 text-white text-xs space-y-2">
      <div>How did that feel?</div>
      <div className="flex gap-2">
        <button onClick={() => handleReaction("calming")}>Calm</button>
        <button onClick={() => handleReaction("resonated")}>Resonated</button>
        <button onClick={() => handleReaction("too_much")}>Too much</button>
        <button onClick={() => handleReaction("neutral")}>Neutral</button>
      </div>

      <div className="pt-1">Did it understand you?</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} onClick={() => handleScore("felt_understanding_score", value)}>
            {value}
          </button>
        ))}
      </div>

      <div>Trust level?</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} onClick={() => handleScore("trust_score", value)}>
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

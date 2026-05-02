import type { InsightType } from "./types";

export function generateInsightSentence(
  type: InsightType,
  data: Record<string, string | number | undefined>,
  confidence: number
): string {
  const soft = confidence < 0.75;

  if (type === "post_call_energy_drop") {
    return soft
      ? `Your activity seemed to slow down after a recent call.`
      : `After your call, your activity dropped for ${data.durationMinutes ?? "several"} minutes.`;
  }

  if (type === "digital_agitation_spike") {
    return soft
      ? `Your phone activity increased more than usual around ${data.time ?? "this period"}.`
      : `You showed a spike in app switching and phone checks around ${data.time ?? "this period"}.`;
  }

  if (type === "focus_burst") {
    return soft
      ? `You had a steadier focus window than usual.`
      : `You entered a focus window from ${data.startLabel ?? "then"} to ${data.endLabel ?? "later"}.`;
  }

  if (type === "social_drain_pattern") {
    return soft
      ? `Your rhythm has shifted after similar interactions more than once recently.`
      : `Your state shifted downward after similar interactions ${data.count ?? "multiple"} times recently.`;
  }

  return soft
    ? `Your rhythm moved back toward normal after a lower-energy window.`
    : `You recovered after a low-state window; your rhythm normalized after ${data.durationMinutes ?? "some"} minutes.`;
}

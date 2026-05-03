import type { InsightFeedbackResponse, InsightType } from "./types";

export type FeedbackAdjustment = {
  insightId: string;
  response: InsightFeedbackResponse;
  detectorConfidenceDelta: number;
  softenFutureWording: boolean;
  suppressType?: InsightType;
};

export function applyFeedback(
  insightId: string,
  type: InsightType,
  response: InsightFeedbackResponse
): FeedbackAdjustment {
  if (response === "accurate") {
    return { insightId, response, detectorConfidenceDelta: 0.05, softenFutureWording: false };
  }

  if (response === "not_quite") {
    return { insightId, response, detectorConfidenceDelta: -0.03, softenFutureWording: true };
  }

  if (response === "hide_type") {
    return { insightId, response, detectorConfidenceDelta: -0.1, softenFutureWording: true, suppressType: type };
  }

  return { insightId, response, detectorConfidenceDelta: -0.08, softenFutureWording: true };
}

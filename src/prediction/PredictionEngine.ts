import type { EventBus, KernelEvent } from "../kernel/eventBus";
import type { ReplayFrame, ReplayTimeline } from "../memory/ReplayEngine";

export type PredictionCandidate = {
  id: string;
  predictedType: string;
  confidence: number;
  reason: string;
  basedOnEventType?: string;
  source?: string;
  payload?: Record<string, unknown>;
};

export type PredictionResult = {
  id: string;
  createdAt: number;
  timelineId: string;
  candidates: PredictionCandidate[];
  topCandidate?: PredictionCandidate;
};

export type PredictionOptions = {
  maxCandidates?: number;
  minConfidence?: number;
};

export class PredictionEngine {
  predict(timeline: ReplayTimeline, options: PredictionOptions = {}): PredictionResult {
    const maxCandidates = options.maxCandidates ?? 5;
    const minConfidence = options.minConfidence ?? 0.1;

    const transitionCounts = this.buildTransitionCounts(timeline.frames);
    const recentFrame = timeline.frames[timeline.frames.length - 1];
    const candidates = recentFrame
      ? this.predictFromRecentFrame(recentFrame, transitionCounts)
      : this.predictFromGlobalFrequency(timeline.frames);

    const filtered = candidates
      .filter((candidate) => candidate.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxCandidates);

    return {
      id: `prediction-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      timelineId: timeline.id,
      candidates: filtered,
      topCandidate: filtered[0]
    };
  }

  async emitPrediction(result: PredictionResult, bus: EventBus, source = "prediction-engine") {
    const event: KernelEvent = bus.createEvent(
      "prediction.generated",
      {
        predictionId: result.id,
        timelineId: result.timelineId,
        topCandidate: result.topCandidate,
        candidates: result.candidates
      },
      source
    );

    await bus.emit(event);
  }

  summarize(result: PredictionResult) {
    return {
      id: result.id,
      timelineId: result.timelineId,
      totalCandidates: result.candidates.length,
      topType: result.topCandidate?.predictedType,
      topConfidence: result.topCandidate?.confidence ?? 0
    };
  }

  private buildTransitionCounts(frames: ReplayFrame[]) {
    const transitions = new Map<string, Map<string, number>>();

    for (let i = 0; i < frames.length - 1; i += 1) {
      const currentType = frames[i].type;
      const nextType = frames[i + 1].type;

      if (!transitions.has(currentType)) {
        transitions.set(currentType, new Map());
      }

      const nextMap = transitions.get(currentType)!;
      nextMap.set(nextType, (nextMap.get(nextType) ?? 0) + 1);
    }

    return transitions;
  }

  private predictFromRecentFrame(
    frame: ReplayFrame,
    transitionCounts: Map<string, Map<string, number>>
  ): PredictionCandidate[] {
    const nextMap = transitionCounts.get(frame.type);

    if (!nextMap || nextMap.size === 0) {
      return [
        {
          id: `candidate-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          predictedType: "system.observe",
          confidence: 0.2,
          reason: "No known transition from latest event type; falling back to observation.",
          basedOnEventType: frame.type,
          source: frame.source,
          payload: {
            latestEventId: frame.eventId,
            latestEventType: frame.type
          }
        }
      ];
    }

    const total = Array.from(nextMap.values()).reduce((sum, count) => sum + count, 0);

    return Array.from(nextMap.entries()).map(([predictedType, count]) => ({
      id: `candidate-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      predictedType,
      confidence: total > 0 ? count / total : 0,
      reason: `Observed ${count} transition(s) from ${frame.type} to ${predictedType}.`,
      basedOnEventType: frame.type,
      source: frame.source,
      payload: {
        latestEventId: frame.eventId,
        latestEventType: frame.type,
        transitionCount: count,
        transitionTotal: total
      }
    }));
  }

  private predictFromGlobalFrequency(frames: ReplayFrame[]): PredictionCandidate[] {
    const counts = new Map<string, number>();

    for (const frame of frames) {
      counts.set(frame.type, (counts.get(frame.type) ?? 0) + 1);
    }

    const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);

    return Array.from(counts.entries()).map(([type, count]) => ({
      id: `candidate-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      predictedType: type,
      confidence: total > 0 ? count / total : 0,
      reason: `Predicted from global event frequency for ${type}.`,
      payload: {
        occurrenceCount: count,
        totalFrames: total
      }
    }));
  }
}

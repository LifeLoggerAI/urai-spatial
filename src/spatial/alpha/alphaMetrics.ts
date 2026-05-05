export type UraiExperienceEventName =
  | "story_started"
  | "story_completed"
  | "story_skipped"
  | "intervention_triggered"
  | "intervention_dismissed"
  | "reaction_calming"
  | "reaction_resonated"
  | "reaction_too_much"
  | "reaction_neutral"
  | "voice_enabled"
  | "voice_replayed"
  | "felt_understanding_score"
  | "trust_score"
  | "regulation_delta";

export type UraiExperienceEvent = {
  id: string;
  name: UraiExperienceEventName;
  timestamp: string;
  storyId?: string;
  interventionType?: string;
  value?: number | string | boolean;
  metadata?: Record<string, unknown>;
};

export type UraiAlphaMetricsSummary = {
  totalEvents: number;
  storyStarted: number;
  storyCompleted: number;
  storySkipped: number;
  completionRate: number;
  calmingRate: number;
  resonanceRate: number;
  tooMuchRate: number;
  voiceEnableRate: number;
  averageFeltUnderstanding: number | null;
  averageTrust: number | null;
  averageRegulationDelta: number | null;
};

const STORAGE_KEY = "urai.spatial.alphaMetrics.v1";
const MAX_EVENTS = 1000;

function idForNow() {
  return `alpha_metric_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readEvents(): UraiExperienceEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: UraiExperienceEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // Metrics are best-effort and must never break the app.
  }
}

export function captureAlphaMetric(event: Omit<UraiExperienceEvent, "id" | "timestamp">) {
  const next: UraiExperienceEvent = {
    id: idForNow(),
    timestamp: new Date().toISOString(),
    ...event,
  };
  writeEvents([...readEvents(), next]);
  return next;
}

function count(events: UraiExperienceEvent[], name: UraiExperienceEventName) {
  return events.filter((event) => event.name === name).length;
}

function averageNumeric(events: UraiExperienceEvent[], name: UraiExperienceEventName) {
  const values = events
    .filter((event) => event.name === name && typeof event.value === "number")
    .map((event) => event.value as number);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getAlphaMetricsSummary(): UraiAlphaMetricsSummary {
  const events = readEvents();
  const storyStarted = count(events, "story_started");
  const storyCompleted = count(events, "story_completed");
  const storySkipped = count(events, "story_skipped");
  const reactionTotal =
    count(events, "reaction_calming") +
    count(events, "reaction_resonated") +
    count(events, "reaction_too_much") +
    count(events, "reaction_neutral");

  return {
    totalEvents: events.length,
    storyStarted,
    storyCompleted,
    storySkipped,
    completionRate: storyStarted ? storyCompleted / storyStarted : 0,
    calmingRate: reactionTotal ? count(events, "reaction_calming") / reactionTotal : 0,
    resonanceRate: reactionTotal ? count(events, "reaction_resonated") / reactionTotal : 0,
    tooMuchRate: reactionTotal ? count(events, "reaction_too_much") / reactionTotal : 0,
    voiceEnableRate: storyStarted ? count(events, "voice_enabled") / storyStarted : 0,
    averageFeltUnderstanding: averageNumeric(events, "felt_understanding_score"),
    averageTrust: averageNumeric(events, "trust_score"),
    averageRegulationDelta: averageNumeric(events, "regulation_delta"),
  };
}

export function exportAlphaMetrics() {
  return JSON.stringify(
    {
      schema: "urai.spatial.alphaMetrics.v1",
      exportedAt: new Date().toISOString(),
      summary: getAlphaMetricsSummary(),
      events: readEvents(),
    },
    null,
    2
  );
}

export function clearAlphaMetrics() {
  writeEvents([]);
}

import type { LifeEvent } from './lifeMapEngine';

export type LifePlaybackFrame = {
  event: LifeEvent;
  index: number;
  progress: number;
  elapsedMs: number;
  startedAt: number;
  durationMs: number;
  isFirst: boolean;
  isLast: boolean;
};

export type LifePlaybackTimeline = {
  frames: LifePlaybackFrame[];
  totalDurationMs: number;
  eventCount: number;
};

const DEFAULT_FRAME_DURATION_MS = 2200;
const MIN_FRAME_DURATION_MS = 800;

function clampDuration(durationMs: number) {
  if (!Number.isFinite(durationMs)) return DEFAULT_FRAME_DURATION_MS;
  return Math.max(MIN_FRAME_DURATION_MS, Math.round(durationMs));
}

function eventTime(event: LifeEvent) {
  const raw = Date.parse(event.date);
  return Number.isFinite(raw) ? raw : 0;
}

export function sortLifeEventsForPlayback(events: LifeEvent[]): LifeEvent[] {
  return [...events].sort((a, b) => {
    const timeDelta = eventTime(a) - eventTime(b);
    if (timeDelta !== 0) return timeDelta;
    return a.id.localeCompare(b.id);
  });
}

export function buildLifePlaybackTimeline(
  events: LifeEvent[],
  frameDurationMs = DEFAULT_FRAME_DURATION_MS,
): LifePlaybackTimeline {
  const durationMs = clampDuration(frameDurationMs);
  const sorted = sortLifeEventsForPlayback(events);
  const totalDurationMs = sorted.length * durationMs;

  return {
    eventCount: sorted.length,
    totalDurationMs,
    frames: sorted.map((event, index) => {
      const startedAt = index * durationMs;
      return {
        event,
        index,
        progress: totalDurationMs === 0 ? 0 : startedAt / totalDurationMs,
        elapsedMs: startedAt,
        startedAt,
        durationMs,
        isFirst: index === 0,
        isLast: index === sorted.length - 1,
      };
    }),
  };
}

export function getPlaybackFrameAt(
  timeline: LifePlaybackTimeline,
  elapsedMs: number,
): LifePlaybackFrame | null {
  if (!timeline.frames.length) return null;
  const safeElapsed = Math.max(0, Math.min(elapsedMs, Math.max(0, timeline.totalDurationMs - 1)));
  const frame = timeline.frames.find((candidate) => safeElapsed >= candidate.startedAt && safeElapsed < candidate.startedAt + candidate.durationMs);
  return frame ?? timeline.frames[timeline.frames.length - 1] ?? null;
}

export function describePlaybackFrame(frame: LifePlaybackFrame | null): string {
  if (!frame) return 'No life events are available for playback yet.';
  const date = frame.event.date ? ` on ${frame.event.date}` : '';
  return `${frame.event.title}${date}. ${frame.event.summary}`;
}

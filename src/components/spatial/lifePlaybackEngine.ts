export type LifePlaybackEvent = {
  id: string;
  title: string;
  summary?: string;
  date?: string;
  timestamp?: number;
  [key: string]: unknown;
};

export type LifePlaybackFrame<TEvent extends LifePlaybackEvent = LifePlaybackEvent> = {
  event: TEvent;
  index: number;
  progress: number;
  elapsedMs: number;
  startedAt: number;
  durationMs: number;
  isFirst: boolean;
  isLast: boolean;
};

export type LifePlaybackTimeline<TEvent extends LifePlaybackEvent = LifePlaybackEvent> = {
  frames: Array<LifePlaybackFrame<TEvent>>;
  totalDurationMs: number;
  eventCount: number;
};

const DEFAULT_FRAME_DURATION_MS = 2200;
const MIN_FRAME_DURATION_MS = 800;

function clampDuration(durationMs: number) {
  if (!Number.isFinite(durationMs)) return DEFAULT_FRAME_DURATION_MS;
  return Math.max(MIN_FRAME_DURATION_MS, Math.round(durationMs));
}

function eventTime(event: LifePlaybackEvent) {
  if (typeof event.timestamp === 'number' && Number.isFinite(event.timestamp)) return event.timestamp;
  if (!event.date) return 0;
  const raw = Date.parse(event.date);
  return Number.isFinite(raw) ? raw : 0;
}

export function sortLifeEventsForPlayback<TEvent extends LifePlaybackEvent>(events: TEvent[]): TEvent[] {
  return [...events].sort((a, b) => {
    const timeDelta = eventTime(a) - eventTime(b);
    if (timeDelta !== 0) return timeDelta;
    return a.id.localeCompare(b.id);
  });
}

export function buildLifePlaybackTimeline<TEvent extends LifePlaybackEvent>(
  events: TEvent[],
  frameDurationMs = DEFAULT_FRAME_DURATION_MS,
): LifePlaybackTimeline<TEvent> {
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

export function getPlaybackFrameAt<TEvent extends LifePlaybackEvent>(
  timeline: LifePlaybackTimeline<TEvent>,
  elapsedMs: number,
): LifePlaybackFrame<TEvent> | null {
  if (!timeline.frames.length) return null;
  const safeElapsed = Math.max(0, Math.min(elapsedMs, Math.max(0, timeline.totalDurationMs - 1)));
  const frame = timeline.frames.find((candidate) => safeElapsed >= candidate.startedAt && safeElapsed < candidate.startedAt + candidate.durationMs);
  return frame ?? timeline.frames[timeline.frames.length - 1] ?? null;
}

export function describePlaybackFrame(frame: LifePlaybackFrame | null): string {
  if (!frame) return 'No life events are available for playback yet.';
  const date = frame.event.date ? ` on ${frame.event.date}` : '';
  const summary = frame.event.summary ? `. ${frame.event.summary}` : '';
  return `${frame.event.title}${date}${summary}`;
}

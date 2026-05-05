'use client';

import { useEffect, useMemo, useReducer } from 'react';

type StarState = 'idle' | 'glowing' | 'active' | 'resolved';
type MemoryEmotion =
  | 'calm'
  | 'joy'
  | 'grief'
  | 'focus'
  | 'threshold'
  | 'recovery'
  | 'dream'
  | 'mirror'
  | 'shadow';

type ChapterId =
  | 'season-of-becoming'
  | 'threshold'
  | 'recovery-arc'
  | 'purple-dream-field'
  | 'mirror-of-becoming';

type PersistedStarState = {
  resolvedAt: number | null;
  lastActivatedAt: number | null;
};

type MemoryStar = {
  id: string;
  title: string;
  x: number;
  y: number;
  size: number;
  emotion: MemoryEmotion;
  chapterId: ChapterId;
  state: StarState;
  intensity: number;
  recency: number;
  unresolvedWeight: number;
  lastActivatedAt: number | null;
  resolvedAt: number | null;
  narratorLine: string;
  connectedTo: string[];
};

type LifeMapPhase = 'living' | 'focus' | 'cluster';
type LifeMapCamera = { x: number; y: number; zoom: number };

type MessagePriority = 'default' | 'glow' | 'cluster' | 'resolved' | 'focus';
type MessageSource =
  | 'default'
  | 'glow'
  | 'cluster'
  | 'resolved'
  | 'focus'
  | 'replay'
  | 'reflect'
  | 'escape';

type ActiveMessage = {
  line: string;
  source: MessageSource;
  priority: MessagePriority;
  expiresAt: number | null;
};

type LifeMapState = {
  stars: MemoryStar[];
  activeStarId: string | null;
  activeChapterId: ChapterId | null;
  camera: LifeMapCamera;
  activeMessage: ActiveMessage;
  phase: LifeMapPhase;
  reducedMotion: boolean;
};

type Action =
  | { type: 'SET_REDUCED_MOTION'; value: boolean }
  | { type: 'SET_GLOWING_STARS'; ids: string[] }
  | { type: 'FOCUS_STAR'; starId: string }
  | {
      type: 'FOCUS_CLUSTER';
      chapterId: ChapterId;
      camera: LifeMapCamera;
      companionLine: string;
    }
  | { type: 'MARK_RESOLVED'; starId: string; resolvedAt: number }
  | {
      type: 'REHYDRATE_PERSISTENCE';
      persisted: Record<string, PersistedStarState>;
    }
  | { type: 'SET_CAMERA'; camera: LifeMapCamera }
  | { type: 'CLEAR_FOCUS' }
  | {
      type: 'UPSERT_MESSAGE';
      line: string;
      source: MessageSource;
      priority: MessagePriority;
      ttlMs?: number | null;
    };

type NarratorEvent = {
  event: string;
  starId?: string;
  chapterId?: ChapterId | null;
  emotion?: MemoryEmotion | null;
  action?: 'replay' | 'reflect' | 'resolve';
};

type TimelineSyncEvent = {
  phase: LifeMapPhase;
  activeStarId?: string | null;
  activeChapterId?: ChapterId | null;
};

const MESSAGE_PRIORITY_RANK: Record<MessagePriority, number> = {
  default: 0,
  glow: 1,
  cluster: 2,
  resolved: 3,
  focus: 4,
};

function upsertMessage(
  current: ActiveMessage,
  incoming: {
    line: string;
    source: MessageSource;
    priority: MessagePriority;
    ttlMs?: number | null;
  },
  now: number,
): ActiveMessage {
  const currentExpired = current.expiresAt !== null && current.expiresAt <= now;
  const incomingHigher =
    MESSAGE_PRIORITY_RANK[incoming.priority] >
    MESSAGE_PRIORITY_RANK[current.priority];

  if (!currentExpired && !incomingHigher) return current;

  return {
    line: incoming.line,
    source: incoming.source,
    priority: incoming.priority,
    expiresAt: incoming.ttlMs == null ? null : now + incoming.ttlMs,
  };
}

/* =========================
   INITIAL DATA
   ========================= */

const CHAPTERS: Array<{
  id: ChapterId;
  title: string;
  subtitle: string;
}> = [
  {
    id: 'season-of-becoming',
    title: 'Season of Becoming',
    subtitle: 'early signal formation',
  },
  {
    id: 'threshold',
    title: 'Threshold',
    subtitle: 'pressure, rupture, crossing',
  },
  {
    id: 'recovery-arc',
    title: 'Recovery Arc',
    subtitle: 'repair, return, integration',
  },
  {
    id: 'purple-dream-field',
    title: 'Purple Dream Field',
    subtitle: 'symbolic night memory',
  },
  {
    id: 'mirror-of-becoming',
    title: 'Mirror of Becoming',
    subtitle: 'identity reflection',
  },
];

const CHAPTER_LINES: Record<ChapterId, string> = {
  'season-of-becoming':
    'This chapter holds the first signals of becoming.',
  threshold:
    'This cluster marks pressure, rupture, and the crossing point.',
  'recovery-arc':
    'This arc shows where recovery started to organize itself.',
  'purple-dream-field':
    'This dream field holds symbols still arranging themselves.',
  'mirror-of-becoming':
    'This mirror reflects the version of you that is forming.',
};

const GLOW_LINES = [
  'A recurring memory pattern appeared.',
  'A quiet signal is asking for attention.',
  'One thread is beginning to glow again.',
  'Something unresolved is moving toward the surface.',
  'A constellation point is becoming active.',
];

const INITIAL_STARS: MemoryStar[] = [
  ['M', 16, 22, 'season-of-becoming', 'calm'],
  ['D', 28, 19, 'season-of-becoming', 'joy'],
  ['I', 22, 34, 'season-of-becoming', 'focus'],
  ['S', 37, 30, 'threshold', 'shadow'],
  ['R', 48, 24, 'threshold', 'grief'],
  ['T', 56, 31, 'threshold', 'threshold'],
  ['E', 65, 20, 'recovery-arc', 'recovery'],
  ['L', 72, 28, 'recovery-arc', 'focus'],
  ['V', 79, 37, 'recovery-arc', 'joy'],
  ['P', 24, 66, 'purple-dream-field', 'dream'],
  ['G', 34, 72, 'purple-dream-field', 'mirror'],
  ['B', 44, 68, 'purple-dream-field', 'shadow'],
  ['O', 58, 68, 'mirror-of-becoming', 'mirror'],
  ['A', 68, 72, 'mirror-of-becoming', 'focus'],
  ['N', 78, 64, 'mirror-of-becoming', 'calm'],
].map((s, idx) => ({
  id: `star-${s[0]}-${idx}`,
  title: String(s[0]),
  x: Number(s[1]),
  y: Number(s[2]),
  chapterId: s[3] as ChapterId,
  emotion: s[4] as MemoryEmotion,
  size: 16 + (idx % 5),
  state: 'idle' as StarState,
  intensity: 0.5 + (idx % 4) * 0.1,
  recency: 0.45 + (idx % 5) * 0.08,
  unresolvedWeight: 0.45 + (idx % 3) * 0.12,
  lastActivatedAt: null,
  resolvedAt: null,
  narratorLine: `${s[0]} carries a thread that still matters.`,
  connectedTo: [],
}));

/* =========================
   SIDE-EFFECT ADAPTERS
   ========================= */

function emitNarratorEvent(event: NarratorEvent) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('urai:narrator', { detail: event }));
}

function emitTimelineSync(event: TimelineSyncEvent) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('urai:timeline-sync', { detail: event }));
}

/* =========================
   PERSISTENCE
   ========================= */

const PERSIST_KEY = 'urai.lifemap.star.persistence.v1';

function loadPersistence(): Record<string, PersistedStarState> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePersistence(starId: string, values: Partial<PersistedStarState>) {
  if (typeof window === 'undefined') return;

  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    const current: Record<string, PersistedStarState> = raw
      ? JSON.parse(raw)
      : {};
    const prev = current[starId] ?? {
      resolvedAt: null,
      lastActivatedAt: null,
    };

    current[starId] = { ...prev, ...values };
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(current));
  } catch {
    // Persistence failure should never break the Life Map.
  }
}

/* =========================
   REDUCER
   ========================= */

function reducer(state: LifeMapState, action: Action): LifeMapState {
  switch (action.type) {
    case 'SET_REDUCED_MOTION':
      return { ...state, reducedMotion: action.value };

    case 'SET_GLOWING_STARS':
      return {
        ...state,
        stars: state.stars.map((s) =>
          s.state === 'resolved'
            ? s
            : { ...s, state: action.ids.includes(s.id) ? 'glowing' : 'idle' },
        ),
      };

    case 'FOCUS_STAR': {
      const now = Date.now();
      const target = state.stars.find((s) => s.id === action.starId);
      if (!target) return state;

      return {
        ...state,
        phase: 'focus',
        activeStarId: target.id,
        activeChapterId: target.chapterId,
        camera: { x: target.x, y: target.y, zoom: 1.8 },
        activeMessage: upsertMessage(
          state.activeMessage,
          {
            line: target.narratorLine,
            source: 'focus',
            priority: 'focus',
          },
          now,
        ),
        stars: state.stars.map((s) =>
          s.id === target.id
            ? { ...s, state: 'active', lastActivatedAt: now }
            : s.state === 'resolved'
              ? s
              : { ...s, state: 'idle' },
        ),
      };
    }

    case 'FOCUS_CLUSTER':
      return {
        ...state,
        phase: 'cluster',
        activeChapterId: action.chapterId,
        activeStarId: null,
        camera: action.camera,
        activeMessage: upsertMessage(
          state.activeMessage,
          {
            line: action.companionLine,
            source: 'cluster',
            priority: 'cluster',
          },
          Date.now(),
        ),
      };

    case 'MARK_RESOLVED':
      return {
        ...state,
        stars: state.stars.map((s) =>
          s.id === action.starId
            ? {
                ...s,
                state: 'resolved',
                resolvedAt: action.resolvedAt,
              }
            : s,
        ),
        activeMessage: upsertMessage(
          state.activeMessage,
          {
            line: 'This one has softened.',
            source: 'resolved',
            priority: 'resolved',
          },
          Date.now(),
        ),
      };

    case 'REHYDRATE_PERSISTENCE':
      return {
        ...state,
        stars: state.stars.map((s) => {
          const p = action.persisted[s.id];
          if (!p) return s;

          return {
            ...s,
            lastActivatedAt: p.lastActivatedAt,
            resolvedAt: p.resolvedAt,
            state: p.resolvedAt ? 'resolved' : s.state,
          };
        }),
      };

    case 'SET_CAMERA':
      return { ...state, camera: action.camera };

    case 'CLEAR_FOCUS':
      return {
        ...state,
        phase: 'living',
        activeStarId: null,
        activeChapterId: null,
        camera: { x: 50, y: 50, zoom: 1 },
        stars: state.stars.map((s) =>
          s.state === 'resolved' ? s : { ...s, state: 'idle' },
        ),
        activeMessage: upsertMessage(
          state.activeMessage,
          {
            line: 'Field reset. You can choose a new thread.',
            source: 'escape',
            priority: 'default',
            ttlMs: 4000,
          },
          Date.now(),
        ),
      };

    case 'UPSERT_MESSAGE':
      return {
        ...state,
        activeMessage: upsertMessage(state.activeMessage, action, Date.now()),
      };

    default:
      return state;
  }
}

/* =========================
   COMPONENT
   ========================= */

export default function LifeMapScene() {
  const [state, dispatch] = useReducer(reducer, {
    stars: INITIAL_STARS,
    activeStarId: null,
    activeChapterId: null,
    camera: { x: 50, y: 50, zoom: 1 },
    activeMessage: {
      line: 'A recurring memory pattern appeared.',
      source: 'default',
      priority: 'default',
      expiresAt: null,
    },
    phase: 'living',
    reducedMotion: false,
  });

  const activeStar = useMemo(
    () => state.stars.find((s) => s.id === state.activeStarId) ?? null,
    [state.stars, state.activeStarId],
  );

  const activeConnections = useMemo(() => {
    if (!activeStar) return new Set<string>();
    return new Set([activeStar.id, ...activeStar.connectedTo]);
  }, [activeStar]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () =>
      dispatch({ type: 'SET_REDUCED_MOTION', value: media.matches });

    apply();
    media.addEventListener('change', apply);

    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    dispatch({
      type: 'REHYDRATE_PERSISTENCE',
      persisted: loadPersistence(),
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timer = 0;

    const emotionScore: Record<MemoryEmotion, number> = {
      threshold: 3,
      grief: 2.5,
      recovery: 2,
      shadow: 2,
      mirror: 1.5,
      dream: 1.25,
      calm: 1,
      joy: 1,
      focus: 1,
    };

    const run = () => {
      const candidates = state.stars.filter(
        (s) => s.id !== state.activeStarId && s.state !== 'resolved',
      );

      if (candidates.length === 0) return;

      const pickCount = Math.min(1 + Math.floor(Math.random() * 3), candidates.length);

      const scored = [...candidates]
        .map((s) => ({
          s,
          score:
            1 +
            s.recency * 2 +
            s.intensity * 2 +
            s.unresolvedWeight * 3 +
            emotionScore[s.emotion],
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(3, pickCount * 2));

      const picked = scored
        .sort(() => Math.random() - 0.5)
        .slice(0, pickCount)
        .map((x) => x.s.id);

      dispatch({ type: 'SET_GLOWING_STARS', ids: picked });

      dispatch({
        type: 'UPSERT_MESSAGE',
        line: GLOW_LINES[Math.floor(Math.random() * GLOW_LINES.length)],
        source: 'glow',
        priority: 'glow',
        ttlMs: state.reducedMotion ? 8000 : 5000,
      });

      picked.forEach((id) => {
        const star = state.stars.find((s) => s.id === id);
        emitNarratorEvent({
          event: 'lifemap.star.glow',
          starId: id,
          chapterId: star?.chapterId ?? null,
          emotion: star?.emotion ?? null,
        });
      });

      emitTimelineSync({
        phase: 'living',
        activeStarId: state.activeStarId,
        activeChapterId: state.activeChapterId,
      });

      timer = window.setTimeout(
        run,
        state.reducedMotion ? 14000 : 8000 + Math.floor(Math.random() * 6000),
      );
    };

    timer = window.setTimeout(run, state.reducedMotion ? 14000 : 9000);

    return () => window.clearTimeout(timer);
  }, [
    state.stars,
    state.activeStarId,
    state.activeChapterId,
    state.reducedMotion,
  ]);

  return (
    <main className="life-map-shell">
      <section
        className={`lifemap-space ${state.phase !== 'living' ? 'is-focused' : ''}`}
        aria-label="URAI Life Map"
      >
        <div
          className="starfield"
          style={
            {
              '--camera-x': `${state.camera.x}%`,
              '--camera-y': `${state.camera.y}%`,
              '--camera-zoom': state.camera.zoom,
            } as React.CSSProperties
          }
        >
          <svg className="connections" viewBox="0 0 100 100" aria-hidden="true">
            {state.stars.flatMap((star) =>
              star.connectedTo
                .map((targetId) => {
                  const target = state.stars.find((s) => s.id === targetId);
                  if (!target) return null;

                  const isActive =
                    activeConnections.has(star.id) &&
                    activeConnections.has(target.id);

                  return (
                    <line
                      key={`${star.id}-${target.id}`}
                      x1={star.x}
                      y1={star.y}
                      x2={target.x}
                      y2={target.y}
                      className={`connection-line ${
                        isActive ? 'is-active' : 'is-flowing'
                      } ${
                        activeStar && !isActive ? 'is-dimmed' : ''
                      }`}
                    />
                  );
                })
                .filter(Boolean),
            )}
          </svg>

          {state.stars.map((star) => {
            const isActive = star.id === state.activeStarId;
            const isConnected = activeConnections.has(star.id);
            const isDimmed = Boolean(activeStar) && !isActive && !isConnected;
            const isChapterFocused =
              state.phase === 'cluster' && state.activeChapterId === star.chapterId;

            return (
              <button
                key={star.id}
                type="button"
                className={[
                  'memory-star',
                  `state-${star.state}`,
                  isActive ? 'is-active' : '',
                  isConnected ? 'is-connected' : '',
                  isDimmed ? 'is-dimmed' : '',
                  isChapterFocused ? 'is-chapter-focused' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: star.size,
                  height: star.size,
                }}
                aria-label={`${star.title}: ${star.emotion}`}
                onClick={() => {
                  const now = Date.now();

                  dispatch({ type: 'FOCUS_STAR', starId: star.id });
                  savePersistence(star.id, { lastActivatedAt: now });

                  emitNarratorEvent({
                    event: 'lifemap.star.focus',
                    starId: star.id,
                    chapterId: star.chapterId,
                    emotion: star.emotion,
                  });

                  emitTimelineSync({
                    phase: 'focus',
                    activeStarId: star.id,
                    activeChapterId: star.chapterId,
                  });
                }}
              >
                {star.title}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="panel export-panel" aria-label="Export panel">
        <button type="button">Export snapshot</button>
        <button type="button">Export arc</button>
      </aside>

      <aside className="panel companion-panel" aria-label="Companion panel">
        <h2>Companion</h2>
        <p>{state.activeMessage.line}</p>
      </aside>

      {activeStar && (
        <aside className="panel detail" aria-live="polite">
          <h3>{activeStar.title}</h3>
          <p>
            {activeStar.emotion} ·{' '}
            {CHAPTERS.find((c) => c.id === activeStar.chapterId)?.title}
          </p>
          <p>{activeStar.narratorLine}</p>

          <div className="actions">
            <button
              type="button"
              onClick={() => {
                dispatch({
                  type: 'UPSERT_MESSAGE',
                  line: 'Replaying the emotional thread.',
                  source: 'replay',
                  priority: 'focus',
                });

                emitNarratorEvent({
                  event: 'lifemap.star.focus',
                  starId: activeStar.id,
                  chapterId: activeStar.chapterId,
                  emotion: activeStar.emotion,
                  action: 'replay',
                });
              }}
            >
              Replay
            </button>

            <button
              type="button"
              onClick={() => {
                dispatch({
                  type: 'UPSERT_MESSAGE',
                  line: 'Reflection mode is open.',
                  source: 'reflect',
                  priority: 'focus',
                });

                emitNarratorEvent({
                  event: 'lifemap.star.focus',
                  starId: activeStar.id,
                  chapterId: activeStar.chapterId,
                  emotion: activeStar.emotion,
                  action: 'reflect',
                });
              }}
            >
              Reflect
            </button>

            <button
              type="button"
              onClick={() => {
                const resolvedAt = Date.now();

                dispatch({
                  type: 'MARK_RESOLVED',
                  starId: activeStar.id,
                  resolvedAt,
                });

                savePersistence(activeStar.id, { resolvedAt });

                emitNarratorEvent({
                  event: 'lifemap.star.resolved',
                  starId: activeStar.id,
                  chapterId: activeStar.chapterId,
                  emotion: activeStar.emotion,
                  action: 'resolve',
                });

                emitTimelineSync({
                  phase: 'focus',
                  activeStarId: activeStar.id,
                  activeChapterId: activeStar.chapterId,
                });
              }}
            >
              Mark resolved
            </button>
          </div>
        </aside>
      )}

      <nav className="chapter-row" aria-label="Chapter anchors">
        {CHAPTERS.map((chapter) => {
          const chapterStars = state.stars.filter(
            (s) => s.chapterId === chapter.id,
          );

          const camera =
            chapterStars.length > 0
              ? {
                  x:
                    chapterStars.reduce((acc, star) => acc + star.x, 0) /
                    chapterStars.length,
                  y:
                    chapterStars.reduce((acc, star) => acc + star.y, 0) /
                    chapterStars.length,
                  zoom: 1.45,
                }
              : { x: 50, y: 50, zoom: 1 };

          return (
            <button
              type="button"
              key={chapter.id}
              className={`chapter-pill ${
                state.activeChapterId === chapter.id ? 'active' : ''
              }`}
              onClick={() => {
                dispatch({
                  type: 'FOCUS_CLUSTER',
                  chapterId: chapter.id,
                  camera,
                  companionLine: CHAPTER_LINES[chapter.id],
                });

                emitNarratorEvent({
                  event: 'lifemap.cluster.focus',
                  chapterId: chapter.id,
                });

                emitTimelineSync({
                  phase: 'cluster',
                  activeChapterId: chapter.id,
                });
              }}
            >
              <strong>{chapter.title}</strong>
              <small>{chapter.subtitle}</small>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        className="reset-button"
        onClick={() => {
          dispatch({ type: 'CLEAR_FOCUS' });
          emitTimelineSync({
            phase: 'living',
            activeStarId: null,
            activeChapterId: null,
          });
        }}
      >
        Reset field
      </button>

      <style jsx>{`
        .life-map-shell {
          min-height: 100vh;
          background: radial-gradient(
            circle at 50% 28%,
            #26366d,
            #0a0f20 58%,
            #05060f 100%
          );
          color: #eef3ff;
          position: relative;
          padding: 1rem;
          overflow: hidden;
        }

        .lifemap-space {
          position: absolute;
          inset: 0 0 120px;
          filter: none;
        }

        .lifemap-space.is-focused {
          filter: blur(0.2px) saturate(1.05);
        }

        .starfield {
          position: absolute;
          inset: 0;
          transform: translate(
              calc(50% - var(--camera-x)),
              calc(50% - var(--camera-y))
            )
            scale(var(--camera-zoom));
          transition:
            transform 700ms cubic-bezier(0.22, 1, 0.36, 1),
            filter 700ms ease;
        }

        .connections {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .connection-line {
          stroke: rgba(190, 220, 255, 0.22);
          stroke-width: 0.2;
          stroke-dasharray: 1 1.8;
        }

        .connection-line.is-flowing {
          animation: constellationFlow 6s linear infinite;
        }

        .connection-line.is-active {
          stroke: rgba(210, 240, 255, 0.75);
          stroke-width: 0.34;
          filter: drop-shadow(0 0 8px rgba(125, 211, 252, 0.7));
        }

        .connection-line.is-dimmed {
          opacity: 0.25;
        }

        .memory-star {
          position: absolute;
          transform: translate(-50%, -50%);
          border: 0;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            #f8fbff 0%,
            #b4ceff 48%,
            #779dff 100%
          );
          color: #071022;
          font-weight: 700;
          display: grid;
          place-items: center;
          box-shadow:
            0 0 10px rgba(255, 255, 255, 0.75),
            0 0 24px rgba(120, 170, 255, 0.45);
          transition:
            opacity 0.4s ease,
            transform 0.4s ease;
        }

        .memory-star.state-glowing {
          animation: starPulse 2.8s ease-in-out infinite;
        }

        .memory-star.state-active,
        .memory-star.is-active {
          transform: translate(-50%, -50%) scale(1.22);
          z-index: 3;
        }

        .memory-star.state-resolved::after {
          content: '';
          position: absolute;
          inset: -20px;
          border-radius: 999px;
          border: 1px solid rgba(190, 255, 235, 0.45);
          animation: bloomFade 1.8s ease-out;
        }

        .memory-star.is-connected {
          opacity: 0.92;
        }

        .memory-star.is-dimmed {
          opacity: 0.34;
        }

        .memory-star.is-chapter-focused {
          opacity: 1;
        }

        .panel {
          position: absolute;
          background: rgba(7, 10, 25, 0.75);
          border: 1px solid rgba(157, 196, 255, 0.32);
          border-radius: 12px;
          padding: 0.8rem;
          backdrop-filter: blur(6px);
        }

        .export-panel {
          left: 1rem;
          top: 1rem;
          display: flex;
          gap: 0.5rem;
        }

        .companion-panel {
          right: 1rem;
          top: 1rem;
          width: 280px;
        }

        .detail {
          right: 1rem;
          top: 130px;
          width: 300px;
        }

        .actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .chapter-row {
          position: absolute;
          left: 1rem;
          right: 1rem;
          bottom: 1rem;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0.5rem;
        }

        .chapter-pill {
          border: 1px solid rgba(157, 196, 255, 0.4);
          border-radius: 999px;
          background: rgba(13, 20, 45, 0.85);
          color: #edf4ff;
          padding: 0.5rem 0.7rem;
          text-align: left;
        }

        .chapter-pill.active {
          border-color: #b9d7ff;
          box-shadow: 0 0 18px rgba(125, 211, 252, 0.35);
        }

        .chapter-pill small {
          display: block;
          opacity: 0.8;
        }

        .reset-button {
          position: absolute;
          left: 1rem;
          bottom: 5rem;
          border: 1px solid rgba(157, 196, 255, 0.35);
          border-radius: 999px;
          background: rgba(13, 20, 45, 0.85);
          color: #edf4ff;
          padding: 0.5rem 0.8rem;
        }

        @keyframes constellationFlow {
          to {
            stroke-dashoffset: -80;
          }
        }

        @keyframes starPulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
          }

          50% {
            transform: translate(-50%, -50%) scale(1.12);
          }
        }

        @keyframes bloomFade {
          from {
            opacity: 0.95;
            transform: scale(0.75);
          }

          to {
            opacity: 0;
            transform: scale(1.55);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .memory-star,
          .connection-line,
          .lifemap-space,
          .starfield {
            animation: none !important;
            transition-duration: 0.01ms !important;
          }

          .connection-line.is-flowing {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
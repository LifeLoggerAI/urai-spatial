'use client';

import { useEffect, useMemo, useReducer, useRef } from 'react';
import {
  chooseGlowingStars,
  createSeededRandom,
  type GlowHistoryEntry,
} from './lifeMapGlowScheduler';
import {
  INITIAL_STARS,
  CHAPTERS,
  CHAPTER_LINES,
  GLOW_LINES,
  computeChapterCamera,
  getStateClasses,
  reducedMotionLoopDelay,
  type ChapterId,
  type LifeMapCamera,
  type LifeMapPhase,
  type MemoryEmotion,
  type MemoryStar,
} from './lifemapSceneLogic';
import { detectLifeMapPatterns, type PatternInsight } from './lifeMapPatternEngine';
import {
  getInsightStorageKey,
  mergePatternInsights,
  parseInsightLedger,
  serializeInsightLedger,
  shouldSurfacePersistentInsight,
} from './persistentInsightEngine';

type NarratorChannel = 'visual' | 'voice' | 'haptic';
type MessageSource =
  | 'focus'
  | 'resolved'
  | 'cluster'
  | 'glow'
  | 'replay'
  | 'reflect'
  | 'pattern'
  | 'default';
type HapticPattern = number | number[];

type MessageEnvelope = {
  id: string;
  source: MessageSource;
  priority: number;
  text: string;
  createdAt: number;
  expiresAt: number | null;
  channels: NarratorChannel[];
  hapticPattern?: HapticPattern;
  voiceRate?: number;
  voicePitch?: number;
};

const SOURCE_PRIORITY: Record<MessageSource, number> = {
  focus: 6,
  resolved: 5,
  replay: 5,
  reflect: 5,
  pattern: 5,
  cluster: 4,
  glow: 2,
  default: 1,
};

const SOURCE_COOLDOWN: Record<MessageSource, number> = {
  focus: 0,
  resolved: 2000,
  replay: 1500,
  reflect: 1500,
  pattern: 12000,
  cluster: 3000,
  glow: 5000,
  default: 0,
};

const HAPTICS: Record<MessageSource, HapticPattern> = {
  focus: [30, 40, 80],
  resolved: [20, 30, 20, 30, 120],
  replay: [40, 30, 40, 30, 100],
  reflect: [60],
  pattern: [25, 35, 25, 70, 120],
  cluster: [35, 50, 35],
  glow: 18,
  default: 10,
};

type MessageState = {
  queue: MessageEnvelope[];
  lastBySource: Partial<Record<MessageSource, number>>;
  lastText: string | null;
};

function createMessage(
  source: MessageSource,
  text: string,
  ttl: number | null,
  channels: NarratorChannel[] = ['visual', 'haptic'],
  options?: Partial<Pick<MessageEnvelope, 'voiceRate' | 'voicePitch'>>
): MessageEnvelope {
  const now = Date.now();

  return {
    id: `${source}-${now}-${Math.random()}`,
    source,
    priority: SOURCE_PRIORITY[source],
    text,
    createdAt: now,
    expiresAt: ttl ? now + ttl : null,
    channels,
    hapticPattern: HAPTICS[source],
    voiceRate: options?.voiceRate ?? 0.92,
    voicePitch: options?.voicePitch ?? 0.96,
  };
}

function pushMessage(state: MessageState, msg: MessageEnvelope): MessageState {
  const now = Date.now();
  const last = state.lastBySource[msg.source] ?? 0;

  if (now - last < SOURCE_COOLDOWN[msg.source]) return state;
  if (state.lastText === msg.text) return state;

  const queue = [...state.queue, msg].sort(
    (a, b) => b.priority - a.priority || b.createdAt - a.createdAt
  );

  return {
    queue: queue.slice(0, 6),
    lastBySource: { ...state.lastBySource, [msg.source]: now },
    lastText: msg.text,
  };
}

function pruneMessages(state: MessageState): MessageState {
  const now = Date.now();

  return {
    ...state,
    queue: state.queue.filter((message) => !message.expiresAt || message.expiresAt > now),
  };
}

function getActiveMessage(state: MessageState) {
  return state.queue[0] ?? null;
}

type NarratorEventName =
  | 'lifemap.star.glow'
  | 'lifemap.star.focus'
  | 'lifemap.cluster.focus'
  | 'lifemap.star.resolved'
  | 'lifemap.star.replay'
  | 'lifemap.star.reflect'
  | 'lifemap.pattern.detected';

function emitNarratorEvent(detail: {
  event: NarratorEventName;
  starId?: string | null;
  chapterId?: ChapterId | null;
  emotion?: MemoryEmotion | null;
  action?: 'replay' | 'reflect' | 'resolve';
  pattern?: Pick<PatternInsight, 'id' | 'type' | 'strength'>;
}) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('urai:narrator', {
      detail: { ...detail, timestamp: Date.now() },
    })
  );
}

function emitTimelineSync(detail: {
  phase: LifeMapPhase;
  activeStarId?: string | null;
  activeChapterId?: ChapterId | null;
}) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('urai:timeline-sync', {
      detail: { mode: 'lifemap', ...detail, timestamp: Date.now() },
    })
  );
}

function persistInsights(patterns: PatternInsight[], stars: MemoryStar[]) {
  if (typeof window === 'undefined' || !patterns.length) return [];

  try {
    const key = getInsightStorageKey();
    const current = parseInsightLedger(window.localStorage.getItem(key));
    const emotionMap = Object.fromEntries(stars.map((star) => [star.id, star.emotion]));
    const next = mergePatternInsights(current, patterns, emotionMap);

    window.localStorage.setItem(key, serializeInsightLedger(next));

    return next.insights.filter(shouldSurfacePersistentInsight);
  } catch (error) {
    console.warn('Unable to persist URAI Life Map insights', error);
    return [];
  }
}

type State = {
  stars: MemoryStar[];
  activeStarId: string | null;
  activeChapterId: ChapterId | null;
  camera: LifeMapCamera;
  messages: MessageState;
  phase: LifeMapPhase;
  reducedMotion: boolean;
  voiceEnabled: boolean;
  hapticsEnabled: boolean;
  seenPatternIds: string[];
};

type Action =
  | { type: 'SET_REDUCED_MOTION'; value: boolean }
  | { type: 'SET_VOICE_ENABLED'; value: boolean }
  | { type: 'SET_HAPTICS_ENABLED'; value: boolean }
  | { type: 'SET_GLOWING_STARS'; ids: string[] }
  | { type: 'FOCUS_STAR'; starId: string }
  | { type: 'FOCUS_CLUSTER'; chapterId: ChapterId; camera: LifeMapCamera; text: string }
  | { type: 'MARK_RESOLVED'; starId: string }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'PUSH_MESSAGE'; msg: MessageEnvelope }
  | { type: 'PUSH_PATTERN_MESSAGES'; insights: PatternInsight[] }
  | { type: 'PRUNE_MESSAGES' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_REDUCED_MOTION':
      return { ...state, reducedMotion: action.value };

    case 'SET_VOICE_ENABLED':
      return { ...state, voiceEnabled: action.value };

    case 'SET_HAPTICS_ENABLED':
      return { ...state, hapticsEnabled: action.value };

    case 'SET_GLOWING_STARS':
      return {
        ...state,
        stars: state.stars.map((star) => {
          if (star.id === state.activeStarId || star.state === 'resolved') return star;

          if (action.ids.includes(star.id)) {
            return { ...star, state: 'glowing', lastActivatedAt: Date.now() };
          }

          return { ...star, state: 'idle' };
        }),
      };

    case 'FOCUS_STAR': {
      const star = state.stars.find((item) => item.id === action.starId);
      if (!star) return state;

      return {
        ...state,
        activeStarId: star.id,
        activeChapterId: star.chapterId,
        phase: 'focus',
        camera: { x: star.x, y: star.y, zoom: 1.8 },
        stars: state.stars.map((item) =>
          item.id === star.id
            ? { ...item, state: 'active', lastActivatedAt: Date.now() }
            : item.state === 'active'
              ? { ...item, state: 'idle' }
              : item
        ),
        messages: pushMessage(
          state.messages,
          createMessage('focus', star.narratorLine, null, ['visual', 'voice', 'haptic'])
        ),
      };
    }

    case 'FOCUS_CLUSTER':
      return {
        ...state,
        phase: 'cluster',
        activeStarId: null,
        activeChapterId: action.chapterId,
        camera: action.camera,
        stars: state.stars.map((star) => (star.state === 'active' ? { ...star, state: 'idle' } : star)),
        messages: pushMessage(
          state.messages,
          createMessage('cluster', action.text, 18000, ['visual', 'voice', 'haptic'])
        ),
      };

    case 'MARK_RESOLVED':
      return {
        ...state,
        stars: state.stars.map((star) =>
          star.id === action.starId ? { ...star, state: 'resolved', lastActivatedAt: Date.now() } : star
        ),
        messages: pushMessage(
          state.messages,
          createMessage('resolved', 'This one has softened.', null, ['visual', 'voice', 'haptic'])
        ),
      };

    case 'CLEAR_FOCUS':
      return {
        ...state,
        phase: 'living',
        activeStarId: null,
        activeChapterId: null,
        camera: { x: 50, y: 50, zoom: 1 },
        stars: state.stars.map((star) => (star.state === 'active' ? { ...star, state: 'idle' } : star)),
      };

    case 'PUSH_MESSAGE':
      return { ...state, messages: pushMessage(state.messages, action.msg) };

    case 'PUSH_PATTERN_MESSAGES': {
      const unseen = action.insights.filter((insight) => !state.seenPatternIds.includes(insight.id));

      const messages = unseen.reduce(
        (acc, insight) =>
          pushMessage(
            acc,
            createMessage('pattern', insight.message, 24000, ['visual', 'voice', 'haptic'], {
              voicePitch: 0.98,
            })
          ),
        state.messages
      );

      return {
        ...state,
        messages,
        seenPatternIds: [...state.seenPatternIds, ...unseen.map((insight) => insight.id)].slice(-40),
      };
    }

    case 'PRUNE_MESSAGES':
      return { ...state, messages: pruneMessages(state.messages) };
  }
}

export default function LifeMapScene() {
  const [state, dispatch] = useReducer(reducer, {
    stars: INITIAL_STARS,
    activeStarId: null,
    activeChapterId: null,
    camera: { x: 50, y: 50, zoom: 1 },
    phase: 'living',
    reducedMotion: false,
    voiceEnabled: false,
    hapticsEnabled: true,
    seenPatternIds: [],
    messages: {
      queue: [createMessage('default', 'A recurring memory pattern appeared.', null, ['visual'])],
      lastBySource: {},
      lastText: null,
    },
  });

  const glowHistoryRef = useRef<GlowHistoryEntry[]>([]);
  const tickRef = useRef(0);
  const rngRef = useRef(createSeededRandom(90210));
  const lastSpokenMessageId = useRef<string | null>(null);
  const lastHapticMessageId = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => dispatch({ type: 'SET_REDUCED_MOTION', value: mediaQuery.matches });

    onChange();
    mediaQuery.addEventListener('change', onChange);

    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'CLEAR_FOCUS' });
    };

    window.addEventListener('keydown', onEsc);

    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timer = 0;

    const run = () => {
      const currentStars = state.stars;
      const currentActiveStarId = state.activeStarId;
      const currentActiveChapterId = state.activeChapterId;

      const picked = chooseGlowingStars(
        currentStars.filter((star) => star.id !== currentActiveStarId),
        glowHistoryRef.current,
        {
          count: 1 + Math.floor(rngRef.current() * 3),
          tick: tickRef.current,
          minTicksBetweenGlows: 2,
          repeatWindowTicks: 6,
          maxRepeatsPerWindow: 2,
        },
        rngRef.current
      );

      dispatch({ type: 'SET_GLOWING_STARS', ids: picked });

      dispatch({
        type: 'PUSH_MESSAGE',
        msg: createMessage(
          'glow',
          GLOW_LINES[Math.floor(rngRef.current() * GLOW_LINES.length)],
          12000,
          ['visual', 'haptic']
        ),
      });

      const nextHistory = [...glowHistoryRef.current.slice(-20), { tick: tickRef.current, ids: picked }];
      const insights = detectLifeMapPatterns(currentStars, nextHistory);

      if (insights.length) {
        persistInsights(insights, currentStars);
        dispatch({ type: 'PUSH_PATTERN_MESSAGES', insights });

        insights.forEach((insight) => {
          const star = currentStars.find((item) => item.id === insight.starIds[0]);

          emitNarratorEvent({
            event: 'lifemap.pattern.detected',
            starId: insight.starIds[0] ?? null,
            chapterId: insight.chapterId,
            emotion: star?.emotion ?? null,
            pattern: {
              id: insight.id,
              type: insight.type,
              strength: insight.strength,
            },
          });
        });
      }

      picked.forEach((id) => {
        const star = currentStars.find((item) => item.id === id);

        emitNarratorEvent({
          event: 'lifemap.star.glow',
          starId: id,
          chapterId: star?.chapterId ?? null,
          emotion: star?.emotion ?? null,
        });
      });

      emitTimelineSync({
        phase: 'living',
        activeStarId: currentActiveStarId,
        activeChapterId: currentActiveChapterId,
      });

      dispatch({ type: 'PRUNE_MESSAGES' });

      glowHistoryRef.current = nextHistory;
      tickRef.current += 1;

      timer = window.setTimeout(run, reducedMotionLoopDelay(state.reducedMotion, rngRef.current));
    };

    timer = window.setTimeout(run, reducedMotionLoopDelay(state.reducedMotion, rngRef.current));

    return () => window.clearTimeout(timer);
  }, [state.stars, state.activeStarId, state.activeChapterId, state.reducedMotion]);

  const activeMessage = getActiveMessage(state.messages);
  const activeStar = state.stars.find((star) => star.id === state.activeStarId) ?? null;
  const starById = useMemo(() => new Map(state.stars.map((star) => [star.id, star])), [state.stars]);

  useEffect(() => {
    if (!activeMessage || !activeMessage.channels.includes('voice') || !state.voiceEnabled) return;
    if (lastSpokenMessageId.current === activeMessage.id) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    lastSpokenMessageId.current = activeMessage.id;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(activeMessage.text);
    utterance.rate = activeMessage.voiceRate ?? 0.92;
    utterance.pitch = activeMessage.voicePitch ?? 0.96;
    utterance.volume = 0.86;

    window.speechSynthesis.speak(utterance);
  }, [activeMessage, state.voiceEnabled]);

  useEffect(() => {
    if (!activeMessage || !activeMessage.channels.includes('haptic') || !state.hapticsEnabled) return;
    if (lastHapticMessageId.current === activeMessage.id) return;
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;

    lastHapticMessageId.current = activeMessage.id;
    navigator.vibrate(activeMessage.hapticPattern ?? 10);
  }, [activeMessage, state.hapticsEnabled]);

  return (
    <main className="life-map-shell" aria-label="URAI Spatial Life Map scene">
      <section className={`lifemap-space ${activeStar ? 'is-focused' : ''}`} aria-label="Interactive symbolic life map">
        <div
          className="starfield"
          style={
            {
              '--camera-x': `${state.camera.x}%`,
              '--camera-y': `${state.camera.y}%`,
              '--camera-zoom': String(state.camera.zoom),
            } as React.CSSProperties
          }
        >
          <svg className="connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {state.stars
              .flatMap((star) => star.connectedTo.map((to) => [star.id, to] as const))
              .filter(([a, b]) => a < b)
              .map(([a, b]) => {
                const s1 = starById.get(a);
                const s2 = starById.get(b);

                if (!s1 || !s2) return null;

                const isActive =
                  !!activeStar &&
                  (a === activeStar.id ||
                    b === activeStar.id ||
                    activeStar.connectedTo.includes(a) ||
                    activeStar.connectedTo.includes(b));

                return (
                  <line
                    key={`${a}-${b}`}
                    className={`connection-line is-flowing ${
                      isActive ? 'is-active' : activeStar ? 'is-dimmed' : 'is-glowing'
                    }`}
                    x1={s1.x}
                    y1={s1.y}
                    x2={s2.x}
                    y2={s2.y}
                  />
                );
              })}
          </svg>

          {state.stars.map((star) => {
            const connected = !!activeStar && activeStar.connectedTo.includes(star.id);
            const chapterFocused = state.phase === 'cluster' && star.chapterId === state.activeChapterId;
            const dimmed = !!activeStar && star.id !== activeStar.id && !connected;

            return (
              <button
                key={star.id}
                type="button"
                className={getStateClasses(star.state, connected, chapterFocused, dimmed)}
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                }}
                aria-label={`${star.title}, ${star.emotion}, ${star.state}`}
                onClick={() => {
                  dispatch({ type: 'FOCUS_STAR', starId: star.id });

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
                <span>{star.title}</span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="panel export-panel" aria-label="Export panel">
        <button type="button">Export snapshot</button>
        <button type="button">Export arc</button>
      </aside>

      <aside className="panel companion-panel" aria-label="Narrator controls">
        <h2>Companion</h2>
        <p aria-live="polite">{activeMessage?.text ?? ''}</p>

        <div className="toggle-row">
          <button
            type="button"
            className={state.voiceEnabled ? 'is-on' : ''}
            onClick={() => dispatch({ type: 'SET_VOICE_ENABLED', value: !state.voiceEnabled })}
          >
            Voice {state.voiceEnabled ? 'On' : 'Off'}
          </button>

          <button
            type="button"
            className={state.hapticsEnabled ? 'is-on' : ''}
            onClick={() => dispatch({ type: 'SET_HAPTICS_ENABLED', value: !state.hapticsEnabled })}
          >
            Haptics {state.hapticsEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <small>Channels: {activeMessage?.channels.length ? activeMessage.channels.join(' / ') : 'visual'}</small>
      </aside>

      {activeStar && (
        <aside className="panel detail-panel" aria-live="polite">
          <h3>{activeStar.title}</h3>
          <p>
            {activeStar.emotion} - {CHAPTERS.find((chapter) => chapter.id === activeStar.chapterId)?.title}
          </p>
          <p>{activeStar.narratorLine}</p>

          <div className="actions">
            <button
              type="button"
              onClick={() => {
                dispatch({
                  type: 'PUSH_MESSAGE',
                  msg: createMessage('replay', 'Replaying the emotional thread.', 16000, [
                    'visual',
                    'voice',
                    'haptic',
                  ]),
                });

                emitNarratorEvent({
                  event: 'lifemap.star.replay',
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
                  type: 'PUSH_MESSAGE',
                  msg: createMessage('reflect', 'Reflection mode is open.', 16000, [
                    'visual',
                    'voice',
                    'haptic',
                  ]),
                });

                emitNarratorEvent({
                  event: 'lifemap.star.reflect',
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
                dispatch({ type: 'MARK_RESOLVED', starId: activeStar.id });

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
        {CHAPTERS.map((chapter) => (
          <button
            type="button"
            key={chapter.id}
            className={`chapter-pill ${state.activeChapterId === chapter.id ? 'active' : ''}`}
            onClick={() => {
              const camera = computeChapterCamera(state.stars, chapter.id);

              dispatch({
                type: 'FOCUS_CLUSTER',
                chapterId: chapter.id,
                camera,
                text: CHAPTER_LINES[chapter.id],
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
        ))}
      </nav>

      <style jsx>{`
        .life-map-shell {
          min-height: 100vh;
          background: radial-gradient(circle at 50% 28%, #26366d, #0a0f20 58%, #05060f 100%);
          color: #eef3ff;
          position: relative;
          padding: 1rem;
          overflow: hidden;
        }

        .lifemap-space {
          position: absolute;
          inset: 0 0 120px;
        }

        .lifemap-space.is-focused {
          filter: blur(0.2px) saturate(1.05);
        }

        .starfield {
          position: absolute;
          inset: 0;
          transform: translate(calc(50% - var(--camera-x)), calc(50% - var(--camera-y)))
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
          background: radial-gradient(circle, #f8fbff 0%, #b4ceff 48%, #779dff 100%);
          color: #071022;
          font-weight: 700;
          display: grid;
          place-items: center;
          box-shadow:
            0 0 10px rgba(255, 255, 255, 0.75),
            0 0 24px rgba(120, 170, 255, 0.45);
          transition:
            opacity 0.4s ease,
            transform 0.4s ease,
            box-shadow 0.4s ease;
          cursor: pointer;
        }

        .memory-star span {
          font-size: 0.58rem;
          max-width: 80px;
          line-height: 1.05;
          pointer-events: none;
        }

        .memory-star.state-glowing {
          animation: starPulse 2.8s ease-in-out infinite;
          box-shadow:
            0 0 14px rgba(255, 255, 255, 0.95),
            0 0 36px rgba(120, 170, 255, 0.7),
            0 0 72px rgba(120, 170, 255, 0.35);
        }

        .memory-star.state-active {
          transform: translate(-50%, -50%) scale(1.22);
          z-index: 3;
          box-shadow:
            0 0 20px rgba(255, 255, 255, 1),
            0 0 54px rgba(120, 170, 255, 0.8),
            0 0 110px rgba(120, 170, 255, 0.45);
        }

        .memory-star.state-resolved {
          background: radial-gradient(circle, #f4fff9 0%, #b7ffe5 52%, #77d9c3 100%);
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

        .panel {
          position: absolute;
          background: rgba(7, 10, 25, 0.75);
          border: 1px solid rgba(157, 196, 255, 0.32);
          border-radius: 14px;
          padding: 0.85rem;
          backdrop-filter: blur(8px);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22);
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
          width: 310px;
        }

        .companion-panel p {
          margin: 0.5rem 0 0.7rem;
          line-height: 1.45;
        }

        .toggle-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.55rem;
        }

        .detail-panel {
          right: 1rem;
          top: 180px;
          width: 320px;
        }

        .actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 0.75rem;
        }

        button {
          border: 1px solid rgba(180, 215, 255, 0.42);
          background: rgba(18, 31, 68, 0.82);
          color: #eef3ff;
          border-radius: 999px;
          padding: 0.48rem 0.72rem;
        }

        button:hover {
          border-color: rgba(220, 240, 255, 0.82);
        }

        button.is-on {
          background: rgba(110, 170, 255, 0.32);
          border-color: rgba(190, 225, 255, 0.88);
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
          padding: 0.56rem 0.75rem;
          text-align: left;
        }

        .chapter-pill.active {
          border-color: #b9d7ff;
          box-shadow: 0 0 18px rgba(125, 211, 252, 0.35);
        }

        .chapter-pill small {
          display: block;
          opacity: 0.8;
          margin-top: 0.16rem;
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
        }

        @media (max-width: 900px) {
          .chapter-row {
            grid-template-columns: 1fr;
          }

          .companion-panel,
          .detail-panel {
            left: 1rem;
            right: 1rem;
            width: auto;
          }

          .detail-panel {
            top: 210px;
          }
        }
      `}</style>
    </main>
  );
}
'use client';

import { useEffect, useMemo, useReducer } from 'react';

type StarState = 'idle' | 'glowing' | 'active' | 'resolved';
type MemoryEmotion = 'calm' | 'joy' | 'grief' | 'focus' | 'threshold' | 'recovery' | 'dream' | 'mirror' | 'shadow';
type ChapterId = 'season-of-becoming' | 'threshold' | 'recovery-arc' | 'purple-dream-field' | 'mirror-of-becoming';

type PersistedStarState = {
  resolvedAt: number | null;
  lastActivatedAt: number | null;
};

type MemoryStar = {
  id: string;
  title: string;
  subtitle: string;
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
  detail: string;
  connectedTo: string[];
};

type LifeMapPhase = 'living' | 'focus' | 'cluster';
type LifeMapCamera = { x: number; y: number; zoom: number };

type LifeMapState = {
  stars: MemoryStar[];
  activeStarId: string | null;
  activeChapterId: ChapterId | null;
  camera: LifeMapCamera;
  companionLine: string;
  phase: LifeMapPhase;
  reducedMotion: boolean;
};

type Action =
  | { type: 'SET_REDUCED_MOTION'; value: boolean }
  | { type: 'SET_GLOWING_STARS'; ids: string[] }
  | { type: 'FOCUS_STAR'; starId: string; activatedAt: number }
  | { type: 'FOCUS_CLUSTER'; chapterId: ChapterId; camera: LifeMapCamera; companionLine: string }
  | { type: 'MARK_RESOLVED'; starId: string; resolvedAt: number }
  | { type: 'REHYDRATE_PERSISTENCE'; persisted: Record<string, PersistedStarState> }
  | { type: 'CLEAR_FOCUS' };

const CHAPTERS: Record<ChapterId, { label: string; line: string; camera: LifeMapCamera }> = {
  'season-of-becoming': {
    label: 'Season of Becoming',
    line: 'This cluster is where the system learned Adam’s rhythm: calm signals, bright moves, and the first usable pattern loop.',
    camera: { x: 24, y: 26, zoom: 1.35 },
  },
  threshold: {
    label: 'Threshold Gate',
    line: 'This is the pressure gate. Shadow, grief, and choice collapse into one readable turning point.',
    camera: { x: 49, y: 29, zoom: 1.45 },
  },
  'recovery-arc': {
    label: 'Recovery Arc',
    line: 'The rebound is visible here: energy returns, execution sharpens, and joy starts connecting back to focus.',
    camera: { x: 72, y: 29, zoom: 1.35 },
  },
  'purple-dream-field': {
    label: 'Purple Dream Field',
    line: 'Dream-state memory belongs here once passive sleep, voice, and symbolic replay signals are live.',
    camera: { x: 42, y: 58, zoom: 1.2 },
  },
  'mirror-of-becoming': {
    label: 'Mirror of Becoming',
    line: 'The finale mirror will synthesize the whole map into one cinematic identity replay.',
    camera: { x: 58, y: 54, zoom: 1.2 },
  },
};

const INITIAL_STARS: MemoryStar[] = [
  {
    id: 'star-memory-map',
    title: 'Memory Map',
    subtitle: 'First usable sky timeline',
    x: 16,
    y: 22,
    chapterId: 'season-of-becoming',
    emotion: 'calm',
    narratorLine: 'The map is no longer an idea. It is a place the user can enter.',
    detail: 'Sky tap opens the life map. Stars are now meaningful UI nodes instead of decorative background particles.',
  },
  {
    id: 'star-demo-route',
    title: 'Adam Demo Route',
    subtitle: '/u/adamclamp proof path',
    x: 28,
    y: 19,
    chapterId: 'season-of-becoming',
    emotion: 'joy',
    narratorLine: 'The public demo has to feel alive before the rest of the world sees it.',
    detail: 'This star represents the launch-critical public route, demo data, and clean no-auth preview state.',
  },
  {
    id: 'star-coding-flow',
    title: 'Coding Flow',
    subtitle: 'Lock the green path',
    x: 22,
    y: 34,
    chapterId: 'season-of-becoming',
    emotion: 'focus',
    narratorLine: 'Build, typecheck, smoke, deploy: the ritual is the product now.',
    detail: 'This star keeps the launch loop visible: compile, route smoke, Firebase preflight, and regression guard.',
  },
  {
    id: 'star-shadow-backlog',
    title: 'Shadow Backlog',
    subtitle: 'Expansion pressure',
    x: 37,
    y: 30,
    chapterId: 'threshold',
    emotion: 'shadow',
    narratorLine: 'The system is strongest when expansion stops long enough for the core to harden.',
    detail: 'This star marks the difference between feature dreaming and production lock. It should pull attention back to P0.',
  },
  {
    id: 'star-grief-signal',
    title: 'Grief Signal',
    subtitle: 'Sensitive-state safety',
    x: 48,
    y: 24,
    chapterId: 'threshold',
    emotion: 'grief',
    narratorLine: 'A real life map must treat heavy memories gently, not gamify pain.',
    detail: 'This star reserves space for trauma-safe copy, reduced-motion UX, and private-by-default replay controls.',
  },
  {
    id: 'star-threshold-mode',
    title: 'Threshold Mode',
    subtitle: 'Major life transition layer',
    x: 56,
    y: 31,
    chapterId: 'threshold',
    emotion: 'threshold',
    narratorLine: 'A threshold is not a failure. It is a doorway the app needs to recognize.',
    detail: 'This star anchors the crisis/transition state machine: low-friction support, quiet visuals, and non-invasive narration.',
  },
  {
    id: 'star-recovery-bloom',
    title: 'Recovery Bloom',
    subtitle: 'Rebound made visible',
    x: 65,
    y: 20,
    chapterId: 'recovery-arc',
    emotion: 'recovery',
    narratorLine: 'Recovery is visible when the system remembers the user came back.',
    detail: 'This star will become the bloom overlay after a difficult state resolves and healthier rhythm returns.',
  },
  {
    id: 'star-life-pattern',
    title: 'Life Pattern',
    subtitle: 'Meta-insight engine',
    x: 72,
    y: 28,
    chapterId: 'recovery-arc',
    emotion: 'focus',
    narratorLine: 'The next unlock is synthesis: not more logs, but meaning across logs.',
    detail: 'This star represents recurring behavior detection across mood, place, audio, routines, relationships, and time.',
  },
  {
    id: 'star-launch-bloom',
    title: 'Launch Bloom',
    subtitle: 'Public proof moment',
    x: 79,
    y: 37,
    chapterId: 'recovery-arc',
    emotion: 'joy',
    narratorLine: 'The world only needs one working magical path to understand the product.',
    detail: 'This star is the launch demo spine: beautiful route, sample stars, companion line, privacy, and waitlist.',
  },
].map((star, idx, list) => ({
  ...star,
  size: 16 + (idx % 5) * 2,
  state: idx === 0 || idx === list.length - 1 ? 'glowing' as StarState : 'idle' as StarState,
  intensity: 0.55 + (idx % 4) * 0.1,
  recency: Math.max(0.2, 1 - idx * 0.075),
  unresolvedWeight: idx >= 3 && idx <= 5 ? 0.85 : 0.45,
  lastActivatedAt: null,
  resolvedAt: null,
  connectedTo: idx === 0 ? ['star-demo-route', 'star-coding-flow'] : idx < list.length - 1 ? [list[idx + 1].id] : ['star-memory-map'],
}));

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
    const current = raw ? JSON.parse(raw) : {};
    const prev = current[starId] ?? { resolvedAt: null, lastActivatedAt: null };
    current[starId] = { ...prev, ...values };
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(current));
  } catch {
    // Local persistence is progressive enhancement only.
  }
}

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
            : { ...s, state: action.ids.includes(s.id) ? 'glowing' : 'idle' }
        ),
      };

    case 'FOCUS_STAR': {
      const star = state.stars.find((s) => s.id === action.starId);
      if (!star) return state;

      return {
        ...state,
        activeStarId: star.id,
        activeChapterId: star.chapterId,
        phase: 'focus',
        camera: { x: star.x, y: star.y, zoom: 1.8 },
        companionLine: star.narratorLine,
        stars: state.stars.map((s) =>
          s.id === star.id
            ? { ...s, state: 'active', lastActivatedAt: action.activatedAt }
            : s.state === 'resolved'
              ? s
              : { ...s, state: star.connectedTo.includes(s.id) ? 'glowing' : 'idle' }
        ),
      };
    }

    case 'FOCUS_CLUSTER':
      return {
        ...state,
        activeStarId: null,
        activeChapterId: action.chapterId,
        phase: 'cluster',
        camera: action.camera,
        companionLine: action.companionLine,
        stars: state.stars.map((s) =>
          s.state === 'resolved'
            ? s
            : { ...s, state: s.chapterId === action.chapterId ? 'glowing' : 'idle' }
        ),
      };

    case 'MARK_RESOLVED':
      return {
        ...state,
        stars: state.stars.map((s) =>
          s.id === action.starId
            ? { ...s, state: 'resolved', resolvedAt: action.resolvedAt }
            : s
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

    case 'CLEAR_FOCUS':
      return {
        ...state,
        activeStarId: null,
        activeChapterId: null,
        camera: { x: 50, y: 50, zoom: 1 },
        companionLine: 'Sky tap opened the map. Pick a star and the companion will narrate the memory thread.',
        phase: 'living',
        stars: state.stars.map((s, idx) =>
          s.state === 'resolved'
            ? s
            : { ...s, state: idx === 0 || idx === state.stars.length - 1 ? 'glowing' : 'idle' }
        ),
      };

    default:
      return state;
  }
}

function formatDate(timestamp: number | null) {
  if (!timestamp) return 'Not opened yet';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(timestamp);
}

export default function LifeMapCanonicalSurface() {
  const [state, dispatch] = useReducer(reducer, {
    stars: INITIAL_STARS,
    activeStarId: null,
    activeChapterId: null,
    camera: { x: 50, y: 50, zoom: 1 },
    companionLine: 'Sky tap opened the map. Pick a star and the companion will narrate the memory thread.',
    phase: 'living',
    reducedMotion: false,
  });

  useEffect(() => {
    dispatch({ type: 'REHYDRATE_PERSISTENCE', persisted: loadPersistence() });

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    dispatch({ type: 'SET_REDUCED_MOTION', value: media.matches });

    const onChange = (event: MediaQueryListEvent) => {
      dispatch({ type: 'SET_REDUCED_MOTION', value: event.matches });
    };

    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  const activeStar = useMemo(
    () => state.stars.find((star) => star.id === state.activeStarId) ?? null,
    [state.activeStarId, state.stars]
  );

  const activeChapter = state.activeChapterId ? CHAPTERS[state.activeChapterId] : null;
  const resolvedCount = state.stars.filter((star) => star.resolvedAt).length;
  const openCount = state.stars.length - resolvedCount;

  return (
    <main className={`life-map-shell ${state.reducedMotion ? 'life-map-shell--reduced-motion' : ''}`} aria-label="URAI symbolic life map">
      <section className="life-map-hero" aria-label="URAI launch life map status">
        <div className="life-map-copy">
          <p className="life-map-eyebrow">URAI Spatial / Launch Lock</p>
          <h1>Adam’s Life Map is live enough to code against.</h1>
          <p>
            This surface turns the sky into a shippable MVP: demo stars, companion narration, persistent focus state, cluster zooms,
            reduced-motion fallback, and a visible Memory Bloom panel.
          </p>
        </div>

        <div className="life-map-status-grid" aria-label="Launch status counters">
          <div>
            <strong>{state.stars.length}</strong>
            <span>memory stars</span>
          </div>
          <div>
            <strong>{openCount}</strong>
            <span>open threads</span>
          </div>
          <div>
            <strong>{resolvedCount}</strong>
            <span>resolved blooms</span>
          </div>
          <div>
            <strong>{state.phase}</strong>
            <span>map phase</span>
          </div>
        </div>
      </section>

      <section className="life-map-stage" aria-label="Interactive starfield timeline">
        <div
          className="life-map-sky"
          style={{
            '--camera-x': `${state.camera.x}%`,
            '--camera-y': `${state.camera.y}%`,
            '--camera-zoom': String(state.camera.zoom),
          } as React.CSSProperties}
        >
          <div className="life-map-constellation" aria-hidden="true" />
          {state.stars.map((star) => (
            <button
              key={star.id}
              type="button"
              className={`life-map-star life-map-star--${star.emotion} life-map-star--${star.state}`}
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                '--star-intensity': star.intensity,
              } as React.CSSProperties}
              aria-label={`Open ${star.title}: ${star.subtitle}`}
              onClick={() => {
                const now = Date.now();
                dispatch({ type: 'FOCUS_STAR', starId: star.id, activatedAt: now });
                savePersistence(star.id, { lastActivatedAt: now });
              }}
            >
              <span>{star.title.slice(0, 1)}</span>
            </button>
          ))}
        </div>

        <aside className="life-map-panel" aria-label="Memory Bloom panel">
          <div className="life-map-companion">
            <span className="life-map-orb" aria-hidden="true" />
            <p>{state.companionLine}</p>
          </div>

          {activeStar ? (
            <article className="life-map-bloom-card">
              <p className="life-map-eyebrow">Memory Bloom</p>
              <h2>{activeStar.title}</h2>
              <h3>{activeStar.subtitle}</h3>
              <p>{activeStar.detail}</p>
              <dl>
                <div>
                  <dt>Emotion</dt>
                  <dd>{activeStar.emotion}</dd>
                </div>
                <div>
                  <dt>Chapter</dt>
                  <dd>{CHAPTERS[activeStar.chapterId].label}</dd>
                </div>
                <div>
                  <dt>Last opened</dt>
                  <dd>{formatDate(activeStar.lastActivatedAt)}</dd>
                </div>
              </dl>
              <div className="life-map-actions">
                <button
                  type="button"
                  onClick={() => {
                    const now = Date.now();
                    dispatch({ type: 'MARK_RESOLVED', starId: activeStar.id, resolvedAt: now });
                    savePersistence(activeStar.id, { resolvedAt: now });
                  }}
                >
                  Mark bloom resolved
                </button>
                <button type="button" onClick={() => dispatch({ type: 'CLEAR_FOCUS' })}>
                  Return to sky
                </button>
              </div>
            </article>
          ) : (
            <article className="life-map-bloom-card life-map-bloom-card--empty">
              <p className="life-map-eyebrow">Ready</p>
              <h2>{activeChapter ? activeChapter.label : 'Choose a star'}</h2>
              <p>{activeChapter ? activeChapter.line : 'Tap any glowing star to open the first shippable Memory Bloom experience.'}</p>
            </article>
          )}
        </aside>
      </section>

      <section className="life-map-chapters" aria-label="Life map chapter controls">
        {Object.entries(CHAPTERS).map(([chapterId, chapter]) => (
          <button
            key={chapterId}
            type="button"
            className={state.activeChapterId === chapterId ? 'is-active' : ''}
            onClick={() => dispatch({
              type: 'FOCUS_CLUSTER',
              chapterId: chapterId as ChapterId,
              camera: chapter.camera,
              companionLine: chapter.line,
            })}
          >
            <span>{chapter.label}</span>
            <small>{chapter.line}</small>
          </button>
        ))}
      </section>
    </main>
  );
}

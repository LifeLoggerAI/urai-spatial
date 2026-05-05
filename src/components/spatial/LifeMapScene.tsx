'use client';

import { useEffect, useMemo, useReducer } from 'react';

type StarState = 'idle' | 'glowing' | 'active' | 'resolved';
type MemoryEmotion = 'calm' | 'joy' | 'grief' | 'focus' | 'threshold' | 'recovery' | 'dream' | 'mirror' | 'shadow';
type ChapterId = 'season-of-becoming' | 'threshold' | 'recovery-arc' | 'purple-dream-field' | 'mirror-of-becoming';

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
  narratorLine: string;
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
  | { type: 'FOCUS_STAR'; starId: string }
  | { type: 'FOCUS_CLUSTER'; chapterId: ChapterId; companionLine: string }
  | { type: 'MARK_RESOLVED'; starId: string }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'SET_COMPANION_LINE'; line: string };

const CHAPTERS = [
  { id: 'season-of-becoming', title: 'The Season of Becoming', subtitle: 'memory / calm / clarity' },
  { id: 'threshold', title: 'The Threshold', subtitle: 'conflict / shadow / pain' },
  { id: 'recovery-arc', title: 'The Recovery Arc', subtitle: 'recovery / growth / purpose' },
  { id: 'purple-dream-field', title: 'The Purple Dream Field', subtitle: 'dream / mystery / milestone' },
  { id: 'mirror-of-becoming', title: 'Mirror of Becoming', subtitle: 'rebirth / clarity / purpose' },
] as const;

const CHAPTER_LINES: Record<ChapterId, string> = {
  threshold: 'The threshold is where the pattern became visible.',
  'recovery-arc': 'The recovery arc is still growing.',
  'mirror-of-becoming': 'The mirror is showing who you are becoming.',
  'season-of-becoming': 'This season is asking to be understood.',
  'purple-dream-field': 'The dream field is speaking in symbols.',
};

const GLOW_LINES = [
  'Something is asking to be seen.',
  'This memory is carrying weight.',
  'A pattern is lighting up.',
  'This moment connects to something older.',
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
].map((s, idx) => ({
  id: `star-${s[0]}-${idx}`,
  title: String(s[0]),
  x: Number(s[1]),
  y: Number(s[2]),
  chapterId: s[3] as ChapterId,
  emotion: s[4] as MemoryEmotion,
  size: 16 + (idx % 5),
  state: 'idle' as StarState,
  intensity: 0.5,
  recency: 0.5,
  unresolvedWeight: 0.5,
  lastActivatedAt: null,
  narratorLine: `${s[0]} carries a thread that still matters.`,
  connectedTo: [],
}));

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

    case 'FOCUS_STAR':
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
          s.id === star.id ? { ...s, state: 'active' } : s
        ),
      };

    case 'FOCUS_CLUSTER':
      return {
        ...state,
        phase: 'cluster',
        activeChapterId: action.chapterId,
        activeStarId: null,
        companionLine: action.companionLine,
      };

    case 'MARK_RESOLVED':
      return {
        ...state,
        stars: state.stars.map((s) =>
          s.id === action.starId ? { ...s, state: 'resolved' } : s
        ),
        companionLine: 'This one has softened.',
      };

    case 'CLEAR_FOCUS':
      return {
        ...state,
        phase: 'living',
        activeStarId: null,
        activeChapterId: null,
        camera: { x: 50, y: 50, zoom: 1 },
      };

    case 'SET_COMPANION_LINE':
      return { ...state, companionLine: action.line };

    default:
      return state;
  }
}

export default function LifeMapScene() {
  const [state, dispatch] = useReducer(reducer, {
    stars: INITIAL_STARS,
    activeStarId: null,
    activeChapterId: null,
    camera: { x: 50, y: 50, zoom: 1 },
    companionLine: 'A recurring memory pattern appeared.',
    phase: 'living',
    reducedMotion: false,
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () =>
      dispatch({ type: 'SET_REDUCED_MOTION', value: mq.matches });
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const activeStar = state.stars.find((s) => s.id === state.activeStarId);

  return (
    <main className="life-map-shell">
      <div>
        {state.stars.map((star) => (
          <button
            key={star.id}
            onClick={() => dispatch({ type: 'FOCUS_STAR', starId: star.id })}
          >
            {star.title}
          </button>
        ))}
      </div>

      {activeStar && (
        <div>
          <h3>{activeStar.title}</h3>
          <button onClick={() => dispatch({ type: 'MARK_RESOLVED', starId: activeStar.id })}>
            Resolve
          </button>
        </div>
      )}
    </main>
  );
}
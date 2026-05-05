'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';

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
  | { type: 'FOCUS_CLUSTER'; chapterId: ChapterId; camera: LifeMapCamera; companionLine: string }
  | { type: 'MARK_RESOLVED'; starId: string; resolvedAt: number }
  | { type: 'REHYDRATE_PERSISTENCE'; persisted: Record<string, PersistedStarState> }
  | { type: 'SET_CAMERA'; camera: LifeMapCamera }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'SET_COMPANION_LINE'; line: string };

/* =========================
   INITIAL DATA
   ========================= */

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
  resolvedAt: null,
  narratorLine: `${s[0]} carries a thread that still matters.`,
  connectedTo: [],
}));

/* =========================
   PERSISTENCE
   ========================= */

const PERSIST_KEY = 'urai.lifemap.star.persistence.v1';

function loadPersistence(): Record<string, PersistedStarState> {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePersistence(starId: string, values: Partial<PersistedStarState>) {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    const current = raw ? JSON.parse(raw) : {};
    const prev = current[starId] ?? { resolvedAt: null, lastActivatedAt: null };
    current[starId] = { ...prev, ...values };
    localStorage.setItem(PERSIST_KEY, JSON.stringify(current));
  } catch {}
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
          s.id === star.id ? { ...s, state: 'active' } : s
        ),
      };
    }

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
    companionLine: 'A recurring memory pattern appeared.',
    phase: 'living',
    reducedMotion: false,
  });

  useEffect(() => {
    dispatch({
      type: 'REHYDRATE_PERSISTENCE',
      persisted: loadPersistence(),
    });
  }, []);

  return (
    <main className="life-map-shell">
      <div>
        {state.stars.map((star) => (
          <button
            key={star.id}
            onClick={() => {
              const now = Date.now();
              dispatch({ type: 'FOCUS_STAR', starId: star.id });
              savePersistence(star.id, { lastActivatedAt: now });
            }}
          >
            {star.title}
          </button>
        ))}
      </div>
    </main>
  );
}
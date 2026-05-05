'use client';

import { useEffect, useMemo, useReducer, useRef } from 'react';
import {
  chooseGlowingStars,
  createSeededRandom,
  type GlowHistoryEntry
} from './lifeMapGlowScheduler';

import {
  INITIAL_STARS,
  CHAPTERS,
  CHAPTER_LINES,
  GLOW_LINES,
  computeChapterCamera,
  getStateClasses,
  reducedMotionLoopDelay,
  type MemoryStar,
  type ChapterId,
  type LifeMapCamera,
  type LifeMapPhase
} from './lifemapSceneLogic';

import { detectLifeMapPatterns } from './lifeMapPatternEngine';

/* ---- MESSAGE SYSTEM (unchanged core) ---- */

type NarratorChannel = 'visual' | 'voice' | 'haptic';
type MessageSource = 'focus' | 'resolved' | 'cluster' | 'glow' | 'default';

/* ---- STATE ---- */

type State = {
  stars: MemoryStar[];
  activeStarId: string | null;
  activeChapterId: ChapterId | null;
  camera: LifeMapCamera;
  phase: LifeMapPhase;
  reducedMotion: boolean;
};

function reducer(state: State, action: any): State {
  switch (action.type) {
    case 'SET_GLOWING_STARS':
      return {
        ...state,
        stars: state.stars.map(s =>
          action.ids.includes(s.id)
            ? { ...s, state: 'glowing', lastActivatedAt: Date.now() }
            : s.state === 'glowing'
            ? { ...s, state: 'idle' }
            : s
        )
      };

    case 'FOCUS_STAR': {
      const star = state.stars.find(s => s.id === action.starId);
      if (!star) return state;
      return {
        ...state,
        activeStarId: star.id,
        activeChapterId: star.chapterId,
        phase: 'focus',
        camera: { x: star.x, y: star.y, zoom: 1.8 }
      };
    }

    case 'FOCUS_CLUSTER':
      return {
        ...state,
        phase: 'cluster',
        activeStarId: null,
        activeChapterId: action.chapterId,
        camera: action.camera
      };

    case 'CLEAR_FOCUS':
      return {
        ...state,
        phase: 'living',
        activeStarId: null,
        activeChapterId: null,
        camera: { x: 50, y: 50, zoom: 1 }
      };

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
    phase: 'living',
    reducedMotion: false
  });

  const glowHistoryRef = useRef<GlowHistoryEntry[]>([]);
  const tickRef = useRef(0);
  const rngRef = useRef(createSeededRandom(90210));

  useEffect(() => {
    let timer = 0;

    const run = () => {
      const picked = chooseGlowingStars(
        state.stars.filter(s => s.id !== state.activeStarId),
        glowHistoryRef.current,
        {
          count: 1 + Math.floor(rngRef.current() * 3),
          tick: tickRef.current,
          minTicksBetweenGlows: 2,
          repeatWindowTicks: 6,
          maxRepeatsPerWindow: 2
        },
        rngRef.current
      );

      dispatch({ type: 'SET_GLOWING_STARS', ids: picked });

      const insights = detectLifeMapPatterns(state.stars, glowHistoryRef.current);
      insights.forEach(i => console.log('Pattern:', i.message));

      glowHistoryRef.current = [...glowHistoryRef.current.slice(-20), { tick: tickRef.current, ids: picked }];
      tickRef.current++;

      timer = window.setTimeout(run, reducedMotionLoopDelay(state.reducedMotion));
    };

    timer = window.setTimeout(run, 9000);
    return () => clearTimeout(timer);
  }, [state.stars, state.activeStarId]);

  const starById = useMemo(() => new Map(state.stars.map(s => [s.id, s])), [state.stars]);

  return (
    <main className="life-map-shell">
      <div className="starfield">
        {state.stars.map(star => {
          const connected = false;
          const chapterFocused = state.phase === 'cluster' && star.chapterId === state.activeChapterId;
          const dimmed = false;

          return (
            <button
              key={star.id}
              className={getStateClasses(star.state, connected, chapterFocused, dimmed)}
              style={{ left: `${star.x}%`, top: `${star.y}%` }}
              onClick={() => dispatch({ type: 'FOCUS_STAR', starId: star.id })}
            >
              {star.title}
            </button>
          );
        })}
      </div>

      <nav>
        {CHAPTERS.map(ch => (
          <button
            key={ch.id}
            onClick={() => {
              const camera = computeChapterCamera(state.stars, ch.id);
              dispatch({ type: 'FOCUS_CLUSTER', chapterId: ch.id, camera });
            }}
          >
            {ch.title}
          </button>
        ))}
      </nav>
    </main>
  );
}

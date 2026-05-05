'use client';

import { useEffect, useMemo, useReducer } from 'react';
import {
  computeChapterCamera,
  getStateClasses,
  pickGlowingStars,
  reducedMotionLoopDelay,
  type ChapterId,
  type LifeMapCamera,
  type LifeMapPhase,
  type MemoryEmotion,
  type MemoryStar
} from './lifemapSceneLogic';

/* -------------------- MESSAGE SYSTEM -------------------- */

type MessageSource = 'focus' | 'resolved' | 'cluster' | 'glow' | 'default';

type MessageEnvelope = {
  id: string;
  source: MessageSource;
  priority: number;
  text: string;
  createdAt: number;
  expiresAt: number | null;
};

const SOURCE_PRIORITY: Record<MessageSource, number> = {
  focus: 5,
  resolved: 4,
  cluster: 3,
  glow: 2,
  default: 1
};

const SOURCE_COOLDOWN: Record<MessageSource, number> = {
  focus: 0,
  resolved: 2000,
  cluster: 3000,
  glow: 5000,
  default: 0
};

type MessageState = {
  queue: MessageEnvelope[];
  lastBySource: Partial<Record<MessageSource, number>>;
  lastText: string | null;
};

function createMessage(
  source: MessageSource,
  text: string,
  ttl: number | null
): MessageEnvelope {
  const now = Date.now();
  return {
    id: `${source}-${now}-${Math.random()}`,
    source,
    priority: SOURCE_PRIORITY[source],
    text,
    createdAt: now,
    expiresAt: ttl ? now + ttl : null
  };
}

function pushMessage(state: MessageState, msg: MessageEnvelope): MessageState {
  const now = Date.now();

  // cooldown check
  const last = state.lastBySource[msg.source] ?? 0;
  if (now - last < SOURCE_COOLDOWN[msg.source]) return state;

  // dedupe (avoid repeating same text)
  if (state.lastText === msg.text) return state;

  const nextQueue = [...state.queue, msg].sort(
    (a, b) => b.priority - a.priority || b.createdAt - a.createdAt
  );

  return {
    queue: nextQueue.slice(0, 5), // cap queue size
    lastBySource: { ...state.lastBySource, [msg.source]: now },
    lastText: msg.text
  };
}

function pruneMessages(state: MessageState): MessageState {
  const now = Date.now();
  return {
    ...state,
    queue: state.queue.filter(
      (m) => m.expiresAt === null || m.expiresAt > now
    )
  };
}

function getActiveMessage(state: MessageState): string {
  return state.queue[0]?.text ?? '';
}

/* -------------------- CORE -------------------- */

type State = {
  stars: MemoryStar[];
  activeStarId: string | null;
  activeChapterId: ChapterId | null;
  camera: LifeMapCamera;
  messages: MessageState;
  phase: LifeMapPhase;
  reducedMotion: boolean;
};

type Action =
  | { type: 'SET_REDUCED_MOTION'; value: boolean }
  | { type: 'SET_GLOWING_STARS'; ids: string[] }
  | { type: 'FOCUS_STAR'; starId: string }
  | { type: 'FOCUS_CLUSTER'; chapterId: ChapterId; camera: LifeMapCamera; text: string }
  | { type: 'MARK_RESOLVED'; starId: string }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'PUSH_MESSAGE'; msg: MessageEnvelope }
  | { type: 'PRUNE_MESSAGES' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_REDUCED_MOTION':
      return { ...state, reducedMotion: action.value };

    case 'SET_GLOWING_STARS':
      return {
        ...state,
        stars: state.stars.map((s) =>
          s.id === state.activeStarId || s.state === 'resolved'
            ? s
            : { ...s, state: action.ids.includes(s.id) ? 'glowing' : 'idle' }
        )
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
        messages: pushMessage(
          state.messages,
          createMessage('focus', star.narratorLine, null)
        )
      };
    }

    case 'FOCUS_CLUSTER':
      return {
        ...state,
        phase: 'cluster',
        activeStarId: null,
        activeChapterId: action.chapterId,
        camera: action.camera,
        messages: pushMessage(
          state.messages,
          createMessage('cluster', action.text, 18000)
        )
      };

    case 'MARK_RESOLVED':
      return {
        ...state,
        stars: state.stars.map((s) =>
          s.id === action.starId ? { ...s, state: 'resolved' } : s
        ),
        messages: pushMessage(
          state.messages,
          createMessage('resolved', 'This one has softened.', null)
        )
      };

    case 'CLEAR_FOCUS':
      return {
        ...state,
        phase: 'living',
        activeStarId: null,
        activeChapterId: null,
        camera: { x: 50, y: 50, zoom: 1 }
      };

    case 'PUSH_MESSAGE':
      return { ...state, messages: pushMessage(state.messages, action.msg) };

    case 'PRUNE_MESSAGES':
      return { ...state, messages: pruneMessages(state.messages) };
  }
}

/* -------------------- COMPONENT -------------------- */

export default function LifeMapScene() {
  const [state, dispatch] = useReducer(reducer, {
    stars: [],
    activeStarId: null,
    activeChapterId: null,
    camera: { x: 50, y: 50, zoom: 1 },
    phase: 'living',
    reducedMotion: false,
    messages: { queue: [], lastBySource: {}, lastText: null }
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () =>
      dispatch({ type: 'SET_REDUCED_MOTION', value: mq.matches });
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /* glow loop */
  useEffect(() => {
    let timer = 0;

    const run = () => {
      const picked = pickGlowingStars(
        state.stars,
        state.activeStarId,
        Math.random
      );

      dispatch({ type: 'SET_GLOWING_STARS', ids: picked });

      dispatch({
        type: 'PUSH_MESSAGE',
        msg: createMessage(
          'glow',
          GLOW_LINES[Math.floor(Math.random() * GLOW_LINES.length)],
          12000
        )
      });

      dispatch({ type: 'PRUNE_MESSAGES' });

      timer = window.setTimeout(
        run,
        reducedMotionLoopDelay(state.reducedMotion, Math.random)
      );
    };

    timer = window.setTimeout(run, 9000);
    return () => clearTimeout(timer);
  }, [state.stars, state.activeStarId, state.reducedMotion]);

  const activeMessage = getActiveMessage(state.messages);

  /* -------------------- UI -------------------- */

  return (
    <main className="life-map-shell">
      <aside className="panel companion-panel">
        <h2>Companion</h2>
        <p>{activeMessage}</p>
      </aside>
    </main>
  );
}
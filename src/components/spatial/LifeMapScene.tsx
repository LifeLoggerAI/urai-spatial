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
type FocusVisualState = { blur: number; connectedBoost: number; dimOpacity: number };

type Action =
  | { type: 'SET_REDUCED_MOTION'; value: boolean }
  | { type: 'SET_GLOWING_STARS'; ids: string[] }
  | { type: 'FOCUS_STAR'; starId: string }
  | { type: 'FOCUS_CLUSTER'; chapterId: ChapterId; camera: LifeMapCamera; companionLine: string }
  | { type: 'MARK_RESOLVED'; starId: string }
  | { type: 'SET_CAMERA'; camera: LifeMapCamera }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'SET_COMPANION_LINE'; line: string };

const CHAPTERS: Array<{ id: ChapterId; title: string; subtitle: string }> = [
  { id: 'season-of-becoming', title: 'The Season of Becoming', subtitle: 'memory / calm / clarity' },
  { id: 'threshold', title: 'The Threshold', subtitle: 'conflict / shadow / pain' },
  { id: 'recovery-arc', title: 'The Recovery Arc', subtitle: 'recovery / growth / purpose' },
  { id: 'purple-dream-field', title: 'The Purple Dream Field', subtitle: 'dream / mystery / milestone' },
  { id: 'mirror-of-becoming', title: 'Mirror of Becoming', subtitle: 'rebirth / clarity / purpose' },
];

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
  ['M', 16, 22, 'season-of-becoming', 'calm'], ['D', 28, 19, 'season-of-becoming', 'joy'], ['I', 22, 34, 'season-of-becoming', 'focus'], ['S', 37, 30, 'threshold', 'shadow'],
  ['R', 48, 24, 'threshold', 'grief'], ['T', 56, 31, 'threshold', 'threshold'], ['E', 65, 20, 'recovery-arc', 'recovery'], ['L', 72, 28, 'recovery-arc', 'focus'],
  ['V', 79, 37, 'recovery-arc', 'joy'], ['H', 68, 44, 'purple-dream-field', 'dream'], ['A', 58, 47, 'purple-dream-field', 'mirror'], ['N', 46, 43, 'purple-dream-field', 'dream'],
  ['K', 34, 45, 'threshold', 'shadow'], ['P', 24, 50, 'season-of-becoming', 'calm'], ['O', 14, 43, 'season-of-becoming', 'focus'], ['Y', 19, 63, 'mirror-of-becoming', 'mirror'],
  ['C', 31, 68, 'mirror-of-becoming', 'recovery'], ['B', 44, 66, 'mirror-of-becoming', 'joy'], ['F', 56, 63, 'mirror-of-becoming', 'focus'], ['G', 67, 66, 'mirror-of-becoming', 'mirror'],
  ['Q', 79, 61, 'recovery-arc', 'recovery'], ['U', 87, 50, 'recovery-arc', 'focus'], ['W', 86, 33, 'purple-dream-field', 'dream'], ['J', 10, 58, 'threshold', 'grief'],
].map((s, idx, arr) => ({
  id: `star-${s[0]}-${idx}`,
  title: String(s[0]),
  x: Number(s[1]),
  y: Number(s[2]),
  chapterId: s[3] as ChapterId,
  emotion: s[4] as MemoryEmotion,
  size: 16 + (idx % 5),
  state: 'idle' as StarState,
  intensity: 0.4 + ((idx * 7) % 6) / 10,
  recency: 0.3 + ((idx * 3) % 7) / 10,
  unresolvedWeight: 0.2 + ((idx * 5) % 8) / 10,
  lastActivatedAt: null,
  narratorLine: `${s[0]} carries a thread that still matters.`,
  connectedTo: [arr[(idx + 1) % arr.length][0], arr[(idx + 5) % arr.length][0]].map((l) => `star-${l}-${arr.findIndex((x) => x[0] === l)}`),
}));

function emitNarratorEvent(detail: { event: 'lifemap.star.glow' | 'lifemap.star.focus' | 'lifemap.cluster.focus' | 'lifemap.star.resolved'; starId?: string | null; chapterId?: ChapterId | null; emotion?: MemoryEmotion | null; action?: 'replay' | 'reflect' | 'resolve' }) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('urai:narrator', { detail: { ...detail, timestamp: Date.now() } }));
}

function emitTimelineSync(detail: { phase: LifeMapPhase; activeStarId?: string | null; activeChapterId?: ChapterId | null }) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('urai:timeline-sync', { detail: { mode: 'lifemap', ...detail, timestamp: Date.now() } }));
}

function applyFocusCamera(state: LifeMapState, target: { type: 'star'; starId: string } | { type: 'cluster'; chapterId: ChapterId; companionLine: string } | { type: 'context'; companionLine: string } | { type: 'clear' }): LifeMapState {
  if (target.type === 'clear') return { ...state, phase: 'living', activeStarId: null, activeChapterId: null, camera: { x: 50, y: 50, zoom: 1 }, stars: state.stars.map((s) => s.state === 'resolved' ? s : { ...s, state: 'idle' }) };
  if (target.type === 'context') return { ...state, companionLine: target.companionLine };
  if (target.type === 'cluster') {
    const stars = state.stars.filter((s) => s.chapterId === target.chapterId);
    const camera = { x: stars.reduce((a, s) => a + s.x, 0) / stars.length, y: stars.reduce((a, s) => a + s.y, 0) / stars.length, zoom: 1.45 };
    return { ...state, phase: 'cluster', activeChapterId: target.chapterId, activeStarId: null, camera, companionLine: target.companionLine };
  }
  const targetStar = state.stars.find((s) => s.id === target.starId);
  if (!targetStar) return state;
  return {
    ...state, phase: 'focus', activeStarId: targetStar.id, activeChapterId: targetStar.chapterId, camera: { x: targetStar.x, y: targetStar.y, zoom: 1.8 }, companionLine: targetStar.narratorLine,
    stars: state.stars.map((s) => s.id === targetStar.id ? { ...s, state: 'active', lastActivatedAt: Date.now() } : (s.state === 'resolved' ? s : { ...s, state: targetStar.connectedTo.includes(s.id) ? s.state : 'idle' })),
  };
}

function getFocusVisualState(state: LifeMapState): FocusVisualState {
  if (state.phase === 'focus') return { blur: 0.45, connectedBoost: 0.12, dimOpacity: 0.25 };
  if (state.phase === 'cluster') return { blur: 0.28, connectedBoost: 0.08, dimOpacity: 0.3 };
  return { blur: 0, connectedBoost: 0, dimOpacity: 1 };
}

function reducer(state: LifeMapState, action: Action): LifeMapState {
  switch (action.type) {
    case 'SET_REDUCED_MOTION': return { ...state, reducedMotion: action.value };
    case 'SET_GLOWING_STARS':
      return { ...state, stars: state.stars.map((s) => s.id === state.activeStarId ? s : s.state === 'resolved' ? s : ({ ...s, state: action.ids.includes(s.id) ? 'glowing' : 'idle' })) };
    case 'FOCUS_STAR': return applyFocusCamera(state, { type: 'star', starId: action.starId });
    case 'FOCUS_CLUSTER': return applyFocusCamera(state, { type: 'cluster', chapterId: action.chapterId, companionLine: action.companionLine });
    case 'MARK_RESOLVED': return { ...state, stars: state.stars.map((s) => s.id === action.starId ? { ...s, state: 'resolved' } : s), companionLine: 'This one has softened.' };
    case 'SET_CAMERA': return { ...state, camera: action.camera };
    case 'CLEAR_FOCUS': return applyFocusCamera(state, { type: 'clear' });
    case 'SET_COMPANION_LINE': return { ...state, companionLine: action.line };
    default: return state;
  }
}

export default function LifeMapScene() {
  const [state, dispatch] = useReducer(reducer, { stars: INITIAL_STARS, activeStarId: null, activeChapterId: null, camera: { x: 50, y: 50, zoom: 1 }, companionLine: 'A recurring memory pattern appeared.', phase: 'living', reducedMotion: false });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => dispatch({ type: 'SET_REDUCED_MOTION', value: media.matches });
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timer = 0;
    const emotionScore: Record<MemoryEmotion, number> = { threshold: 3, grief: 2.5, recovery: 2, shadow: 2, mirror: 1.5, dream: 1.25, calm: 1, joy: 1, focus: 1 };
    const run = () => {
      const candidates = state.stars.filter((s) => s.id !== state.activeStarId);
      const pickCount = 1 + Math.floor(Math.random() * 3);
      const scored = [...candidates]
        .map((s) => ({ s, score: 1 + s.recency * 2 + s.intensity * 2 + s.unresolvedWeight * 3 + emotionScore[s.emotion] - (s.state === 'resolved' ? 4 : 0) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(3, pickCount * 2));
      const picked = scored.sort(() => Math.random() - 0.5).slice(0, pickCount).map((x) => x.s.id);
      dispatch({ type: 'SET_GLOWING_STARS', ids: picked });
      dispatch({ type: 'SET_COMPANION_LINE', line: GLOW_LINES[Math.floor(Math.random() * GLOW_LINES.length)] });
      picked.forEach((id) => {
        const star = state.stars.find((s) => s.id === id);
        emitNarratorEvent({ event: 'lifemap.star.glow', starId: id, chapterId: star?.chapterId ?? null, emotion: star?.emotion ?? null });
      });
      emitTimelineSync({ phase: 'living', activeStarId: state.activeStarId, activeChapterId: state.activeChapterId });
      timer = window.setTimeout(run, state.reducedMotion ? 14000 : 8000 + Math.floor(Math.random() * 6000));
    };
    timer = window.setTimeout(run, state.reducedMotion ? 14000 : 9000);
    return () => window.clearTimeout(timer);
  }, [state.stars, state.activeStarId, state.activeChapterId, state.reducedMotion]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && dispatch({ type: 'CLEAR_FOCUS' });
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  const activeStar = state.stars.find((s) => s.id === state.activeStarId) ?? null;
  const focusVisuals = getFocusVisualState(state);
  const starMap = useMemo(() => new Map(state.stars.map((s) => [s.id, s])), [state.stars]);

  return <main className="life-map-shell" aria-label="URAI Spatial Life Map scene">
    <section className={`lifemap-space ${state.phase !== 'living' ? 'is-focused' : ''}`} style={{ ['--scene-blur' as string]: `${focusVisuals.blur}px`, ['--dim-opacity' as string]: String(focusVisuals.dimOpacity), ['--connected-boost' as string]: String(focusVisuals.connectedBoost) }}>
      <div className="starfield" style={{ ['--camera-x' as string]: `${state.camera.x}%`, ['--camera-y' as string]: `${state.camera.y}%`, ['--camera-zoom' as string]: String(state.camera.zoom) }}>
        <svg className="connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {state.stars.flatMap((s) => s.connectedTo.map((to) => [s.id, to] as const)).filter(([a, b]) => a < b).map(([a, b]) => {
            const s1 = starMap.get(a); const s2 = starMap.get(b); if (!s1 || !s2) return null;
            const active = state.activeStarId ? (a === state.activeStarId || b === state.activeStarId || s1.connectedTo.includes(state.activeStarId) || s2.connectedTo.includes(state.activeStarId)) : false;
            return <line key={`${a}-${b}`} className={`connection-line is-flowing ${active ? 'is-active' : state.activeStarId ? 'is-dimmed' : 'is-glowing'}`} x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} />;
          })}
        </svg>
        {state.stars.map((star) => {
          const connected = !!activeStar && activeStar.connectedTo.includes(star.id);
          const chapterFocused = state.phase === 'cluster' && state.activeChapterId === star.chapterId;
          const isResolved = star.state === 'resolved';
          const dimmedByStarFocus = !!state.activeStarId && !connected && state.activeStarId !== star.id && !isResolved;
          const dimmedByCluster = state.phase === 'cluster' && state.activeChapterId !== star.chapterId && !isResolved;
          const dimmed = dimmedByStarFocus || dimmedByCluster;
          return <button key={star.id} type="button" className={`memory-star state-${star.state} ${connected ? 'is-connected' : ''} ${dimmed ? 'is-dimmed' : ''} ${chapterFocused ? 'is-chapter-focused' : ''} ${isResolved ? 'is-subdued' : ''}`} style={{ left: `${star.x}%`, top: `${star.y}%`, width: `${star.size}px`, height: `${star.size}px` }} aria-label={`${star.title}, ${star.emotion}, ${star.state}`} onClick={() => { dispatch({ type: 'FOCUS_STAR', starId: star.id }); emitNarratorEvent({ event: 'lifemap.star.focus', starId: star.id, chapterId: star.chapterId, emotion: star.emotion }); emitTimelineSync({ phase: 'focus', activeStarId: star.id, activeChapterId: star.chapterId }); }}><span>{star.title}</span></button>;
        })}
      </div>
    </section>

    <aside className="panel export-panel" aria-label="Export panel"><button type="button">Export snapshot</button><button type="button">Export arc</button></aside>
    <aside className="panel companion-panel" aria-label="Companion panel"><h2>Companion</h2><p>{state.companionLine}</p></aside>

    {activeStar && <aside className="panel detail" aria-live="polite"><h3>{activeStar.title}</h3><p>{activeStar.emotion} · {CHAPTERS.find((c) => c.id === activeStar.chapterId)?.title}</p><p>{activeStar.narratorLine}</p><div className="actions"><button type="button" onClick={() => { dispatch({ type: 'SET_COMPANION_LINE', line: applyFocusCamera(state, { type: 'context', companionLine: 'Replaying the emotional thread.' }).companionLine }); emitNarratorEvent({ event: 'lifemap.star.focus', starId: activeStar.id, chapterId: activeStar.chapterId, emotion: activeStar.emotion, action: 'replay' }); }}>Replay</button><button type="button" onClick={() => { dispatch({ type: 'SET_COMPANION_LINE', line: applyFocusCamera(state, { type: 'context', companionLine: 'Reflection mode is open.' }).companionLine }); emitNarratorEvent({ event: 'lifemap.star.focus', starId: activeStar.id, chapterId: activeStar.chapterId, emotion: activeStar.emotion, action: 'reflect' }); }}>Reflect</button><button type="button" onClick={() => { dispatch({ type: 'MARK_RESOLVED', starId: activeStar.id }); emitNarratorEvent({ event: 'lifemap.star.resolved', starId: activeStar.id, chapterId: activeStar.chapterId, emotion: activeStar.emotion, action: 'resolve' }); emitTimelineSync({ phase: 'focus', activeStarId: activeStar.id, activeChapterId: activeStar.chapterId }); }}>Mark resolved</button></div></aside>}

    <nav className="chapter-row" aria-label="Chapter anchors">{CHAPTERS.map((c) => <button type="button" key={c.id} className={`chapter-pill ${state.activeChapterId === c.id ? 'active' : ''}`} onClick={() => { dispatch({ type: 'FOCUS_CLUSTER', chapterId: c.id, camera: { x: 50, y: 50, zoom: 1 }, companionLine: CHAPTER_LINES[c.id] }); emitNarratorEvent({ event: 'lifemap.cluster.focus', chapterId: c.id }); emitTimelineSync({ phase: 'cluster', activeChapterId: c.id }); }}><strong>{c.title}</strong><small>{c.subtitle}</small></button>)}</nav>

    <style jsx>{`
      .life-map-shell { min-height: 100vh; background: radial-gradient(circle at 50% 28%, #26366d, #0a0f20 58%, #05060f 100%); color: #eef3ff; position: relative; padding: 1rem; overflow: hidden; }
      .lifemap-space { position: absolute; inset: 0 0 120px; filter: none; }
      .lifemap-space.is-focused { filter: blur(var(--scene-blur, 0px)) saturate(1.05); }
      .starfield { position: absolute; inset: 0; transform: translate(calc(50% - var(--camera-x)), calc(50% - var(--camera-y))) scale(var(--camera-zoom)); transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1), filter 700ms ease; }
      .connections { position: absolute; inset: 0; width: 100%; height: 100%; }
      .connection-line { stroke: rgba(190, 220, 255, 0.22); stroke-width: 0.2; stroke-dasharray: 1 1.8; }
      .connection-line.is-flowing { animation: constellationFlow 6s linear infinite; }
      .connection-line.is-active { stroke: rgba(210, 240, 255, 0.75); stroke-width: 0.34; filter: drop-shadow(0 0 8px rgba(125, 211, 252, 0.7)); }
      .connection-line.is-dimmed { opacity: .25; }
      .memory-star { position: absolute; transform: translate(-50%, -50%); border: 0; border-radius: 999px; background: radial-gradient(circle, #f8fbff 0%, #b4ceff 48%, #779dff 100%); color: #071022; font-weight: 700; display: grid; place-items: center; box-shadow: 0 0 10px rgba(255,255,255,.75), 0 0 24px rgba(120,170,255,.45); transition: opacity .4s ease, transform .4s ease; }
      .memory-star.state-glowing { animation: starPulse 2.8s ease-in-out infinite; }
      .memory-star.state-active { transform: translate(-50%, -50%) scale(1.22); z-index: 3; }
      .memory-star.state-resolved::after { content: ''; position: absolute; inset: -20px; border-radius: 999px; border: 1px solid rgba(190,255,235,.45); animation: bloomFade 1.8s ease-out; }
      .memory-star.is-connected { opacity: calc(.85 + var(--connected-boost, 0)); }
      .memory-star.is-dimmed { opacity: var(--dim-opacity, .34); }
      .memory-star.is-subdued { opacity: .44; }
      .memory-star.is-chapter-focused { opacity: 1; }
      .panel { position: absolute; background: rgba(7, 10, 25, 0.75); border: 1px solid rgba(157, 196, 255, 0.32); border-radius: 12px; padding: .8rem; backdrop-filter: blur(6px); }
      .export-panel { left: 1rem; top: 1rem; display: flex; gap: .5rem; z-index: 30; }
      .companion-panel { right: 1rem; top: 1rem; width: 280px; }
      .detail { right: 1rem; top: 130px; width: 300px; }
      .actions { display: flex; gap: .5rem; flex-wrap: wrap; }
      .chapter-row { position: absolute; left: 1rem; right: 1rem; bottom: 1rem; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .5rem; }
      .chapter-pill { border: 1px solid rgba(157, 196, 255, 0.4); border-radius: 999px; background: rgba(13, 20, 45, 0.85); color: #edf4ff; padding: .5rem .7rem; text-align: left; }
      .chapter-pill.active { border-color: #b9d7ff; box-shadow: 0 0 18px rgba(125, 211, 252, 0.35); }
      .chapter-pill small { display: block; opacity: .8; }
      @keyframes constellationFlow { to { stroke-dashoffset: -80; } }
      @keyframes starPulse { 0%,100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.12); } }
      @keyframes bloomFade { from { opacity: .95; transform: scale(.75); } to { opacity: 0; transform: scale(1.55); } }
      @media (prefers-reduced-motion: reduce) { .memory-star, .connection-line, .lifemap-space { animation: none !important; transition-duration: 0.01ms !important; } .connection-line.is-flowing { animation: none; } }
    `}</style>
  </main>;
}

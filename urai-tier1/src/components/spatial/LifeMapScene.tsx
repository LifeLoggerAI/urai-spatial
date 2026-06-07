"use client";

import { useEffect, useMemo, useReducer } from "react";

type StarState = "idle" | "glowing" | "active" | "resolved";
type MemoryEmotion = "calm" | "joy" | "grief" | "focus" | "threshold" | "recovery" | "dream" | "mirror" | "shadow";
type ChapterId = "season-of-becoming" | "threshold" | "recovery-arc" | "purple-dream-field" | "mirror-of-becoming";

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
  narratorLine: string;
  connectedTo: string[];
};

type LifeMapPhase = "living" | "focus" | "cluster";
type LifeMapCamera = { x: number; y: number; zoom: number };
type State = {
  stars: MemoryStar[];
  activeStarId: string | null;
  activeChapterId: ChapterId | null;
  camera: LifeMapCamera;
  companionLine: string;
  phase: LifeMapPhase;
  reducedMotion: boolean;
};

type Action =
  | { type: "SET_REDUCED_MOTION"; value: boolean }
  | { type: "SET_GLOWING_STARS"; ids: string[] }
  | { type: "FOCUS_STAR"; starId: string }
  | { type: "FOCUS_CLUSTER"; chapterId: ChapterId; camera: LifeMapCamera; companionLine: string }
  | { type: "MARK_RESOLVED"; starId: string }
  | { type: "CLEAR_FOCUS" }
  | { type: "SET_COMPANION_LINE"; line: string };

const CHAPTERS = [
  { id: "season-of-becoming", title: "Season of Becoming", subtitle: "memory / calm / clarity" },
  { id: "threshold", title: "Threshold", subtitle: "shadow / change / tension" },
  { id: "recovery-arc", title: "Recovery Arc", subtitle: "recovery / growth / purpose" },
  { id: "purple-dream-field", title: "Dream Field", subtitle: "symbols / night / signal" },
  { id: "mirror-of-becoming", title: "Mirror of Becoming", subtitle: "rebirth / clarity / path" },
] satisfies ReadonlyArray<{ id: ChapterId; title: string; subtitle: string }>;

const CHAPTER_LINES: Record<ChapterId, string> = {
  "season-of-becoming": "This season is asking to be understood with patience.",
  threshold: "A threshold pattern is visible. Treat it as a signal, not a conclusion.",
  "recovery-arc": "The recovery arc is still growing through small returns.",
  "purple-dream-field": "The dream field is speaking in symbols and soft echoes.",
  "mirror-of-becoming": "The mirror is showing who you may be becoming.",
};

const STAR_SEED: Array<[string, number, number, ChapterId, MemoryEmotion]> = [
  ["M", 16, 22, "season-of-becoming", "calm"],
  ["D", 28, 19, "season-of-becoming", "joy"],
  ["I", 22, 34, "season-of-becoming", "focus"],
  ["S", 37, 30, "threshold", "shadow"],
  ["R", 48, 24, "threshold", "grief"],
  ["T", 56, 31, "threshold", "threshold"],
  ["E", 65, 20, "recovery-arc", "recovery"],
  ["L", 72, 28, "recovery-arc", "focus"],
  ["V", 79, 37, "recovery-arc", "joy"],
  ["H", 68, 44, "purple-dream-field", "dream"],
  ["A", 58, 47, "purple-dream-field", "mirror"],
  ["N", 46, 43, "purple-dream-field", "dream"],
  ["K", 34, 45, "threshold", "shadow"],
  ["P", 24, 50, "season-of-becoming", "calm"],
  ["O", 14, 43, "season-of-becoming", "focus"],
  ["Y", 19, 63, "mirror-of-becoming", "mirror"],
  ["C", 31, 68, "mirror-of-becoming", "recovery"],
  ["B", 44, 66, "mirror-of-becoming", "joy"],
  ["F", 56, 63, "mirror-of-becoming", "focus"],
  ["G", 67, 66, "mirror-of-becoming", "mirror"],
  ["Q", 79, 61, "recovery-arc", "recovery"],
  ["U", 87, 50, "recovery-arc", "focus"],
  ["W", 86, 33, "purple-dream-field", "dream"],
  ["J", 10, 58, "threshold", "grief"],
];

const INITIAL_STARS: MemoryStar[] = STAR_SEED.map(([title, x, y, chapterId, emotion], index, all) => ({
  id: `star-${title}-${index}`,
  title,
  x,
  y,
  size: 16 + (index % 5),
  emotion,
  chapterId,
  state: "idle",
  intensity: 0.4 + ((index * 7) % 6) / 10,
  recency: 0.3 + ((index * 3) % 7) / 10,
  unresolvedWeight: 0.2 + ((index * 5) % 8) / 10,
  narratorLine: `${title} carries a thread that may still matter.`,
  connectedTo: [
    `star-${all[(index + 1) % all.length][0]}-${(index + 1) % all.length}`,
    `star-${all[(index + 5) % all.length][0]}-${(index + 5) % all.length}`,
  ],
}));

function emitLifeMapEvent(name: string, detail: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail: { ...detail, timestamp: Date.now() } }));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_REDUCED_MOTION":
      return { ...state, reducedMotion: action.value };
    case "SET_GLOWING_STARS":
      return {
        ...state,
        stars: state.stars.map((star) =>
          star.id === state.activeStarId || star.state === "resolved" ? star : { ...star, state: action.ids.includes(star.id) ? "glowing" : "idle" },
        ),
      };
    case "FOCUS_STAR": {
      const target = state.stars.find((star) => star.id === action.starId);
      if (!target) return state;
      return {
        ...state,
        activeStarId: target.id,
        activeChapterId: target.chapterId,
        phase: "focus",
        companionLine: target.narratorLine,
        camera: { x: target.x, y: target.y, zoom: 1.8 },
        stars: state.stars.map((star) => (star.id === target.id ? { ...star, state: "active" } : star.state === "resolved" ? star : { ...star, state: "idle" })),
      };
    }
    case "FOCUS_CLUSTER":
      return { ...state, phase: "cluster", activeStarId: null, activeChapterId: action.chapterId, camera: action.camera, companionLine: action.companionLine };
    case "MARK_RESOLVED":
      return { ...state, stars: state.stars.map((star) => (star.id === action.starId ? { ...star, state: "resolved" } : star)), companionLine: "This one has softened." };
    case "CLEAR_FOCUS":
      return { ...state, phase: "living", activeStarId: null, activeChapterId: null, camera: { x: 50, y: 50, zoom: 1 }, stars: state.stars.map((star) => (star.state === "resolved" ? star : { ...star, state: "idle" })) };
    case "SET_COMPANION_LINE":
      return { ...state, companionLine: action.line };
  }
}

export default function LifeMapScene() {
  const [state, dispatch] = useReducer(reducer, {
    stars: INITIAL_STARS,
    activeStarId: null,
    activeChapterId: null,
    camera: { x: 50, y: 50, zoom: 1 },
    companionLine: "A living memory field is open.",
    phase: "living",
    reducedMotion: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => dispatch({ type: "SET_REDUCED_MOTION", value: media.matches });
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "CLEAR_FOCUS" });
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || state.reducedMotion) return;
    const timer = window.setInterval(() => {
      const pool = state.stars.filter((star) => star.id !== state.activeStarId && star.state !== "resolved");
      const picked = pool
        .slice()
        .sort((a, b) => b.recency + b.intensity + b.unresolvedWeight - (a.recency + a.intensity + a.unresolvedWeight))
        .slice(0, 3)
        .map((star) => star.id);
      dispatch({ type: "SET_GLOWING_STARS", ids: picked });
      dispatch({ type: "SET_COMPANION_LINE", line: "A pattern is gently lighting up." });
    }, 9000);
    return () => window.clearInterval(timer);
  }, [state.activeStarId, state.reducedMotion, state.stars]);

  const activeStar = state.stars.find((star) => star.id === state.activeStarId) ?? null;
  const starById = useMemo(() => new Map(state.stars.map((star) => [star.id, star])), [state.stars]);

  return (
    <main className="life-map-shell" aria-label="URAI Spatial Life Map scene">
      <section className={`lifemap-space ${activeStar ? "is-focused" : ""}`}>
        <div
          className="starfield"
          style={{
            ["--camera-x" as string]: `${state.camera.x}%`,
            ["--camera-y" as string]: `${state.camera.y}%`,
            ["--camera-zoom" as string]: String(state.camera.zoom),
          }}
        >
          <svg className="connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {state.stars
              .flatMap((star) => star.connectedTo.map((to) => [star.id, to] as const))
              .filter(([a, b]) => a < b)
              .map(([a, b]) => {
                const first = starById.get(a);
                const second = starById.get(b);
                if (!first || !second) return null;
                const isActive = !!activeStar && (a === activeStar.id || b === activeStar.id || activeStar.connectedTo.includes(a) || activeStar.connectedTo.includes(b));
                return <line key={`${a}-${b}`} className={`connection-line ${isActive ? "is-active" : activeStar ? "is-dimmed" : "is-glowing"}`} x1={first.x} y1={first.y} x2={second.x} y2={second.y} />;
              })}
          </svg>

          {state.stars.map((star) => {
            const connected = !!activeStar && activeStar.connectedTo.includes(star.id);
            const chapterFocused = state.phase === "cluster" && star.chapterId === state.activeChapterId;
            const dimmed = !!activeStar && star.id !== activeStar.id && !connected;
            return (
              <button
                key={star.id}
                type="button"
                className={`memory-star state-${star.state} ${connected ? "is-connected" : ""} ${chapterFocused ? "is-chapter-focused" : ""} ${dimmed ? "is-dimmed" : ""}`}
                style={{ left: `${star.x}%`, top: `${star.y}%`, width: `${star.size}px`, height: `${star.size}px` }}
                aria-label={`${star.title}, ${star.emotion}, ${star.state}`}
                onClick={() => {
                  dispatch({ type: "FOCUS_STAR", starId: star.id });
                  emitLifeMapEvent("urai:narrator", { event: "lifemap.star.focus", starId: star.id, chapterId: star.chapterId, emotion: star.emotion });
                }}
              >
                <span>{star.title}</span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="panel companion-panel" aria-label="Council guide panel">
        <p>COUNCIL</p>
        <h1>{activeStar ? activeStar.title : "Life Map"}</h1>
        <span>{state.companionLine}</span>
      </aside>

      <aside className="panel export-panel" aria-label="Export actions">
        <button type="button">Snapshot</button>
        <button type="button">Story Arc</button>
      </aside>

      {activeStar ? (
        <aside className="panel detail" aria-live="polite" aria-label="Selected memory detail">
          <h2>{activeStar.title}</h2>
          <p>{activeStar.emotion} · {CHAPTERS.find((chapter) => chapter.id === activeStar.chapterId)?.title}</p>
          <span>{activeStar.narratorLine}</span>
          <div className="actions">
            <button type="button" onClick={() => dispatch({ type: "SET_COMPANION_LINE", line: "Replaying the emotional thread." })}>Replay</button>
            <button type="button" onClick={() => dispatch({ type: "SET_COMPANION_LINE", line: "Reflection mode is open." })}>Reflect</button>
            <button type="button" onClick={() => dispatch({ type: "MARK_RESOLVED", starId: activeStar.id })}>Soften</button>
          </div>
        </aside>
      ) : null}

      <nav className="chapter-row" aria-label="Chapter anchors">
        {CHAPTERS.map((chapter) => (
          <button
            type="button"
            key={chapter.id}
            className={`chapter-pill ${state.activeChapterId === chapter.id ? "active" : ""}`}
            onClick={() => {
              const stars = state.stars.filter((star) => star.chapterId === chapter.id);
              const x = stars.reduce((sum, star) => sum + star.x, 0) / stars.length;
              const y = stars.reduce((sum, star) => sum + star.y, 0) / stars.length;
              dispatch({ type: "FOCUS_CLUSTER", chapterId: chapter.id, camera: { x, y, zoom: 1.45 }, companionLine: CHAPTER_LINES[chapter.id] });
            }}
          >
            <strong>{chapter.title}</strong>
            <small>{chapter.subtitle}</small>
          </button>
        ))}
      </nav>

      <style jsx>{`
        .life-map-shell{min-height:100vh;background:radial-gradient(circle at 50% 28%,#26366d,#0a0f20 58%,#05060f 100%);color:#eef3ff;position:relative;padding:1rem;overflow:hidden}.life-map-shell:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 42%,transparent 0 42%,rgba(0,0,0,.18) 70%,rgba(0,0,0,.58) 100%)}.lifemap-space{position:absolute;inset:0 0 120px}.starfield{position:absolute;inset:0;transform:translate(calc(50% - var(--camera-x)),calc(50% - var(--camera-y))) scale(var(--camera-zoom));transition:transform 700ms cubic-bezier(.22,1,.36,1)}.connections{position:absolute;inset:0;width:100%;height:100%}.connection-line{stroke:rgba(190,220,255,.22);stroke-width:.2;stroke-dasharray:1 1.8}.connection-line.is-glowing{animation:constellationFlow 6s linear infinite}.connection-line.is-active{stroke:rgba(210,240,255,.75);stroke-width:.34;filter:drop-shadow(0 0 8px rgba(125,211,252,.7))}.connection-line.is-dimmed{opacity:.25}.memory-star{position:absolute;transform:translate(-50%,-50%);border:0;border-radius:999px;background:radial-gradient(circle,#f8fbff 0%,#b4ceff 48%,#779dff 100%);color:#071022;font-weight:800;display:grid;place-items:center;box-shadow:0 0 10px rgba(255,255,255,.75),0 0 24px rgba(120,170,255,.45);transition:opacity .4s ease,transform .4s ease;cursor:pointer}.memory-star.state-glowing{animation:starPulse 2.8s ease-in-out infinite;box-shadow:0 0 14px rgba(255,255,255,.95),0 0 36px rgba(120,170,255,.7),0 0 72px rgba(120,170,255,.35)}.memory-star.state-active{transform:translate(-50%,-50%) scale(1.22);z-index:3}.memory-star.state-resolved::after{content:"";position:absolute;inset:-20px;border-radius:999px;border:1px solid rgba(190,255,235,.45);animation:bloomFade 1.8s ease-out}.memory-star.is-connected{opacity:.92}.memory-star.is-dimmed{opacity:.34}.panel{position:absolute;z-index:2;background:rgba(7,10,25,.75);border:1px solid rgba(157,196,255,.32);border-radius:18px;padding:.85rem;backdrop-filter:blur(10px);box-shadow:0 20px 70px rgba(0,0,0,.25)}.companion-panel{right:1rem;top:1rem;width:min(310px,calc(100% - 2rem))}.companion-panel p{margin:0 0 .35rem;font-size:.68rem;letter-spacing:.18em;color:#a8dfff;font-weight:900}.companion-panel h1{margin:0;font-size:1.8rem;line-height:1}.companion-panel span,.detail span{display:block;margin-top:.65rem;color:rgba(238,243,255,.78);line-height:1.4}.export-panel{left:1rem;top:1rem;display:flex;gap:.5rem}.panel button,.chapter-pill{border:1px solid rgba(157,196,255,.4);background:rgba(13,20,45,.86);color:#edf4ff;border-radius:999px;padding:.55rem .75rem;font-weight:800}.detail{right:1rem;top:170px;width:min(320px,calc(100% - 2rem))}.detail h2{margin:0;font-size:2rem}.detail p{color:#bcd2ff}.actions{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.9rem}.chapter-row{position:absolute;z-index:2;left:1rem;right:1rem;bottom:1rem;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.5rem}.chapter-pill{text-align:left;border-radius:18px}.chapter-pill.active{border-color:#b9d7ff;box-shadow:0 0 18px rgba(125,211,252,.35)}.chapter-pill small{display:block;opacity:.78;margin-top:.2rem}@keyframes constellationFlow{to{stroke-dashoffset:-80}}@keyframes starPulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.12)}}@keyframes bloomFade{from{opacity:.95;transform:scale(.75)}to{opacity:0;transform:scale(1.55)}}@media (max-width:760px){.chapter-row{grid-template-columns:1fr 1fr;max-height:210px;overflow:auto}.export-panel{display:none}.companion-panel{left:1rem;right:1rem;width:auto}.detail{left:1rem;right:1rem;top:auto;bottom:235px;width:auto}}@media (prefers-reduced-motion:reduce){.memory-star,.connection-line,.starfield{animation:none!important;transition-duration:.01ms!important}}
      `}</style>
    </main>
  );
}

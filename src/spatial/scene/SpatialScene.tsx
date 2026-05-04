"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

type Mode = "home" | "ground" | "ascent" | "lifemap" | "focus" | "replay" | "mirror";

type MemoryStar = {
  id: string;
  x: number;
  y: number;
  opacity: number;
  size: number;
  label?: string;
  emotion?: "calm" | "joy" | "grief" | "focus" | "threshold";
};

type SceneState = {
  mode: Mode;
  ascentProgress: number;
  selectedStarId: string | null;
  zoom: number;
};

type SceneAction =
  | { type: "SYNC_ROUTE"; mode: Mode }
  | { type: "OPEN_GROUND" }
  | { type: "START_ASCENT" }
  | { type: "SET_ASCENT_PROGRESS"; progress: number }
  | { type: "ENTER_LIFEMAP" }
  | { type: "HOME" }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SELECT_STAR"; id: string | null }
  | { type: "SET_MODE"; mode: Mode };

const STAR_COUNT = 160;
const SKY_BANDS = 5;

const routeByMode: Record<Mode, string> = {
  home: "/home",
  ground: "/?phase=ground",
  ascent: "/?phase=ascent",
  lifemap: "/life-map",
  focus: "/life-map?phase=focus",
  replay: "/life-map?phase=replay",
  mirror: "/life-map?phase=mirror",
};

function modeFromLocation(): Mode {
  if (typeof window === "undefined") return "home";

  const url = new URL(window.location.href);
  const source = `${url.pathname} ${url.searchParams.get("phase") ?? ""}`.toLowerCase();

  if (source.includes("replay")) return "replay";
  if (source.includes("ground")) return "ground";
  if (source.includes("mirror")) return "mirror";
  if (source.includes("focus")) return "focus";
  if (source.includes("life-map") || source.includes("lifemap")) return "lifemap";
  if (source.includes("ascent")) return "ascent";

  return "home";
}

function navigateTo(mode: Mode) {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", routeByMode[mode]);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function sceneReducer(state: SceneState, action: SceneAction): SceneState {
  switch (action.type) {
    case "SYNC_ROUTE":
      return { ...state, mode: action.mode };
    case "OPEN_GROUND":
      return { ...state, mode: "ground", selectedStarId: null };
    case "START_ASCENT":
      return { ...state, mode: "ascent", ascentProgress: 0, selectedStarId: null };
    case "SET_ASCENT_PROGRESS":
      return { ...state, ascentProgress: action.progress };
    case "ENTER_LIFEMAP":
      return { ...state, mode: "lifemap", ascentProgress: 1, zoom: Math.max(state.zoom, 1), selectedStarId: null };
    case "HOME":
      return { mode: "home", ascentProgress: 0, selectedStarId: null, zoom: 1 };
    case "SET_ZOOM":
      return { ...state, zoom: Math.min(2.8, Math.max(0.75, action.zoom)) };
    case "SELECT_STAR":
      return { ...state, selectedStarId: action.id, mode: action.id ? "focus" : state.mode };
    case "SET_MODE":
      return { ...state, mode: action.mode };
    default:
      return state;
  }
}

function buildMemoryStars(): MemoryStar[] {
  return Array.from({ length: STAR_COUNT }, (_, index) => {
    const emotions: MemoryStar["emotion"][] = ["calm", "joy", "grief", "focus", "threshold"];

    return {
      id: `memory-star-${index}`,
      x: (index * 29) % 100,
      y: (index * 47) % 100,
      opacity: 0.15 + ((index * 17) % 70) / 100,
      size: 1 + ((index * 13) % 3),
      emotion: emotions[index % emotions.length],
      label: index % 17 === 0 ? `Memory ${index + 1}` : undefined,
    };
  });
}

function companionLineForMode(mode: Mode) {
  switch (mode) {
    case "home":
      return "Your sky is listening.";
    case "ground":
      return "The ground remembers what held you.";
    case "ascent":
      return "Rising through the quiet layer.";
    case "lifemap":
      return "Your memories are forming constellations.";
    case "focus":
      return "This star carries a signal.";
    case "replay":
      return "Replaying the emotional thread.";
    case "mirror":
      return "The mirror is showing who you are becoming.";
    default:
      return "";
  }
}

export default function SpatialScene() {
  const [state, dispatch] = useReducer(sceneReducer, {
    mode: "home",
    ascentProgress: 0,
    selectedStarId: null,
    zoom: 1,
  });

  const [companionLine, setCompanionLine] = useState("Your sky is listening.");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const ascentRafRef = useRef<number | null>(null);
  const memoryStars = useMemo(() => buildMemoryStars(), []);

  const selectedStar = useMemo(
    () => memoryStars.find((star) => star.id === state.selectedStarId) ?? null,
    [memoryStars, state.selectedStarId],
  );

  const beginAscent = useCallback(() => {
    dispatch({ type: "START_ASCENT" });
    navigateTo("ascent");
  }, []);

  const enterGround = useCallback(() => {
    dispatch({ type: "OPEN_GROUND" });
    navigateTo("ground");
  }, []);

  const returnHome = useCallback(() => {
    dispatch({ type: "HOME" });
    navigateTo("home");
  }, []);

  const enterReplay = useCallback(() => {
    dispatch({ type: "SET_MODE", mode: "replay" });
    navigateTo("replay");
  }, []);

  const enterMirror = useCallback(() => {
    dispatch({ type: "SET_MODE", mode: "mirror" });
    navigateTo("mirror");
  }, []);

  useEffect(() => {
    const sync = () => dispatch({ type: "SYNC_ROUTE", mode: modeFromLocation() });
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    setCompanionLine(companionLineForMode(state.mode));
  }, [state.mode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (state.mode !== "home") returnHome();
      }

      if (event.key === "Enter" && state.mode === "home") {
        event.preventDefault();
        beginAscent();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beginAscent, returnHome, state.mode]);

  useEffect(() => {
    if (state.mode !== "ascent") return;

    if (ascentRafRef.current) cancelAnimationFrame(ascentRafRef.current);

    const started = performance.now();
    const duration = 1800;

    const tick = (time: number) => {
      const raw = Math.min(1, (time - started) / duration);
      const eased = 1 - Math.pow(1 - raw, 3);

      dispatch({ type: "SET_ASCENT_PROGRESS", progress: eased });

      if (raw < 1) {
        ascentRafRef.current = requestAnimationFrame(tick);
      } else {
        dispatch({ type: "ENTER_LIFEMAP" });
        navigateTo("lifemap");
      }
    };

    ascentRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (ascentRafRef.current) cancelAnimationFrame(ascentRafRef.current);
    };
  }, [state.mode]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (event: WheelEvent) => {
      if (!["lifemap", "focus", "replay", "mirror"].includes(state.mode)) return;
      event.preventDefault();
      dispatch({ type: "SET_ZOOM", zoom: state.zoom + (event.deltaY > 0 ? -0.08 : 0.08) });
    };

    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [state.mode, state.zoom]);

  const skyTransform = `translate3d(0, ${state.ascentProgress * -18}px, 0) scale(${1 + state.ascentProgress * 0.06})`;
  const starTransform = `translate3d(0, ${state.ascentProgress * -52}px, 0) scale(${state.zoom + state.ascentProgress * 0.16})`;
  const orbScale = 1 + state.ascentProgress * 1.8;

  return (
    <div ref={stageRef} data-testid="urai-spatial-stage" data-mode={state.mode} className={`spatial-stage mode-${state.mode}`}>
      <div data-testid="urai-home-sky" className="bg-sky" aria-hidden style={{ transform: skyTransform }}>
        {Array.from({ length: SKY_BANDS }, (_, index) => (
          <b key={index} style={{ opacity: 0.22 - index * 0.03 }} />
        ))}
      </div>

      <div
        className="bg-nebula"
        aria-hidden
        style={{ transform: `translate3d(0, ${state.ascentProgress * -26}px, 0) scale(${1 + state.ascentProgress * 0.2})` }}
      />

      <div className="bg-stars" aria-hidden style={{ transform: starTransform }}>
        {memoryStars.map((star) => (
          <button
            key={star.id}
            type="button"
            className={`memory-star emotion-${star.emotion ?? "calm"} ${state.selectedStarId === star.id ? "selected" : ""}`}
            aria-label={star.label ?? "Memory star"}
            style={{ left: `${star.x}%`, top: `${star.y}%`, opacity: star.opacity, width: star.size + 5, height: star.size + 5 }}
            onClick={() => {
              dispatch({ type: "SELECT_STAR", id: star.id });
              navigateTo("focus");
            }}
          />
        ))}
      </div>

      {state.mode === "home" ? (
        <section data-testid="urai-home-scene" className="home-scene">
          <div data-testid="urai-home-horizon" className="home-horizon" />
          <button type="button" data-testid="urai-home-ground" className="home-ground" aria-label="Open Ground" onClick={enterGround} />
          <div data-testid="urai-home-body" className="home-body" />
          <div data-testid="urai-home-orb-shell" className="orb-shell">
            <button type="button" data-testid="urai-orb-button" className="orb-button" onClick={beginAscent} aria-label="Enter LifeMap" />
            <span className="orb-ring ring-a" />
            <span className="orb-ring ring-b" />
          </div>
          <div className="home-copy">
            <p>URAI Spatial</p>
            <h1>Touch the orb to rise into your Life Map.</h1>
          </div>
        </section>
      ) : null}

      {state.mode === "ground" ? (
        <section data-testid="urai-ground-scene" className="ground-scene">
          <div className="ground-core" />
          <div className="ground-panel">
            <p>Ground Layer</p>
            <h2>The body remembers before the stars do.</h2>
            <button type="button" className="ground-enter" onClick={beginAscent}>Ascend to LifeMap</button>
            <button type="button" className="ghost-button" onClick={returnHome}>Return Home</button>
          </div>
        </section>
      ) : null}

      {state.mode === "ascent" ? (
        <section data-testid="urai-ascent-cover" className="ascent-cover" style={{ opacity: 0.22 + state.ascentProgress * 0.78 }}>
          <div className="ascent-core" style={{ transform: `translate(-50%, -50%) scale(${orbScale})`, opacity: 1 - state.ascentProgress * 0.35 }} />
          <div className="ascent-tunnel" style={{ transform: `translate(-50%, -50%) scale(${1 + state.ascentProgress * 2.8}) rotate(${state.ascentProgress * 36}deg)` }} />
        </section>
      ) : null}

      {state.mode === "lifemap" || state.mode === "focus" || state.mode === "replay" || state.mode === "mirror" ? (
        <section data-testid="urai-lifemap-scene" className="lifemap-scene">
          <div className="lifemap-header">
            <p>Life Map</p>
            <h2>
              {state.mode === "focus" && selectedStar
                ? selectedStar.label ?? "Selected Memory"
                : state.mode === "replay"
                  ? "Replay Mode"
                  : state.mode === "mirror"
                    ? "Mirror of Becoming"
                    : "Your constellation is awake."}
            </h2>
          </div>
          <div className="lifemap-actions">
            <button type="button" onClick={() => dispatch({ type: "SET_ZOOM", zoom: state.zoom + 0.18 })}>Zoom In</button>
            <button type="button" onClick={() => dispatch({ type: "SET_ZOOM", zoom: state.zoom - 0.18 })}>Zoom Out</button>
            <button type="button" onClick={enterReplay}>Replay</button>
            <button type="button" onClick={enterMirror}>Mirror</button>
            <button type="button" onClick={returnHome}>Home</button>
          </div>
          {selectedStar ? (
            <aside className="memory-card">
              <p>{selectedStar.emotion ?? "memory"} signal</p>
              <h3>{selectedStar.label ?? "Unnamed Memory Star"}</h3>
              <span>This is where Firestore memory data, narration, tags, and replay clips can render.</span>
            </aside>
          ) : null}
        </section>
      ) : null}

      <aside className="companion-voice" aria-live="polite">
        <span />
        <p>{companionLine}</p>
      </aside>

      <style jsx>{`
        .spatial-stage{position:fixed;inset:0;z-index:0;background:#020617;overflow:hidden;color:#dbeafe;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.bg-sky,.bg-nebula,.bg-stars,.home-scene,.ground-scene,.ascent-cover,.lifemap-scene{position:absolute;inset:0;transition:transform .35s ease,opacity .35s ease}.bg-sky{background:linear-gradient(180deg,#020617 0%,#0f172a 48%,#111827 70%,#020617 100%)}.bg-sky b{position:absolute;left:-12%;right:-12%;height:24%;border-radius:50%;background:radial-gradient(circle at center,rgba(125,211,252,.24),transparent 70%);animation:skyShift 14s ease-in-out infinite alternate}.bg-sky b:nth-child(1){top:-8%}.bg-sky b:nth-child(2){top:8%}.bg-sky b:nth-child(3){top:22%}.bg-sky b:nth-child(4){top:38%}.bg-sky b:nth-child(5){top:58%}.bg-nebula{inset:-15%;background:radial-gradient(circle at 50% 40%,rgba(125,211,252,.2),transparent 35%),radial-gradient(circle at 82% 28%,rgba(196,181,253,.2),transparent 35%),radial-gradient(circle at 18% 80%,rgba(45,212,191,.12),transparent 33%);animation:drift 16s ease-in-out infinite alternate}.bg-stars{transform-origin:center center}.memory-star{position:absolute;border:none;border-radius:999px;background:#fff;box-shadow:0 0 12px #fff;cursor:pointer;animation:twinkle 2.6s ease-in-out infinite alternate;transition:transform .2s ease,box-shadow .2s ease,opacity .2s ease}.memory-star:hover,.memory-star.selected{transform:scale(2.4);opacity:1!important;box-shadow:0 0 16px #fff,0 0 42px rgba(125,211,252,.85);z-index:4}.emotion-joy{box-shadow:0 0 10px #fff,0 0 28px rgba(250,204,21,.75)}.emotion-grief{box-shadow:0 0 10px #fff,0 0 28px rgba(129,140,248,.75)}.emotion-focus{box-shadow:0 0 10px #fff,0 0 28px rgba(45,212,191,.75)}.emotion-threshold{box-shadow:0 0 10px #fff,0 0 34px rgba(244,114,182,.8)}.home-horizon{position:absolute;left:-8%;right:-8%;top:56%;height:26%;border-radius:50%;background:radial-gradient(ellipse at center,rgba(125,211,252,.3),rgba(30,41,59,0) 70%);filter:blur(2px)}.home-ground{position:absolute;left:-15%;right:-15%;bottom:-35%;height:62%;border:none;border-radius:50%;background:radial-gradient(ellipse at top,rgba(15,23,42,.92) 0%,rgba(2,6,23,.98) 58%,#000 100%);box-shadow:inset 0 30px 90px rgba(125,211,252,.18);cursor:pointer}.home-body{position:absolute;left:50%;top:58%;width:min(60vw,420px);aspect-ratio:1/1;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,#1d4ed8 0,#1e1b4b 55%,transparent 75%);filter:blur(2px)}.orb-shell{position:absolute;left:50%;top:58%;width:180px;height:180px;display:grid;place-items:center;transform:translate(-50%,-50%)}.orb-button{width:94px;height:94px;border:none;border-radius:50%;background:radial-gradient(circle,#fff,#7dd3fc 60%,#1d4ed8);box-shadow:0 0 34px #7dd3fc,0 0 80px rgba(125,211,252,.5);cursor:pointer;z-index:2}.orb-ring{position:absolute;border:1px solid rgba(191,219,254,.42);border-radius:50%;animation:orbit 5.4s linear infinite}.ring-a{width:128px;height:128px}.ring-b{width:160px;height:160px;animation-direction:reverse;animation-duration:8.6s}.home-copy{position:absolute;left:50%;bottom:8vh;width:min(88vw,520px);transform:translateX(-50%);text-align:center;pointer-events:none}.home-copy p,.lifemap-header p,.ground-panel p,.memory-card p{margin:0 0 8px;color:rgba(186,230,253,.72);font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.home-copy h1,.lifemap-header h2,.ground-panel h2{margin:0;color:#f8fafc;font-size:clamp(24px,5vw,52px);line-height:1.02;text-shadow:0 0 36px rgba(125,211,252,.34)}.ground-scene{display:grid;place-items:center;background:radial-gradient(circle at 50% 72%,rgba(15,23,42,.88),rgba(2,6,23,.95));backdrop-filter:blur(4px)}.ground-core{width:min(72vw,520px);height:min(34vh,280px);border-radius:50%;background:radial-gradient(ellipse at center,rgba(125,211,252,.22),rgba(2,6,23,.06) 70%);box-shadow:0 0 120px rgba(125,211,252,.28)}.ground-panel{position:absolute;bottom:12vh;left:50%;width:min(88vw,560px);transform:translateX(-50%);text-align:center}.ground-enter,.ghost-button,.lifemap-actions button{margin:10px 6px 0;border:1px solid rgba(191,219,254,.45);background:rgba(2,6,23,.72);color:#e0f2fe;border-radius:999px;padding:10px 16px;font-weight:800;cursor:pointer;backdrop-filter:blur(8px)}.ghost-button{opacity:.8}.ascent-cover{display:block;background:linear-gradient(180deg,rgba(2,6,23,.14),rgba(2,6,23,.88));pointer-events:none}.ascent-core{position:absolute;left:50%;top:58%;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,rgba(191,219,254,.9),rgba(59,130,246,.3),transparent 70%);filter:blur(1px)}.ascent-tunnel{position:absolute;left:50%;top:50%;width:42vmin;height:42vmin;border-radius:50%;border:1px solid rgba(186,230,253,.3);box-shadow:0 0 80px rgba(125,211,252,.32),inset 0 0 80px rgba(196,181,253,.16)}.lifemap-scene{pointer-events:none}.lifemap-header{position:absolute;top:6vh;left:50%;width:min(88vw,680px);transform:translateX(-50%);text-align:center;pointer-events:none}.lifemap-actions{position:absolute;left:50%;bottom:5vh;width:min(92vw,780px);transform:translateX(-50%);display:flex;flex-wrap:wrap;justify-content:center;pointer-events:auto}.memory-card{position:absolute;right:min(5vw,56px);top:20vh;width:min(84vw,320px);border:1px solid rgba(191,219,254,.22);border-radius:28px;background:rgba(2,6,23,.68);box-shadow:0 24px 80px rgba(0,0,0,.38);padding:20px;backdrop-filter:blur(14px);pointer-events:auto}.memory-card h3{margin:0 0 8px;color:#f8fafc;font-size:24px}.memory-card span{color:rgba(219,234,254,.76);line-height:1.5}.companion-voice{position:absolute;left:50%;top:24px;z-index:8;display:flex;align-items:center;gap:10px;max-width:min(86vw,520px);transform:translateX(-50%);border:1px solid rgba(191,219,254,.2);border-radius:999px;background:rgba(2,6,23,.62);padding:10px 14px;color:rgba(224,242,254,.92);box-shadow:0 12px 50px rgba(0,0,0,.24);backdrop-filter:blur(14px);pointer-events:none}.companion-voice span{width:10px;height:10px;flex:0 0 auto;border-radius:50%;background:#7dd3fc;box-shadow:0 0 18px #7dd3fc}.companion-voice p{margin:0;font-size:13px;font-weight:700;letter-spacing:.01em}@keyframes drift{from{transform:translate3d(0,0,0)}to{transform:translate3d(-2%,1%,0)}}@keyframes twinkle{from{filter:brightness(.8)}to{filter:brightness(1.5)}}@keyframes orbit{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes skyShift{from{transform:translate3d(0,0,0)}to{transform:translate3d(2%,1%,0)}}@media(max-width:640px){.companion-voice{top:14px}.memory-card{left:50%;right:auto;top:auto;bottom:14vh;transform:translateX(-50%)}.lifemap-actions{bottom:3vh}}@media(prefers-reduced-motion:reduce){.bg-sky b,.bg-nebula,.memory-star,.orb-ring{animation:none}.bg-sky,.bg-nebula,.bg-stars,.home-scene,.ground-scene,.ascent-cover,.lifemap-scene{transition:none}}
      `}</style>
    </div>
  );
}

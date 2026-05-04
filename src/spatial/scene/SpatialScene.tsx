"use client";

import { useEffect, useMemo, useReducer } from "react";

type Mode = "home" | "ground" | "ascent" | "lifemap" | "focus" | "replay" | "mirror";

type AnimationPhase =
  | "idle"
  | "ground-open"
  | "ascent-start"
  | "ascent-flight"
  | "ascent-complete"
  | "lifemap-ready";

type TimelineSyncEvent = {
  mode: Mode;
  phase: AnimationPhase;
  timestamp: number;
  source: "url" | "user" | "animation" | "keyboard";
};

type NarratorEvent =
  | "home.enter"
  | "ground.enter"
  | "ground.exit"
  | "ascent.start"
  | "ascent.complete"
  | "lifemap.enter"
  | "focus.enter"
  | "replay.enter"
  | "mirror.enter";

type SpatialState = {
  mode: Mode;
  phase: AnimationPhase;
  ascentProgress: number;
  transitionId: number;
};

type SpatialAction =
  | { type: "SYNC_FROM_URL"; mode: Mode }
  | { type: "ENTER_GROUND" }
  | { type: "EXIT_GROUND" }
  | { type: "BEGIN_ASCENT" }
  | { type: "SET_ASCENT_PROGRESS"; progress: number }
  | { type: "COMPLETE_ASCENT" }
  | { type: "ENTER_MODE"; mode: Mode }
  | { type: "RESET_HOME" };

const STAR_COUNT = 160;
const SKY_BANDS = 5;
const ASCENT_DURATION_MS = 1400;

const INITIAL_STATE: SpatialState = {
  mode: "home",
  phase: "idle",
  ascentProgress: 0,
  transitionId: 0,
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

function urlForMode(mode: Mode): string {
  switch (mode) {
    case "ground":
      return "/?phase=ground";
    case "ascent":
      return "/?phase=ascent";
    case "lifemap":
      return "/life-map";
    case "focus":
      return "/life-map?phase=focus";
    case "replay":
      return "/life-map?phase=replay";
    case "mirror":
      return "/life-map?phase=mirror";
    case "home":
    default:
      return "/home";
  }
}

function narratorEventForMode(mode: Mode): NarratorEvent {
  switch (mode) {
    case "ground":
      return "ground.enter";
    case "focus":
      return "focus.enter";
    case "replay":
      return "replay.enter";
    case "mirror":
      return "mirror.enter";
    case "lifemap":
      return "lifemap.enter";
    case "ascent":
      return "ascent.start";
    case "home":
    default:
      return "home.enter";
  }
}

function emitNarrator(event: NarratorEvent, detail?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("urai:narrator", {
      detail: {
        event,
        timestamp: Date.now(),
        ...detail,
      },
    }),
  );
}

function emitTimelineSync(sync: TimelineSyncEvent) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("urai:timeline-sync", {
      detail: sync,
    }),
  );
}

function replaceUrl(mode: Mode) {
  if (typeof window === "undefined") return;

  window.history.replaceState(null, "", urlForMode(mode));
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function spatialReducer(state: SpatialState, action: SpatialAction): SpatialState {
  switch (action.type) {
    case "SYNC_FROM_URL": {
      if (state.mode === "ascent") return state;

      return {
        ...state,
        mode: action.mode,
        phase: action.mode === "ground" ? "ground-open" : action.mode === "home" ? "idle" : "lifemap-ready",
        ascentProgress: action.mode === "ascent" ? state.ascentProgress : 0,
      };
    }

    case "ENTER_GROUND":
      if (state.mode === "ascent") return state;

      return {
        ...state,
        mode: "ground",
        phase: "ground-open",
        ascentProgress: 0,
        transitionId: state.transitionId + 1,
      };

    case "EXIT_GROUND":
      return {
        ...state,
        mode: "home",
        phase: "idle",
        ascentProgress: 0,
        transitionId: state.transitionId + 1,
      };

    case "BEGIN_ASCENT":
      if (state.mode === "ascent") return state;

      return {
        ...state,
        mode: "ascent",
        phase: "ascent-start",
        ascentProgress: 0,
        transitionId: state.transitionId + 1,
      };

    case "SET_ASCENT_PROGRESS":
      return {
        ...state,
        mode: "ascent",
        phase: action.progress < 0.28 ? "ascent-start" : "ascent-flight",
        ascentProgress: action.progress,
      };

    case "COMPLETE_ASCENT":
      return {
        ...state,
        mode: "lifemap",
        phase: "ascent-complete",
        ascentProgress: 1,
        transitionId: state.transitionId + 1,
      };

    case "ENTER_MODE":
      return {
        ...state,
        mode: action.mode,
        phase: action.mode === "home" ? "idle" : "lifemap-ready",
        ascentProgress: 0,
        transitionId: state.transitionId + 1,
      };

    case "RESET_HOME":
      return {
        ...INITIAL_STATE,
        transitionId: state.transitionId + 1,
      };

    default:
      return state;
  }
}

export default function SpatialScene() {
  const [state, dispatch] = useReducer(spatialReducer, INITIAL_STATE);
  const { mode, phase, ascentProgress, transitionId } = state;

  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, index) => ({
        x: (index * 29) % 100,
        y: (index * 47) % 100,
        o: 0.15 + ((index * 17) % 70) / 100,
        size: 1 + ((index * 13) % 3),
      })),
    [],
  );

  useEffect(() => {
    const sync = () => {
      dispatch({ type: "SYNC_FROM_URL", mode: modeFromLocation() });
    };

    sync();
    window.addEventListener("popstate", sync);

    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    emitTimelineSync({
      mode,
      phase,
      timestamp: Date.now(),
      source: mode === "ascent" ? "animation" : "user",
    });
  }, [mode, phase, transitionId]);

  useEffect(() => {
    emitNarrator(narratorEventForMode(mode), {
      mode,
      phase,
      transitionId,
    });
  }, [mode, transitionId]);

  useEffect(() => {
    if (phase === "ascent-complete") {
      emitNarrator("ascent.complete", { mode, phase });
      replaceUrl("lifemap");

      const timer = window.setTimeout(() => {
        dispatch({ type: "ENTER_MODE", mode: "lifemap" });
      }, 180);

      return () => window.clearTimeout(timer);
    }
  }, [phase, mode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (mode === "ground") {
        event.preventDefault();
        emitNarrator("ground.exit");
        dispatch({ type: "EXIT_GROUND" });
        replaceUrl("home");
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  useEffect(() => {
    if (mode !== "ascent") return;

    const started = performance.now();
    let raf = 0;

    const tick = (time: number) => {
      const progress = Math.min(1, (time - started) / ASCENT_DURATION_MS);

      dispatch({ type: "SET_ASCENT_PROGRESS", progress });

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        dispatch({ type: "COMPLETE_ASCENT" });
      }
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [mode, transitionId]);

  const enterGround = () => {
    dispatch({ type: "ENTER_GROUND" });
    replaceUrl("ground");
  };

  const beginAscent = () => {
    dispatch({ type: "BEGIN_ASCENT" });
    replaceUrl("ascent");
  };

  return (
    <div
      data-testid="urai-spatial-stage"
      data-mode={mode}
      data-phase={phase}
      className={`spatial-stage mode-${mode} phase-${phase}`}
    >
      <div data-testid="urai-home-sky" className="bg-sky" aria-hidden>
        {Array.from({ length: SKY_BANDS }, (_, index) => (
          <b key={index} style={{ opacity: 0.22 - index * 0.03 }} />
        ))}
      </div>

      <div className="bg-nebula" style={{ transform: `translate3d(0, ${ascentProgress * -20}px, 0)` }} />

      <div
        className="bg-stars"
        aria-hidden
        style={{
          transform: `translate3d(0, ${ascentProgress * -44}px, 0) scale(${1 + ascentProgress * 0.08})`,
        }}
      >
        {stars.map((star, index) => (
          <i
            key={index}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              opacity: star.o,
              width: star.size,
              height: star.size,
            }}
          />
        ))}
      </div>

      {mode === "home" ? (
        <section data-testid="urai-home-scene" className="home-scene">
          <div data-testid="urai-home-horizon" className="home-horizon" />

          <button
            type="button"
            data-testid="urai-home-ground"
            className="home-ground"
            aria-label="Open Ground"
            onClick={enterGround}
          />

          <div data-testid="urai-home-body" className="home-body" />

          <div data-testid="urai-home-orb-shell" className="orb-shell">
            <button
              type="button"
              data-testid="urai-orb-button"
              className="orb-button"
              onClick={beginAscent}
              aria-label="Enter LifeMap"
            />
            <span className="orb-ring ring-a" />
            <span className="orb-ring ring-b" />
          </div>
        </section>
      ) : null}

      {mode === "ground" ? (
        <section data-testid="urai-ground-scene" className="ground-scene">
          <div className="ground-core" />
          <button type="button" className="ground-enter" onClick={beginAscent}>
            Ascend to LifeMap
          </button>
        </section>
      ) : null}

      {mode === "ascent" ? (
        <section
          data-testid="urai-ascent-cover"
          className="ascent-cover"
          style={{ opacity: 0.22 + ascentProgress * 0.78 }}
        >
          <div
            className="ascent-core"
            style={{
              transform: `translate(-50%, -50%) scale(${1 + ascentProgress * 1.5})`,
              opacity: 1 - ascentProgress * 0.4,
            }}
          />
        </section>
      ) : null}

      {mode === "lifemap" || mode === "focus" || mode === "replay" || mode === "mirror" ? (
        <section data-testid="urai-lifemap-scene" className="lifemap-scene" />
      ) : null}

      <style jsx>{`
        .spatial-stage{position:fixed;inset:0;z-index:0;background:#020617;overflow:hidden;color:#dbeafe}
        .bg-sky,.bg-nebula,.bg-stars,.home-scene,.ground-scene,.ascent-cover,.lifemap-scene{position:absolute;inset:0;transition:transform .3s ease}
        .bg-sky{background:linear-gradient(180deg,#020617 0%,#0f172a 48%,#111827 70%,#020617 100%)}
        .bg-sky b{position:absolute;left:-12%;right:-12%;height:24%;border-radius:50%;background:radial-gradient(circle at center,rgba(125,211,252,.24),transparent 70%);animation:skyShift 14s ease-in-out infinite alternate}
        .bg-sky b:nth-child(1){top:-8%}.bg-sky b:nth-child(2){top:8%}.bg-sky b:nth-child(3){top:22%}.bg-sky b:nth-child(4){top:38%}.bg-sky b:nth-child(5){top:58%}
        .bg-nebula{inset:-15%;background:radial-gradient(circle at 50% 40%,rgba(125,211,252,.20),transparent 35%),radial-gradient(circle at 82% 28%,rgba(196,181,253,.20),transparent 35%),radial-gradient(circle at 18% 80%,rgba(45,212,191,.12),transparent 33%);animation:drift 16s ease-in-out infinite alternate}
        .bg-stars i{position:absolute;border-radius:999px;background:#fff;box-shadow:0 0 12px #fff;animation:twinkle 2.6s ease-in-out infinite alternate}
        .home-horizon{position:absolute;left:-8%;right:-8%;top:56%;height:26%;border-radius:50%;background:radial-gradient(ellipse at center,rgba(125,211,252,.3),rgba(30,41,59,0) 70%);filter:blur(2px)}
        .home-ground{position:absolute;left:-15%;right:-15%;bottom:-35%;height:62%;border-radius:50%;background:radial-gradient(ellipse at top,rgba(15,23,42,.92) 0%,rgba(2,6,23,.98) 58%,#000 100%);box-shadow:inset 0 30px 90px rgba(125,211,252,.18);border:none;cursor:pointer}
        .ground-scene{display:grid;place-items:center;background:radial-gradient(circle at 50% 72%,rgba(15,23,42,.88),rgba(2,6,23,.95));backdrop-filter:blur(4px)}
        .ground-core{width:min(72vw,520px);height:min(34vh,280px);border-radius:50%;background:radial-gradient(ellipse at center,rgba(125,211,252,.22),rgba(2,6,23,.06) 70%);box-shadow:0 0 120px rgba(125,211,252,.28)}
        .ground-enter{position:absolute;bottom:13vh;border:1px solid rgba(191,219,254,.45);background:rgba(2,6,23,.7);color:#e0f2fe;border-radius:999px;padding:10px 16px;font-weight:700;cursor:pointer}
        .home-body{position:absolute;left:50%;top:58%;width:min(60vw,420px);aspect-ratio:1/1;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,#1d4ed8 0,#1e1b4b 55%,transparent 75%);filter:blur(2px)}
        .orb-shell{position:absolute;left:50%;top:58%;transform:translate(-50%,-50%);display:grid;place-items:center;width:180px;height:180px}
        .orb-button{width:94px;height:94px;border:none;border-radius:50%;background:radial-gradient(circle,#fff,#7dd3fc 60%,#1d4ed8);box-shadow:0 0 34px #7dd3fc,0 0 80px rgba(125,211,252,.5);cursor:pointer;z-index:2}
        .orb-ring{position:absolute;border:1px solid rgba(191,219,254,.42);border-radius:50%;animation:orbit 5.4s linear infinite}
        .ring-a{width:128px;height:128px}
        .ring-b{width:160px;height:160px;animation-direction:reverse;animation-duration:8.6s}
        .ascent-cover{display:block;background:linear-gradient(180deg,rgba(2,6,23,.14),rgba(2,6,23,.88))}
        .ascent-core{position:absolute;left:50%;top:58%;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,rgba(191,219,254,.9),rgba(59,130,246,.3),transparent 70%);filter:blur(1px)}
        @keyframes drift{from{transform:translate3d(0,0,0)}to{transform:translate3d(-2%,1%,0)}}
        @keyframes twinkle{from{opacity:.3;transform:scale(.8)}to{opacity:1;transform:scale(1.2)}}
        @keyframes orbit{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes skyShift{from{transform:translate3d(0,0,0)}to{transform:translate3d(2%,1%,0)}}
      `}</style>
    </div>
  );
}
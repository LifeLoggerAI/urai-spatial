"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type HomePortal =
  | "home"
  | "orb-chat"
  | "body-interior"
  | "brain-synapses"
  | "chest-heart"
  | "arms-motion"
  | "legs-movement"
  | "sky-life-map"
  | "ground-world";

type OrbVoiceState = "idle" | "listening" | "speaking" | "muted";
type OrbRouteHint = HomePortal | "home";
type BodyRegion = "head" | "torso" | "arms" | "legs";

type BodyMetric = { label: string; value: string; summary: string };
type BodySnapshot = {
  region: BodyRegion;
  title: string;
  subtitle: string;
  signal: string;
  metrics: BodyMetric[];
};

type BodyResponse = {
  snapshot: BodySnapshot;
  source: "mock" | "live-device" | "passive-inference";
  providerStatus: "ready" | "fallback";
  providerMessage: string;
  isDemoFallback: boolean;
};

const DEFAULT_USER_ID = "adamclamp";

const cameraTargets: Record<HomePortal, string> = {
  home: "home-wide",
  "orb-chat": "open-orb",
  "body-interior": "zoom-avatar",
  "brain-synapses": "zoom-head",
  "chest-heart": "zoom-torso",
  "arms-motion": "zoom-arms",
  "legs-movement": "zoom-legs",
  "sky-life-map": "rise-sky",
  "ground-world": "drop-ground",
};

const transitionPhase: Record<HomePortal, string> = {
  home: "wind-home",
  "orb-chat": "open-orb",
  "body-interior": "zoom-avatar",
  "brain-synapses": "zoom-head",
  "chest-heart": "zoom-torso",
  "arms-motion": "zoom-arms",
  "legs-movement": "zoom-legs",
  "sky-life-map": "rise-sky",
  "ground-world": "drop-ground",
};

const bodyPortalToRegion: Partial<Record<HomePortal, BodyRegion>> = {
  "brain-synapses": "head",
  "chest-heart": "torso",
  "arms-motion": "arms",
  "legs-movement": "legs",
};

const panelCopy: Record<HomePortal, { eyebrow: string; title: string; body: string }> = {
  home: {
    eyebrow: "URAI Spatial",
    title: "A passive spatial operating system for memory, body, sky, ground, and companion intelligence.",
    body: "The shell runs in local fallback mode until private providers are connected. The experience stays cinematic, privacy-aware, and stable.",
  },
  "orb-chat": {
    eyebrow: "Orb Companion",
    title: "The orb is open as a spatial navigator.",
    body: "Ask for brain, heart, movement, ground, sky, or home. When memory providers are unavailable, the orb stays in local fallback mode.",
  },
  "body-interior": {
    eyebrow: "Avatar Zoom",
    title: "Choose a body region to inspect passive signals.",
    body: "Head, torso, arms, and legs expose privacy-safe biometric and behavioral summaries with explicit provider status.",
  },
  "brain-synapses": {
    eyebrow: "Head Layer",
    title: "Brain synapses and focus load are visible.",
    body: "URAI Spatial reads this as supportive wellness context, not diagnosis or medical analysis.",
  },
  "chest-heart": {
    eyebrow: "Torso Layer",
    title: "Chest and heart rhythm are visible.",
    body: "Heart rate and breath signals are shown as a fallback seam until live wearable providers are connected.",
  },
  "arms-motion": {
    eyebrow: "Arms Layer",
    title: "Device strain and action traces are visible.",
    body: "This layer is designed for passive interaction load, typing strain, and device behavior signals.",
  },
  "legs-movement": {
    eyebrow: "Legs Layer",
    title: "Movement and grounding are visible.",
    body: "Grounding is presented as a gentle mobility signal, never as a clinical claim.",
  },
  "sky-life-map": {
    eyebrow: "Sky LifeMap",
    title: "The sky opens into memory threads and forecast paths.",
    body: "This preview links into the full LifeMap while keeping seasonal, recovery, and mood-weather seams explicit.",
  },
  "ground-world": {
    eyebrow: "Ground World",
    title: "Room anchors, object memories, and place context are visible.",
    body: "AR and WebXR are exposed as future seams only; this page does not claim live device camera anchoring.",
  },
};

const routeLabels: Partial<Record<OrbRouteHint, string>> = {
  home: "Wind home",
  "brain-synapses": "Open Head",
  "chest-heart": "Open Torso",
  "arms-motion": "Open Arms",
  "legs-movement": "Open Legs",
  "sky-life-map": "Open Sky",
  "ground-world": "Open Ground",
  "body-interior": "Open Avatar",
};

function portalFromRouteHint(routeHint?: string): OrbRouteHint | null {
  const valid: OrbRouteHint[] = ["home", "brain-synapses", "chest-heart", "arms-motion", "legs-movement", "sky-life-map", "ground-world", "body-interior"];
  return valid.includes(routeHint as OrbRouteHint) ? (routeHint as OrbRouteHint) : null;
}

function SpatialTarget({ label, portal, onSelect }: { label: string; portal: HomePortal; onSelect: (portal: HomePortal) => void }) {
  return (
    <button type="button" className="spatial-target" data-urai-home-target={portal === "orb-chat" ? "orb" : portal === "body-interior" ? "avatar" : portal === "sky-life-map" ? "sky" : portal === "ground-world" ? "ground" : portal.replace("brain-synapses", "head").replace("chest-heart", "torso").replace("arms-motion", "arms").replace("legs-movement", "legs")} onClick={() => onSelect(portal)}>
      {label}
    </button>
  );
}

function PassiveOrbBadge() {
  return (
    <aside className="passive-orb" data-urai-orb-listening="passive" aria-label="URAI orb passive listening status">
      <span aria-hidden="true" />
      <strong>Orb listening passively</strong>
      <p>Private providers are not required for this demo shell.</p>
    </aside>
  );
}

function OrbVoiceControls({ state, setState }: { state: OrbVoiceState; setState: (state: OrbVoiceState) => void }) {
  return (
    <div className="orb-voice" data-urai-orb-voice="scaffold" data-urai-orb-voice-state={state} data-urai-orb-voice-provider="browser-stt-tts-ready">
      <button type="button" data-urai-orb-voice-action="listen" onClick={() => setState("listening")}>Listen</button>
      <button type="button" data-urai-orb-voice-action="stop" onClick={() => setState("speaking")}>Stop</button>
      <button type="button" data-urai-orb-voice-action="mute" onClick={() => setState("muted")}>Mute</button>
      <button type="button" data-urai-orb-voice-action="reset" onClick={() => setState("idle")}>Reset</button>
    </div>
  );
}

function OrbChatPanel({ userId, onNavigate }: { userId: string; onNavigate: (route: OrbRouteHint) => void }) {
  const [voiceState, setVoiceState] = useState<OrbVoiceState>("idle");
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("I can route you through home, body, sky, ground, or LifeMap without sending private data.");
  const [routeHint, setRouteHint] = useState<OrbRouteHint | null>(null);
  const [thinking, setThinking] = useState(false);

  async function sendMessage() {
    if (thinking) return;
    const message = input.trim();
    setThinking(true);
    setRouteHint(null);
    try {
      const response = await fetch("/api/orb-companion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, message }),
      });
      const payload = await response.json() as { reply?: string; routeHint?: string };
      setReply(payload.reply ?? "URAI Spatial is using a local fallback reply.");
      setRouteHint(portalFromRouteHint(payload.routeHint));
    } catch {
      setReply("URAI Spatial could not reach the orb route, so local fallback remains active.");
    } finally {
      setInput("");
      setThinking(false);
    }
  }

  const actionLabel = routeHint ? routeLabels[routeHint] : null;

  return (
    <aside className="orb-panel" data-urai-orb-chat="shell" data-urai-orb-mode="chat" data-urai-orb-api="/api/orb-companion" data-urai-orb-user={userId} aria-label="URAI Orb Companion chat">
      <div className="eyebrow">Orb Companion</div>
      <h2>Spatial navigator is open</h2>
      <p>Memory-grounded mode is available when private URAI providers are connected. This shell is safe in fallback mode.</p>
      <OrbVoiceControls state={voiceState} setState={setVoiceState} />
      {thinking ? <div data-urai-orb-thinking="true" className="thinking">URAI is reading the route...</div> : null}
      <div className="orb-reply" data-urai-orb-message-role="assistant">{reply}</div>
      {routeHint && actionLabel ? <button type="button" data-urai-orb-route-action={routeHint} className="route-action" onClick={() => onNavigate(routeHint)}>{actionLabel}</button> : null}
      <label className="message-label">
        <span>Message URAI</span>
        <input aria-label="Message URAI" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void sendMessage(); }} placeholder="Ask for brain, heart, sky, ground, or home" />
      </label>
      <button type="button" onClick={() => void sendMessage()}>Send</button>
    </aside>
  );
}

function BodyBiometricPanel({ portal, userId }: { portal: HomePortal; userId: string }) {
  const region = bodyPortalToRegion[portal];
  const [response, setResponse] = useState<BodyResponse | null>(null);

  useEffect(() => {
    if (!region) return;
    let cancelled = false;
    fetch("/api/body-biometric", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, portal, source: "mock" }),
    })
      .then((result) => result.json() as Promise<BodyResponse>)
      .then((payload) => { if (!cancelled) setResponse(payload); })
      .catch(() => { if (!cancelled) setResponse(null); });
    return () => { cancelled = true; };
  }, [portal, region, userId]);

  if (!region) return null;
  const snapshot = response?.snapshot;
  const metrics = snapshot?.metrics ?? [];

  return (
    <aside className="body-panel" data-urai-body-biometric-panel={region} data-urai-body-biometric-source={response?.source ?? "mock"} data-urai-body-biometric-provider={response?.providerStatus ?? "fallback"} data-urai-body-biometric-api="/api/body-biometric" aria-label={`${region} biometric panel`}>
      <div className="eyebrow">{snapshot?.title ?? `${region} signals`}</div>
      <h2>{snapshot?.subtitle ?? "Provider fallback is active"}</h2>
      <p>{snapshot?.signal ?? "URAI Spatial is showing privacy-safe demo signal data."}</p>
      <small>{response?.providerMessage ?? "Biometric provider seam is waiting for a connected source."}</small>
      <div className="metric-grid">
        {metrics.map((metric) => <div key={metric.label} data-urai-body-metric={metric.label} className="metric"><strong>{metric.label}</strong><span>{metric.value}</span><p>{metric.summary}</p></div>)}
      </div>
    </aside>
  );
}

function SkyPanel() {
  return (
    <aside className="layer-panel" data-urai-sky-life-map="scaffold" data-urai-sky-life-map-mode="constellation-timeline" aria-label="Sky LifeMap preview">
      <div className="eyebrow">Sky Layer</div>
      <h2>LifeMap preview</h2>
      <p>Memory threads, forecast paths, emotional weather, seasonal arcs, and recovery seams are ready for connected URAI data.</p>
      <div className="node-row"><span data-urai-sky-node="memory-thread">Memory thread</span><span data-urai-sky-node="forecast-path">Forecast path</span><span data-urai-sky-node="seasonal-arc">Seasonal arc</span></div>
      <Link href="/life-map">Open full LifeMap</Link>
    </aside>
  );
}

function GroundPanel() {
  return (
    <aside className="layer-panel" data-urai-ground-world="scaffold" data-urai-ground-world-mode="object-memory-renderer" aria-label="Ground world preview">
      <div className="eyebrow">Ground Layer</div>
      <h2>World and object memory</h2>
      <p>Room anchors, object memories, routine paths, and place context are ready. AR/WebXR is represented as a documented future seam.</p>
      <div className="node-row"><span data-urai-ground-object="room-anchor">Room anchor</span><span data-urai-ground-object="object-memory">Object memory</span><span data-urai-ground-object="routine-path">Routine path</span></div>
    </aside>
  );
}

export default function SpatialHomeShell({ userId = DEFAULT_USER_ID }: { userId?: string }) {
  const [portal, setPortal] = useState<HomePortal>("home");
  const cameraTarget = cameraTargets[portal];
  const panel = panelCopy[portal];
  const isAvatarZoom = portal === "body-interior";
  const bodyTargetsVisible = portal === "body-interior";

  const selectPortal = useCallback((next: HomePortal) => setPortal(next), []);
  const goHome = useCallback(() => setPortal("home"), []);
  const handleRoute = useCallback((route: OrbRouteHint) => setPortal(route === "home" ? "home" : route), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") goHome(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goHome]);

  const targets = useMemo(() => bodyTargetsVisible ? [
    ["Head", "brain-synapses" as const],
    ["Torso", "chest-heart" as const],
    ["Arms", "arms-motion" as const],
    ["Legs", "legs-movement" as const],
  ] : [
    ["Orb", "orb-chat" as const],
    ["Avatar / Zoom In", "body-interior" as const],
    ["Sky", "sky-life-map" as const],
    ["Ground", "ground-world" as const],
  ], [bodyTargetsVisible]);

  return (
    <main className="urai-home-shell" data-testid="urai-home-scene" data-urai-home-spatial-shell="true" data-urai-camera-target={cameraTarget} data-urai-transition-phase={transitionPhase[portal]} data-urai-avatar-state={isAvatarZoom ? "zoomed-region-select" : "home-or-layer"}>
      <div className="space-gradient" aria-hidden />
      <div className="star star-a" aria-hidden />
      <div className="star star-b" aria-hidden />
      <div className="avatar" aria-hidden><span /><i /></div>
      <div className="orb" aria-hidden />
      <div className="ground" aria-hidden />
      {portal === "home" ? <PassiveOrbBadge /> : null}
      <nav className="target-bar" aria-label="URAI Spatial targets">
        {targets.map(([label, target]) => <SpatialTarget key={target} label={label} portal={target} onSelect={selectPortal} />)}
      </nav>
      {portal === "orb-chat" ? <OrbChatPanel userId={userId} onNavigate={handleRoute} /> : null}
      {portal === "sky-life-map" ? <SkyPanel /> : null}
      {portal === "ground-world" ? <GroundPanel /> : null}
      <BodyBiometricPanel portal={portal} userId={userId} />
      <section className="home-panel" data-urai-home-panel={portal} aria-live="polite">
        <div className="eyebrow">{panel.eyebrow}</div>
        <h1>{panel.title}</h1>
        <p>{panel.body}</p>
        {portal !== "home" ? <button type="button" onClick={goHome}>Wind back home</button> : null}
      </section>
      <style jsx>{`
        .urai-home-shell { position: fixed; inset: 0; overflow: hidden; color: white; background: #03040d; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
        .space-gradient { position: absolute; inset: 0; background: radial-gradient(circle at 50% 18%, rgba(93,147,255,.34), transparent 28%), linear-gradient(180deg,#10163a 0%, #060713 52%, #020307 100%); }
        .star { position: absolute; width: 7px; height: 7px; border-radius: 999px; background: white; box-shadow: 0 0 28px rgba(180,220,255,.9); }
        .star-a { left: 28%; top: 22%; } .star-b { right: 23%; top: 31%; width: 5px; height: 5px; }
        .avatar { position: absolute; left: 50%; top: 47%; width: 130px; height: 270px; transform: translate(-50%, -50%); filter: drop-shadow(0 0 50px rgba(129,160,255,.5)); }
        .avatar span { position: absolute; left: 40px; top: 0; width: 50px; height: 50px; border-radius: 999px; background: rgba(225,235,255,.92); }
        .avatar i { position: absolute; left: 26px; top: 58px; width: 78px; height: 150px; border-radius: 42px; background: linear-gradient(180deg, rgba(132,164,255,.9), rgba(90,110,210,.5)); }
        .orb { position: absolute; right: 29%; top: 36%; width: 58px; height: 58px; border-radius: 999px; background: radial-gradient(circle, #fff, #7defff 45%, rgba(36,188,255,.18) 72%); box-shadow: 0 0 60px rgba(108,235,255,.8); }
        .ground { position: absolute; left: 50%; bottom: -18%; width: 120vw; height: 36vh; transform: translateX(-50%); border-radius: 50% 50% 0 0; background: radial-gradient(circle at 50% 0%, rgba(106,119,169,.34), rgba(10,14,28,.95) 55%); }
        .passive-orb, .home-panel, .orb-panel, .body-panel, .layer-panel { position: absolute; z-index: 5; border: 1px solid rgba(255,255,255,.16); border-radius: 28px; background: rgba(7,10,22,.72); backdrop-filter: blur(18px); box-shadow: 0 24px 80px rgba(0,0,0,.38); }
        .passive-orb { right: 24px; top: 24px; width: min(360px, calc(100vw - 48px)); padding: 16px; }
        .passive-orb span { display: inline-block; width: 10px; height: 10px; margin-right: 10px; border-radius: 999px; background: #7defff; box-shadow: 0 0 20px #7defff; }
        .home-panel { left: 24px; right: 24px; bottom: 24px; max-width: 690px; padding: 22px; }
        .home-panel h1, .orb-panel h2, .body-panel h2, .layer-panel h2 { margin: 8px 0; line-height: 1.05; }
        .home-panel h1 { font-size: clamp(28px, 4vw, 54px); }
        .home-panel p, .orb-panel p, .body-panel p, .layer-panel p { color: rgba(255,255,255,.76); line-height: 1.55; }
        .eyebrow { color: rgba(126,239,255,.85); font-size: 12px; letter-spacing: .18em; text-transform: uppercase; }
        .target-bar { position: absolute; z-index: 6; left: 50%; top: 24px; transform: translateX(-50%); display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; width: min(720px, calc(100vw - 48px)); }
        .spatial-target, .home-panel button, .orb-panel button, .layer-panel a { border: 1px solid rgba(255,255,255,.18); border-radius: 999px; background: rgba(255,255,255,.12); color: white; padding: 10px 14px; cursor: pointer; text-decoration: none; }
        .spatial-target:focus-visible, button:focus-visible, input:focus-visible, a:focus-visible { outline: 2px solid #7defff; outline-offset: 3px; }
        .orb-panel { right: 24px; top: 92px; width: min(440px, calc(100vw - 48px)); padding: 16px; }
        .orb-voice { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
        .orb-reply, .thinking { border: 1px solid rgba(125,239,255,.18); border-radius: 18px; padding: 10px 12px; background: rgba(125,239,255,.09); margin: 8px 0; }
        .message-label { display: grid; gap: 6px; margin-top: 12px; font-size: 12px; color: rgba(255,255,255,.68); }
        .message-label input { border-radius: 999px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08); color: white; padding: 11px 13px; }
        .route-action { margin: 8px 0; }
        .body-panel { left: 24px; top: 92px; width: min(400px, calc(100vw - 48px)); padding: 16px; }
        .metric-grid { display: grid; gap: 8px; margin-top: 12px; }
        .metric { border: 1px solid rgba(255,255,255,.12); border-radius: 18px; padding: 10px; background: rgba(255,255,255,.06); }
        .metric span { float: right; color: #dffaff; }
        .metric p { clear: both; margin: 6px 0 0; font-size: 12px; }
        .layer-panel { right: 24px; top: 92px; width: min(460px, calc(100vw - 48px)); padding: 18px; }
        .node-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
        .node-row span { border-radius: 999px; border: 1px solid rgba(255,255,255,.16); padding: 8px 10px; background: rgba(255,255,255,.08); }
        @media (max-width: 720px) { .target-bar { top: env(safe-area-inset-top, 12px); } .passive-orb, .orb-panel, .layer-panel, .body-panel { top: auto; right: 12px; left: 12px; bottom: 190px; width: auto; } .home-panel { left: 12px; right: 12px; bottom: 12px; } }
        @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; animation-duration: .01ms !important; transition-duration: .01ms !important; } }
      `}</style>
    </main>
  );
}

"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, type FocusEvent } from "react";
import * as THREE from "three";
import { useWebGLAvailable } from "./HomeSpatialCanvas";
import { MobileMovementPad, MovementHelp, useDragLook, useMovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { useAdaptiveSpatialQuality } from "@/spatial/performance/useAdaptiveSpatialQuality";
import { DESTINATIONS, STATE_LABEL, type GroundDestination } from "./ground/GroundWorldModel";
import { EmbodiedGroundScene } from "./ground/EmbodiedGroundScene";
import GroundContinuityArchitecture from "./ground/GroundContinuityArchitecture";

type WebGLState = "ready" | "lost" | "recovering" | "failed";
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

function GroundWebGLBridge({ onStateChange }: { onStateChange: (state: WebGLState) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    let timer: number | null = null;
    let attempts = 0;
    const clear = () => { if (timer !== null) window.clearTimeout(timer); timer = null; };
    const lost = (event: Event) => {
      event.preventDefault();
      clear();
      onStateChange("lost");
      attempts += 1;
      timer = window.setTimeout(() => onStateChange(attempts > 1 ? "failed" : "recovering"), 300);
    };
    const restored = () => { clear(); attempts = 0; onStateChange("ready"); };
    canvas.addEventListener("webglcontextlost", lost, false);
    canvas.addEventListener("webglcontextrestored", restored, false);
    onStateChange("ready");
    return () => {
      clear();
      canvas.removeEventListener("webglcontextlost", lost, false);
      canvas.removeEventListener("webglcontextrestored", restored, false);
    };
  }, [gl, onStateChange]);
  return null;
}

function GroundSemanticFallback({ reason }: { reason: "unsupported" | "failed" }) {
  return <main className="ground-fallback" data-testid="urai-ground-accessible-fallback" data-ground-fallback={reason}>
    <section>
      <span>URAI Ground · semantic continuity</span>
      <h1>Private infrastructure remains available.</h1>
      <p>{reason === "unsupported" ? "This device cannot open the 3D renderer." : "The 3D renderer could not recover safely."} Every Ground destination remains directly accessible.</p>
      <nav aria-label="Ground fallback destinations">
        {DESTINATIONS.map((destination) => <a key={destination.id} href={destination.href}><strong>{destination.label}</strong><small>{destination.detail} · {STATE_LABEL[destination.workforceState]}</small></a>)}
      </nav>
      <a className="return-home" href="/home?returnFrom=ground">Return Home</a>
    </section>
    <style jsx>{`
      .ground-fallback{position:fixed;inset:0;overflow:auto;background:radial-gradient(circle at 50% 10%,#102838,#020812 58%);color:#f5fbff;font-family:Inter,system-ui;padding:max(28px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(28px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left))}.ground-fallback section{width:min(920px,100%);margin:auto;display:grid;gap:18px}.ground-fallback span{font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:#a5f3fc}.ground-fallback h1{font-size:clamp(34px,7vw,72px);line-height:.94;margin:0}.ground-fallback p{max-width:680px;color:rgba(226,244,255,.74);line-height:1.55}.ground-fallback nav{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.ground-fallback nav a{min-height:76px;display:grid;align-content:center;gap:6px;padding:14px 16px;border:1px solid rgba(207,250,254,.18);border-radius:18px;background:rgba(8,24,38,.72);color:#fff;text-decoration:none}.ground-fallback nav small{color:rgba(218,240,250,.66)}.return-home{width:max-content;min-height:48px;display:flex;align-items:center;padding:0 18px;border:1px solid rgba(207,250,254,.3);border-radius:999px;color:#fff;text-decoration:none}
    `}</style>
  </main>;
}

/* Ground source-graph contract. The shared continuity architecture is the visible environment owner. EmbodiedGroundScene owns walkable paths, collision-aware camera movement, click-to-walk, chamber approach and threshold crossing. The destination rail remains the semantic direct-navigation owner. */
export default function GroundSpatialWorldClean() {
  const router = useRouter();
  const profile = useAdaptiveSpatialQuality();
  const webglAvailable = useWebGLAvailable();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nearby, setNearby] = useState<GroundDestination | null>(null);
  const [moving, setMoving] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [webglState, setWebglState] = useState<WebGLState>("ready");
  const [rendererKey, setRendererKey] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const navigationTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAudioId = useRef<string | null>(null);
  const yaw = useRef(0);
  const pitch = useRef(-0.05);
  const walkTarget = useRef<THREE.Vector3 | null>(null);
  const nearbyId = useRef<string | null>(null);
  const active = DESTINATIONS.find((destination) => destination.id === activeId) ?? null;

  const clearNavigationTimer = useCallback(() => {
    if (navigationTimerRef.current === null) return;
    window.clearTimeout(navigationTimerRef.current);
    navigationTimerRef.current = null;
  }, []);

  const playSpatialCue = useCallback((destination?: GroundDestination | null) => {
    if (!audioEnabled) return;
    const AudioContextCtor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = audioContextRef.current ?? new AudioContextCtor();
    audioContextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const pan = context.createStereoPanner?.();
    const index = destination ? Math.max(0, DESTINATIONS.findIndex((candidate) => candidate.id === destination.id)) : 0;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(220 + index * 18, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.34);
    if (pan) {
      pan.pan.value = destination ? THREE.MathUtils.clamp(destination.position[0] / 12, -0.7, 0.7) : 0;
      oscillator.connect(gain).connect(pan).connect(context.destination);
    } else oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.36);
  }, [audioEnabled]);

  const navigate = useCallback((destination: GroundDestination) => {
    setActiveId(destination.id);
    playSpatialCue(destination);
    clearNavigationTimer();
    navigationTimerRef.current = window.setTimeout(() => {
      navigationTimerRef.current = null;
      router.push(destination.href, { scroll: false });
    }, profile.reducedMotion ? 0 : 360);
  }, [clearNavigationTimer, playSpatialCue, profile.reducedMotion, router]);

  const resetOrientation = useCallback(() => {
    yaw.current = 0;
    pitch.current = -0.05;
    walkTarget.current = null;
    nearbyId.current = null;
    setNearby(null);
    setMoving(false);
    setResetVersion((value) => value + 1);
  }, []);

  const input = useMovementInput({
    onEscape: () => {
      clearNavigationTimer();
      router.push("/home?returnFrom=ground");
    },
    onInteract: () => {
      const destination = DESTINATIONS.find((candidate) => candidate.id === nearbyId.current);
      if (destination) navigate(destination);
    },
    onReset: resetOrientation,
  });
  const look = useDragLook({ yaw, pitch, sensitivity: profile.reducedMotion ? 0.0022 : 0.0036, onDragState: setDragging });

  useEffect(() => {
    const syncLocation = () => {
      const requested = new URLSearchParams(window.location.search).get("district");
      setActiveId(requested && DESTINATIONS.some((destination) => destination.id === requested) ? requested : null);
    };
    syncLocation();
    window.addEventListener("popstate", syncLocation);
    return () => {
      window.removeEventListener("popstate", syncLocation);
      clearNavigationTimer();
    };
  }, [clearNavigationTimer]);

  useEffect(() => () => {
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  }, []);

  useEffect(() => {
    if (webglState !== "recovering") return;
    const timer = window.setTimeout(() => setRendererKey((value) => value + 1), 420);
    return () => window.clearTimeout(timer);
  }, [webglState]);

  if (webglAvailable === false) return <GroundSemanticFallback reason="unsupported" />;
  if (webglState === "failed") return <GroundSemanticFallback reason="failed" />;

  const prompt = nearby
    ? `${nearby.label}: cross the threshold`
    : moving
      ? "Moving through Ground"
      : active
        ? `Approach ${active.label} or use direct travel`
        : webglState === "recovering"
          ? "Restoring Ground safely"
          : "Arrival hall · Ground Nexus ahead";

  return (
    <main
      className="ground-spatial-root"
      aria-label="URAI Ground embodied private infrastructure"
      data-testid="urai-ground-private-workforce-world"
      data-ground-visual-owner="shared-continuity-architecture"
      data-ground-no-compositing-bands="true"
      data-ground-exploration="walkable"
      data-ground-pointer-lock="false"
      data-ground-quality-tier={profile.tier}
      data-webgl-state={webglState}
      data-ground-camera-mode={dragging ? "look" : moving ? "walking" : "embodied-idle"}
      {...look}
    >
      <div className="ground-atmosphere" aria-hidden="true" />
      <div className="ground-title" aria-hidden="true">
        <span>URAI Ground</span>
        <strong>Private infrastructure, embodied.</strong>
        <em>{active ? `${active.layer} layer · ${active.signature}` : "Arrival hall · Ground Nexus ahead"}</em>
      </div>
      <Suspense fallback={<div className="ground-loader" role="status">Opening the protected Ground</div>}>
        <Canvas
          key={rendererKey}
          dpr={[1, profile.pixelRatioMax]}
          frameloop={profile.documentVisible ? "always" : "never"}
          shadows={profile.shadows}
          gl={{ antialias: profile.antialias, alpha: false, powerPreference: "high-performance" }}
          onCreated={({ gl }) => gl.setClearColor(0x020812, 1)}
          onPointerMissed={() => { if (!nearby) setActiveId(null); }}
        >
          <GroundWebGLBridge onStateChange={setWebglState} />
          <GroundContinuityArchitecture />
          <EmbodiedGroundScene
            active={active}
            input={input}
            yaw={yaw}
            pitch={pitch}
            walkTarget={walkTarget}
            nearbyId={nearbyId}
            resetVersion={resetVersion}
            reducedMotion={profile.reducedMotion}
            onApproach={(destination) => setActiveId(destination.id)}
            onEnter={navigate}
            onNearbyChange={(destination) => {
              setNearby(destination);
              if (destination) {
                setActiveId(destination.id);
                if (lastAudioId.current !== destination.id) {
                  lastAudioId.current = destination.id;
                  playSpatialCue(destination);
                }
              } else lastAudioId.current = null;
            }}
            onMovementState={setMoving}
          />
        </Canvas>
      </Suspense>
      <div className="ground-movement-prompt" role="status" aria-live="polite"><strong>{prompt}</strong><span>{nearby ? "Press Enter or tap again" : "WASD / arrows · click ground · drag to look"}</span></div>
      <MovementHelp realm="Ground" summary="Walk the arrival hall through the Nexus and approach a chamber threshold. Essential destinations always remain directly available below." controls="WASD or arrows move. Click ground to walk. Drag to look. Enter crosses a nearby threshold. R resets. Escape returns Home." />
      <MobileMovementPad input={input} label="Ground movement controls" />
      <div className="ground-utility-controls" data-movement-ui="true">
        <button type="button" onClick={() => router.push("/home?returnFrom=ground")}>Return Home</button>
        <button type="button" aria-pressed={audioEnabled} onClick={() => { setAudioEnabled((value) => !value); if (!audioEnabled) window.setTimeout(() => playSpatialCue(active), 0); }}>{audioEnabled ? "Mute spatial cues" : "Enable spatial cues"}</button>
        <button type="button" onClick={resetOrientation}>Reset view</button>
      </div>
      <nav className="ground-destination-compass ground-rail" data-movement-ui="true" aria-label="Ground destinations">
        {DESTINATIONS.map((destination, index) => {
          const shared = {
            "data-ground-destination": destination.id,
            "data-workforce-state": destination.workforceState,
            "data-service-availability": destination.availability,
            "data-ground-layer": destination.layer,
            "aria-label": `${destination.label}. ${destination.detail}. ${destination.signature}. ${destination.emotionalSentence} Workforce state: ${STATE_LABEL[destination.workforceState]}. Service: ${destination.availability}. Direct travel.`,
            onFocus: (event: FocusEvent<HTMLElement>) => {
              setActiveId(destination.id);
              event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
            },
            onMouseEnter: () => setActiveId(destination.id),
          };
          const content = <><span aria-hidden="true" style={{ background: destination.color }} /><strong>{destination.label}</strong><i aria-hidden="true">{destination.workforceState === "blocked" ? "×" : destination.ownerBoundary ? "○" : "·"}</i></>;
          if (index < 5) return <a key={destination.id} href={destination.href} aria-current={activeId === destination.id ? "page" : undefined} {...shared} onClick={(event) => { event.preventDefault(); navigate(destination); }}>{content}</a>;
          return <button key={destination.id} type="button" aria-current={activeId === destination.id ? "location" : undefined} {...shared} onClick={() => navigate(destination)}>{content}</button>;
        })}
      </nav>
      <p className="ground-accessible-instruction">Walk with WASD or arrow keys, click valid ground to move, drag to look, press Enter at a nearby threshold, use the destination controls for direct travel, press R to reset orientation, and Escape to return Home.</p>
      <style jsx>{`
        .ground-spatial-root{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:#020812;color:#f8fbff;isolation:isolate;outline:none;font-family:Inter,ui-sans-serif,system-ui;touch-action:none;cursor:grab}.ground-spatial-root[data-ground-camera-mode='look']{cursor:grabbing}
        .ground-atmosphere{position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(180deg,rgba(2,8,18,.02),rgba(2,8,18,.12) 62%,rgba(2,8,18,.44)),radial-gradient(circle at 50% 22%,rgba(90,223,255,.08),transparent 34%),radial-gradient(circle at 18% 50%,rgba(157,120,255,.06),transparent 30%);mix-blend-mode:screen}
        .ground-title{position:absolute;top:max(20px,env(safe-area-inset-top));left:max(22px,env(safe-area-inset-left));z-index:5;display:grid;gap:4px;pointer-events:none;text-shadow:0 12px 40px rgba(0,0,0,.72)}
        .ground-title span{font:800 10px/1 Inter,system-ui;letter-spacing:.24em;text-transform:uppercase;color:rgba(165,243,252,.82)}.ground-title strong{font:800 clamp(18px,2.2vw,30px)/1.05 Inter,system-ui;letter-spacing:-.035em;color:rgba(247,253,255,.92)}.ground-title em{font:700 10px/1.2 Inter,system-ui;font-style:normal;letter-spacing:.08em;text-transform:uppercase;color:rgba(203,239,255,.58)}
        .ground-spatial-root canvas{position:absolute!important;inset:0;z-index:1;display:block;width:100%!important;height:100%!important;touch-action:none}.ground-loader{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:#020812;color:rgba(226,246,255,.78);letter-spacing:.16em;text-transform:uppercase;font-size:12px}
        .ground-movement-prompt{position:absolute;left:50%;bottom:max(90px,calc(env(safe-area-inset-bottom) + 80px));z-index:7;transform:translateX(-50%);display:grid;gap:3px;min-width:min(430px,calc(100vw - 32px));padding:10px 16px;border:1px solid rgba(207,250,254,.18);border-radius:18px;background:rgba(2,10,22,.62);backdrop-filter:blur(16px);text-align:center;pointer-events:none}.ground-movement-prompt strong{font:800 11px/1.2 Inter,system-ui;letter-spacing:.08em;text-transform:uppercase}.ground-movement-prompt span{font:600 10px/1.3 Inter,system-ui;color:rgba(199,235,247,.66)}
        .ground-utility-controls{position:absolute;left:max(14px,env(safe-area-inset-left));top:max(78px,calc(env(safe-area-inset-top) + 62px));z-index:31;display:flex;gap:7px}.ground-utility-controls button{min-height:48px;padding:0 14px;border:1px solid rgba(174,225,255,.18);border-radius:999px;background:rgba(2,12,26,.68);color:#fff;font:750 10px/1 Inter,system-ui;backdrop-filter:blur(14px);touch-action:manipulation}.ground-utility-controls button:focus-visible{outline:3px solid #fff;outline-offset:2px}
        .ground-destination-compass{position:absolute;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:9;display:flex;justify-content:center;gap:6px;overflow-x:auto;padding:6px;scrollbar-width:none;touch-action:pan-x;scroll-padding-inline-start:max(14px,env(safe-area-inset-left));scroll-padding-inline-end:max(14px,env(safe-area-inset-right))}.ground-destination-compass::-webkit-scrollbar{display:none}
        .ground-destination-compass :is(a,button){display:inline-flex;scroll-margin-inline:12px;flex:0 0 auto;align-items:center;gap:7px;min-height:48px;max-width:48px;padding:8px 12px;border:1px solid rgba(174,225,255,.14);border-radius:999px;background:linear-gradient(180deg,rgba(11,28,43,.82),rgba(1,7,18,.82));color:rgba(239,249,255,.8);font:700 10px/1 Inter,system-ui;cursor:pointer;text-decoration:none;white-space:nowrap;overflow:hidden;transition:max-width .22s ease,border-color .18s ease,transform .18s ease}
        .ground-destination-compass :is(a,button):hover,.ground-destination-compass :is(a,button):focus-visible,.ground-destination-compass :is(a,button)[aria-current]{max-width:220px;border-color:rgba(207,250,254,.72);color:#fff;outline:3px solid rgba(255,255,255,.9);outline-offset:2px;transform:translateY(-2px)}
        .ground-destination-compass :is(a,button) span{width:8px;height:8px;flex:0 0 auto;border-radius:50%}.ground-destination-compass :is(a,button) strong{opacity:0;max-width:0;overflow:hidden}.ground-destination-compass :is(a,button):hover strong,.ground-destination-compass :is(a,button):focus-visible strong,.ground-destination-compass :is(a,button)[aria-current] strong{opacity:1;max-width:170px}.ground-destination-compass i{font-style:normal;font-size:12px}
        .ground-accessible-instruction{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
        @media(max-width:700px){.ground-title{top:max(15px,env(safe-area-inset-top));left:max(16px,env(safe-area-inset-left))}.ground-title strong{font-size:18px}.ground-utility-controls{left:max(10px,env(safe-area-inset-left));right:max(10px,env(safe-area-inset-right));top:max(72px,calc(env(safe-area-inset-top) + 56px));overflow-x:auto}.ground-utility-controls button{flex:0 0 auto}.ground-movement-prompt{bottom:max(238px,calc(env(safe-area-inset-bottom) + 228px));min-width:min(320px,calc(100vw - 24px))}.ground-destination-compass{justify-content:flex-start;bottom:max(10px,env(safe-area-inset-bottom));padding-inline:max(14px,env(safe-area-inset-left)) max(14px,env(safe-area-inset-right))}.ground-destination-compass :is(a,button){min-height:48px;max-width:46px;padding:7px 10px;font-size:9px;transition:none}}
        @media(prefers-reduced-motion:reduce){.ground-atmosphere{mix-blend-mode:normal}.ground-destination-compass :is(a,button){transition:none!important;transform:none!important}.ground-destination-compass :is(a,button) strong{transition:none}.ground-utility-controls button{backdrop-filter:none}}
      `}</style>
    </main>
  );
}

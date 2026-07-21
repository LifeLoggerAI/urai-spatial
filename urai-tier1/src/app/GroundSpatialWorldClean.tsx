"use client";

import { Canvas } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, type FocusEvent } from "react";
import * as THREE from "three";
import { MobileMovementPad, MovementHelp, useDragLook, useMovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { DESTINATIONS, STATE_LABEL, type GroundDestination } from "./ground/GroundWorldModel";
import { EmbodiedGroundScene } from "./ground/EmbodiedGroundScene";
import GroundContinuityArchitecture from "./ground/GroundContinuityArchitecture";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/* Ground source-graph contract. The shared continuity architecture is the visible environment owner. EmbodiedGroundScene owns walkable paths, collision-aware camera movement, click-to-walk, chamber approach and threshold crossing. The destination rail remains the semantic direct-navigation owner. */
export default function GroundSpatialWorldClean() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nearby, setNearby] = useState<GroundDestination | null>(null);
  const [moving, setMoving] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [dragging, setDragging] = useState(false);
  const navigationTimerRef = useRef<number | null>(null);
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

  const navigate = useCallback((destination: GroundDestination) => {
    setActiveId(destination.id);
    clearNavigationTimer();
    navigationTimerRef.current = window.setTimeout(() => {
      navigationTimerRef.current = null;
      router.push(destination.href);
    }, reducedMotion ? 0 : 360);
  }, [clearNavigationTimer, reducedMotion, router]);

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
  const look = useDragLook({ yaw, pitch, sensitivity: reducedMotion ? 0.0022 : 0.0036, onDragState: setDragging });

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("district");
    if (requested && DESTINATIONS.some((destination) => destination.id === requested)) setActiveId(requested);
    return clearNavigationTimer;
  }, [clearNavigationTimer]);

  const prompt = nearby
    ? `${nearby.label}: cross the threshold`
    : moving
      ? "Moving through Ground"
      : active
        ? `Approach ${active.label} or use direct travel`
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
          dpr={[1, 1.45]}
          shadows
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onCreated={({ gl }) => gl.setClearColor(0x020812, 1)}
          onPointerMissed={() => { if (!nearby) setActiveId(null); }}
        >
          <GroundContinuityArchitecture />
          <EmbodiedGroundScene
            active={active}
            input={input}
            yaw={yaw}
            pitch={pitch}
            walkTarget={walkTarget}
            nearbyId={nearbyId}
            resetVersion={resetVersion}
            reducedMotion={reducedMotion}
            onApproach={(destination) => setActiveId(destination.id)}
            onEnter={navigate}
            onNearbyChange={(destination) => {
              setNearby(destination);
              if (destination) setActiveId(destination.id);
            }}
            onMovementState={setMoving}
          />
        </Canvas>
      </Suspense>
      <div className="ground-movement-prompt" role="status" aria-live="polite"><strong>{prompt}</strong><span>{nearby ? "Press Enter or tap again" : "WASD / arrows · click ground · drag to look"}</span></div>
      <MovementHelp realm="Ground" summary="Walk the arrival hall through the Nexus and approach a chamber threshold. Essential destinations always remain directly available below." controls="WASD or arrows move. Click ground to walk. Drag to look. Enter crosses a nearby threshold. R resets. Escape returns Home." />
      <MobileMovementPad input={input} label="Ground movement controls" />
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
        .ground-destination-compass{position:absolute;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:9;display:flex;justify-content:center;gap:6px;overflow-x:auto;padding:6px;scrollbar-width:none;touch-action:pan-x;scroll-padding-inline-start:max(14px,env(safe-area-inset-left));scroll-padding-inline-end:max(14px,env(safe-area-inset-right))}.ground-destination-compass::-webkit-scrollbar{display:none}
        .ground-destination-compass :is(a,button){display:inline-flex;scroll-margin-inline:12px;flex:0 0 auto;align-items:center;gap:7px;min-height:48px;max-width:48px;padding:8px 12px;border:1px solid rgba(174,225,255,.14);border-radius:999px;background:linear-gradient(180deg,rgba(11,28,43,.82),rgba(1,7,18,.82));color:rgba(239,249,255,.8);font:700 10px/1 Inter,system-ui;cursor:pointer;text-decoration:none;white-space:nowrap;overflow:hidden;transition:max-width .22s ease,border-color .18s ease,transform .18s ease}
        .ground-destination-compass :is(a,button):hover,.ground-destination-compass :is(a,button):focus-visible,.ground-destination-compass :is(a,button)[aria-current]{max-width:220px;border-color:rgba(207,250,254,.72);color:#fff;outline:3px solid rgba(255,255,255,.9);outline-offset:2px;transform:translateY(-2px)}
        .ground-destination-compass :is(a,button) span{width:8px;height:8px;flex:0 0 auto;border-radius:50%}.ground-destination-compass :is(a,button) strong{opacity:0;max-width:0;overflow:hidden}.ground-destination-compass :is(a,button):hover strong,.ground-destination-compass :is(a,button):focus-visible strong,.ground-destination-compass :is(a,button)[aria-current] strong{opacity:1;max-width:170px}.ground-destination-compass i{font-style:normal;font-size:12px}
        .ground-accessible-instruction{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
        @media(max-width:700px){.ground-title{top:max(15px,env(safe-area-inset-top));left:max(16px,env(safe-area-inset-left))}.ground-title strong{font-size:18px}.ground-movement-prompt{bottom:max(238px,calc(env(safe-area-inset-bottom) + 228px));min-width:min(320px,calc(100vw - 24px))}.ground-destination-compass{justify-content:flex-start;bottom:max(10px,env(safe-area-inset-bottom));padding-inline:max(14px,env(safe-area-inset-left)) max(14px,env(safe-area-inset-right))}.ground-destination-compass :is(a,button){min-height:48px;max-width:46px;padding:7px 10px;font-size:9px;transition:none}}
        @media(prefers-reduced-motion:reduce){.ground-destination-compass :is(a,button){transition:none!important;transform:none!important}}
      `}</style>
    </main>
  );
}

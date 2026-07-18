"use client";

import { Canvas } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, type CSSProperties, type FocusEvent } from "react";
import * as THREE from "three";
import { assetCssStack, groundAssets } from "@/spatial/assets/uraiAssets";
import { MobileMovementPad, MovementHelp, useDragLook, useMovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { DESTINATIONS, STATE_LABEL, type GroundDestination } from "./ground/GroundWorldModel";
import { EmbodiedGroundScene } from "./ground/EmbodiedGroundScene";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }
    query.addListener(update);
    return () => query.removeListener(update);
  }, []);
  return reduced;
}

/* Ground source-graph contract. Authored provider art remains the visible environment owner. EmbodiedGroundScene owns walkable paths, collision-aware camera movement, click-to-walk, chamber approach and threshold crossing. The destination rail remains the semantic direct-navigation owner. */
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

  const artStyle = {
    "--ground-provider-desktop": assetCssStack(groundAssets.primary),
    "--ground-provider-mobile": assetCssStack(groundAssets.mobile),
  } as CSSProperties;

  const prompt = nearby
    ? `${nearby.label}: cross the threshold`
    : moving
      ? "Moving through Ground"
      : active
        ? `Approach ${active.label} or use direct travel`
        : "Arrival overlook · Ground Nexus ahead";

  return (
    <main
      className="ground-spatial-root"
      style={artStyle}
      aria-label="URAI Ground embodied private infrastructure"
      data-testid="urai-ground-private-workforce-world"
      data-ground-visual-owner="authored-provider-art"
      data-ground-no-compositing-bands="true"
      data-ground-exploration="walkable"
      data-ground-pointer-lock="false"
      data-ground-camera-mode={dragging ? "look" : moving ? "walking" : "embodied-idle"}
      {...look}
    >
      <div className="ground-authored-art" aria-hidden="true" />
      <div className="ground-atmosphere" aria-hidden="true" />
      <div className="ground-title" aria-hidden="true">
        <span>URAI Ground</span>
        <strong>Private infrastructure, embodied.</strong>
        <em>{active ? `${active.layer} layer · ${active.signature}` : "Arrival overlook · Ground Nexus ahead"}</em>
      </div>
      <Suspense fallback={<div className="ground-loader" role="status">Opening the protected Ground</div>}>
        <Canvas
          dpr={[1, 1.45]}
          gl={{ antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
          onPointerMissed={() => { if (!nearby) setActiveId(null); }}
        >
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
      <MovementHelp realm="Ground" summary="Walk from the overlook through the Nexus and approach a chamber threshold. Essential destinations always remain directly available below." controls="WASD or arrows move. Click ground to walk. Drag to look. Enter crosses a nearby threshold. R resets. Escape returns Home." />
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
              event.currentTarget.scrollIntoView({ block: "nearest", inline: "center" });
              const target = event.currentTarget;
              const reveal = () => target.scrollIntoView({ block: "nearest", inline: "center" });
              window.requestAnimationFrame(() => window.requestAnimationFrame(reveal));
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
        .ground-spatial-root{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:#010611;color:#f8fbff;isolation:isolate;outline:none;font-family:Inter,ui-sans-serif,system-ui;touch-action:none;cursor:grab}.ground-spatial-root[data-ground-camera-mode='look']{cursor:grabbing}
        .ground-authored-art{position:absolute;inset:-2%;z-index:0;background-image:linear-gradient(180deg,rgba(1,6,17,.12),rgba(1,6,17,.18) 52%,rgba(1,6,17,.62)),var(--ground-provider-desktop);background-size:cover;background-position:center 48%;background-repeat:no-repeat;opacity:.94;filter:saturate(1.06) contrast(1.05) brightness(.9);transform:scale(1.035)}
        .ground-authored-art::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.28),transparent 22%,transparent 78%,rgba(0,0,0,.28)),radial-gradient(ellipse at 50% 48%,transparent 38%,rgba(0,0,0,.4) 100%);pointer-events:none}
        .ground-atmosphere{position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 28%,rgba(103,232,249,.07),transparent 24%),radial-gradient(circle at 16% 48%,rgba(167,139,250,.05),transparent 28%),radial-gradient(circle at 84% 46%,rgba(134,239,172,.045),transparent 26%),linear-gradient(180deg,rgba(1,6,17,.01),rgba(1,6,17,.2));mix-blend-mode:screen}
        .ground-title{position:absolute;top:max(20px,env(safe-area-inset-top));left:max(22px,env(safe-area-inset-left));z-index:5;display:grid;gap:4px;pointer-events:none;text-shadow:0 12px 40px rgba(0,0,0,.72)}
        .ground-title span{font:800 10px/1 Inter,ui-sans-serif,system-ui;letter-spacing:.24em;text-transform:uppercase;color:rgba(165,243,252,.82)}.ground-title strong{font:800 clamp(18px,2.2vw,30px)/1.05 Inter,ui-sans-serif,system-ui;letter-spacing:-.035em;color:rgba(247,253,255,.92)}.ground-title em{font:700 10px/1.2 Inter,ui-sans-serif,system-ui;font-style:normal;letter-spacing:.08em;text-transform:uppercase;color:rgba(203,239,255,.58)}
        .ground-spatial-root canvas{position:absolute!important;inset:0;z-index:1;display:block;width:100%!important;height:100%!important;background:transparent!important;touch-action:none}.ground-loader{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,rgba(103,232,249,.12),transparent 28%),#010611;color:rgba(226,246,255,.78);letter-spacing:.16em;text-transform:uppercase;font-size:12px}
        .ground-movement-prompt{position:absolute;left:50%;bottom:max(90px,calc(env(safe-area-inset-bottom) + 80px));z-index:7;transform:translateX(-50%);display:grid;gap:3px;min-width:min(430px,calc(100vw - 32px));padding:10px 16px;border:1px solid rgba(207,250,254,.18);border-radius:18px;background:rgba(2,10,22,.62);backdrop-filter:blur(16px);text-align:center;pointer-events:none}.ground-movement-prompt strong{font:800 11px/1.2 Inter,system-ui;letter-spacing:.08em;text-transform:uppercase}.ground-movement-prompt span{font:600 10px/1.3 Inter,system-ui;color:rgba(199,235,247,.66)}
        .ground-destination-compass{position:absolute;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:9;display:flex;justify-content:center;gap:6px;overflow-x:auto;padding:6px;scrollbar-width:none;mask-image:linear-gradient(90deg,transparent,#000 2%,#000 98%,transparent);touch-action:pan-x;scroll-padding-inline:12px}
        :global(.urai-world-runtime[data-world-destination='infrastructure-hub'] .ground-destination-compass){display:flex!important}.ground-destination-compass::-webkit-scrollbar{display:none}
        .ground-destination-compass :is(a,button){display:inline-flex;scroll-margin-inline:12px;flex:0 0 auto;align-items:center;gap:7px;min-height:48px;max-width:48px;padding:8px 12px;border:1px solid rgba(174,225,255,.14);border-radius:999px;background:linear-gradient(180deg,rgba(11,28,43,.72),rgba(1,7,18,.72));box-shadow:0 14px 40px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(18px);color:rgba(239,249,255,.8);font:700 10px/1 Inter,ui-sans-serif,system-ui;letter-spacing:.05em;cursor:pointer;text-decoration:none;white-space:nowrap;overflow:hidden;transition:max-width .22s ease,border-color .18s ease,background .18s ease,transform .18s ease,color .18s ease}
        .ground-destination-compass :is(a,button):hover,.ground-destination-compass :is(a,button):focus-visible,.ground-destination-compass :is(a,button)[aria-current]{max-width:220px;border-color:rgba(207,250,254,.72);background:linear-gradient(180deg,rgba(20,57,79,.92),rgba(5,22,35,.9));color:#fff;outline:3px solid rgba(255,255,255,.9);outline-offset:2px;transform:translateY(-2px)}
        .ground-destination-compass :is(a,button) span{width:8px;height:8px;flex:0 0 auto;border-radius:50%;box-shadow:0 0 16px currentColor}.ground-destination-compass :is(a,button) strong{opacity:0;max-width:0;overflow:hidden;transition:opacity .16s ease,max-width .22s ease}.ground-destination-compass :is(a,button):hover strong,.ground-destination-compass :is(a,button):focus-visible strong,.ground-destination-compass :is(a,button)[aria-current] strong{opacity:1;max-width:170px}.ground-destination-compass :is(a,button) i{font-style:normal;font-size:12px;color:rgba(255,255,255,.72)}
        .ground-accessible-instruction{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
        :global(.ground-active-label){display:grid;gap:5px;min-width:210px;max-width:300px;padding:13px 15px;border:1px solid rgba(207,250,254,.26);border-radius:18px;background:linear-gradient(180deg,rgba(7,22,35,.92),rgba(1,7,18,.88));box-shadow:0 18px 60px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.07);backdrop-filter:blur(18px);text-align:center;pointer-events:none}:global(.ground-active-label[data-nearby='true']){border-color:rgba(255,255,255,.75)}:global(.ground-active-label strong){font-size:11px;letter-spacing:.12em;text-transform:uppercase}:global(.ground-active-label span){font-size:9px;color:rgba(235,244,255,.74)}:global(.ground-active-label em){font-size:8px;font-style:normal;color:#a5f3fc;text-transform:uppercase;letter-spacing:.09em}:global(.ground-active-label small){font-size:9px;line-height:1.35;color:rgba(235,244,255,.72)}
        @media(max-width:700px){.ground-authored-art{background-image:linear-gradient(180deg,rgba(1,6,17,.1),rgba(1,6,17,.22) 50%,rgba(1,6,17,.7)),var(--ground-provider-mobile);background-position:center 44%}.ground-title{top:max(15px,env(safe-area-inset-top));left:max(16px,env(safe-area-inset-left))}.ground-title strong{font-size:18px}.ground-title em{max-width:260px}.ground-movement-prompt{bottom:max(238px,calc(env(safe-area-inset-bottom) + 228px));min-width:min(320px,calc(100vw - 24px))}.ground-destination-compass{justify-content:flex-start;bottom:max(10px,env(safe-area-inset-bottom));gap:5px}.ground-destination-compass :is(a,button){min-height:48px;max-width:46px;padding:7px 10px;font-size:9px}.ground-destination-compass :is(a,button):hover,.ground-destination-compass :is(a,button):focus-visible,.ground-destination-compass :is(a,button)[aria-current]{max-width:190px}:global(.ground-active-label){min-width:160px;max-width:220px;padding:10px 12px}}
        @media(prefers-reduced-motion:reduce){.ground-authored-art{transform:none}.ground-destination-compass :is(a,button),.ground-destination-compass :is(a,button) strong{transition:none!important;transform:none!important}}
      `}</style>
    </main>
  );
}

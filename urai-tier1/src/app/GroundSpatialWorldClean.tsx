"use client";

import { Canvas } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import * as THREE from "three";
import { MobileMovementPad, MovementHelp, useDragLook, useMovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { DESTINATIONS, STATE_LABEL, type GroundDestination, type GroundLayer } from "./ground/GroundWorldModel";
import { EmbodiedGroundScene, type GroundCheckpoint } from "./ground/EmbodiedGroundScene";

const CHECKPOINT_KEY = "urai:ground:checkpoint";
const LAYERS: GroundLayer[] = ["threshold", "civic", "continuity", "deep"];

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

function readCheckpoint(): GroundCheckpoint | null {
  try {
    const value = window.sessionStorage.getItem(CHECKPOINT_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as GroundCheckpoint;
    return Number.isFinite(parsed.x) && Number.isFinite(parsed.z) ? parsed : null;
  } catch {
    return null;
  }
}

export default function GroundSpatialWorldClean() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nearby, setNearby] = useState<GroundDestination | null>(null);
  const [moving, setMoving] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [guideDestination, setGuideDestination] = useState<GroundDestination | null>(null);
  const [requestedCheckpoint, setRequestedCheckpoint] = useState<GroundCheckpoint | null>(null);
  const [openLayer, setOpenLayer] = useState<GroundLayer>("threshold");
  const yaw = useRef(0);
  const pitch = useRef(-0.05);
  const walkTarget = useRef<THREE.Vector3 | null>(null);
  const nearbyId = useRef<string | null>(null);
  const active = DESTINATIONS.find((destination) => destination.id === activeId) ?? null;
  const visibleDestinations = useMemo(() => DESTINATIONS.filter((destination) => destination.layer === openLayer), [openLayer]);

  const storeCheckpoint = useCallback((checkpoint: GroundCheckpoint) => {
    try { window.sessionStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint)); } catch { /* storage is best effort */ }
  }, []);

  const goNow = useCallback((destination: GroundDestination) => {
    storeCheckpoint({ x: destination.camera[0], z: destination.camera[2], yaw: 0, pitch: -0.05, district: destination.id });
    router.push(destination.href);
  }, [router, storeCheckpoint]);

  const guideTo = useCallback((destination: GroundDestination) => {
    setActiveId(destination.id);
    setOpenLayer(destination.layer);
    if (reducedMotion) {
      setRequestedCheckpoint({ x: destination.camera[0], z: destination.camera[2], yaw: 0, pitch: -0.05, district: destination.id });
      setResetVersion((value) => value + 1);
    } else {
      setGuideDestination(destination);
    }
  }, [reducedMotion]);

  const enterDestination = useCallback((destination: GroundDestination) => {
    setGuideDestination(null);
    goNow(destination);
  }, [goNow]);

  const resetOrientation = useCallback(() => {
    yaw.current = 0;
    pitch.current = -0.05;
    walkTarget.current = null;
    nearbyId.current = null;
    setNearby(null);
    setMoving(false);
    setGuideDestination(null);
    setRequestedCheckpoint({ x: 0, z: 8.2, yaw: 0, pitch: -0.05 });
    setResetVersion((value) => value + 1);
  }, []);

  const input = useMovementInput({
    onEscape: () => router.push("/home?returnFrom=ground"),
    onInteract: () => {
      const destination = DESTINATIONS.find((candidate) => candidate.id === nearbyId.current);
      if (destination) enterDestination(destination);
    },
    onReset: resetOrientation,
  });
  const look = useDragLook({ yaw, pitch, sensitivity: reducedMotion ? 0.0022 : 0.0036, onDragState: setDragging });

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("district");
    const destination = DESTINATIONS.find((candidate) => candidate.id === requested);
    if (destination) {
      setActiveId(destination.id);
      setOpenLayer(destination.layer);
      setRequestedCheckpoint({ x: destination.camera[0], z: destination.camera[2], yaw: 0, pitch: -0.05, district: destination.id });
    } else {
      setRequestedCheckpoint(readCheckpoint());
    }
  }, []);

  const prompt = nearby
    ? `${nearby.label}: cross the threshold`
    : moving
      ? active ? `Following the route to ${active.label}` : "Moving through Ground"
      : active
        ? `${active.label} selected · follow the illuminated route`
        : "Arrival overlook · Ground Nexus ahead";

  return (
    <main
      className="ground-spatial-root"
      aria-label="URAI Ground embodied private infrastructure"
      data-testid="urai-ground-private-workforce-world"
      data-ground-visual-owner="three-dimensional-infrastructure-world"
      data-ground-no-compositing-bands="true"
      data-ground-exploration="walkable"
      data-ground-pointer-lock="false"
      data-ground-camera-mode={dragging ? "look" : moving ? "walking" : "embodied-idle"}
      {...look}
    >
      <div className="ground-title" aria-hidden="true">
        <span>URAI Ground</span>
        <strong>Private infrastructure, embodied.</strong>
        <em>{active ? `${active.layer} layer · ${active.signature}` : "Arrival overlook · Ground Nexus ahead"}</em>
      </div>
      <Suspense fallback={<div className="ground-loader" role="status">Building the protected Ground</div>}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
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
            requestedCheckpoint={requestedCheckpoint}
            guideDestination={guideDestination}
            onApproach={guideTo}
            onEnter={enterDestination}
            onNearbyChange={(destination) => {
              setNearby(destination);
              if (destination) {
                setActiveId(destination.id);
                setOpenLayer(destination.layer);
              }
            }}
            onMovementState={setMoving}
            onCheckpointChange={storeCheckpoint}
          />
        </Canvas>
      </Suspense>
      <div className="ground-movement-prompt" role="status" aria-live="polite">
        <strong>{prompt}</strong>
        <span>{nearby ? "Press Enter or tap the chamber again" : "WASD / arrows · click floor · drag to look"}</span>
      </div>
      <MovementHelp realm="Ground" summary="Walk from the overlook through the Nexus and approach a chamber. The directory can guide you spatially or take you there immediately." controls="WASD or arrows move. Click floor to walk. Drag to look. Enter crosses a nearby threshold. R resets. Escape returns Home." />
      <MobileMovementPad input={input} label="Ground movement controls" />
      <section className="ground-directory" data-movement-ui="true" aria-label="Ground destination directory">
        <div className="ground-layer-tabs" role="tablist" aria-label="Ground layers">
          {LAYERS.map((layer) => <button key={layer} type="button" role="tab" aria-selected={openLayer === layer} onClick={() => setOpenLayer(layer)}>{layer}</button>)}
        </div>
        <nav className="ground-destination-compass ground-rail" aria-label="Ground destinations">
          {visibleDestinations.map((destination) => {
            const shared = {
              "data-ground-destination": destination.id,
              "data-workforce-state": destination.workforceState,
              "data-service-availability": destination.availability,
              "data-ground-layer": destination.layer,
              "aria-label": `${destination.label}. ${destination.detail}. ${destination.signature}. ${destination.emotionalSentence} Workforce state: ${STATE_LABEL[destination.workforceState]}. Service: ${destination.availability}. Guide me through Ground.`,
              onFocus: (event: FocusEvent<HTMLButtonElement>) => {
                setActiveId(destination.id);
                event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
              },
              onMouseEnter: () => setActiveId(destination.id),
            };
            return (
              <div className="ground-destination-entry" key={destination.id}>
                <button type="button" aria-current={activeId === destination.id ? "location" : undefined} {...shared} onClick={() => guideTo(destination)}>
                  <span aria-hidden="true" style={{ background: destination.color }} /><strong>{destination.label}</strong><i aria-hidden="true">{destination.workforceState === "blocked" ? "×" : destination.ownerBoundary ? "◇" : "→"}</i>
                </button>
                <button type="button" className="ground-go-now" aria-label={`Go now to ${destination.label}`} onClick={() => goNow(destination)}>Go now</button>
              </div>
            );
          })}
        </nav>
      </section>
      <p className="ground-accessible-instruction">Walk with WASD or arrow keys, click valid floor to move, drag to look, press Enter at a nearby threshold, choose Guide me for spatial travel, choose Go now for immediate travel, press R to reset orientation, and Escape to return Home.</p>
      <style jsx>{`
        .ground-spatial-root{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:#071015;color:#f8fbff;isolation:isolate;outline:none;font-family:Inter,ui-sans-serif,system-ui;touch-action:none;cursor:grab}.ground-spatial-root[data-ground-camera-mode='look']{cursor:grabbing}
        .ground-title{position:absolute;top:max(20px,env(safe-area-inset-top));left:max(22px,env(safe-area-inset-left));z-index:5;display:grid;gap:4px;pointer-events:none;text-shadow:0 12px 40px rgba(0,0,0,.72)}
        .ground-title span{font:800 10px/1 Inter;letter-spacing:.24em;text-transform:uppercase;color:rgba(165,243,252,.82)}.ground-title strong{font:800 clamp(18px,2.2vw,30px)/1.05 Inter;letter-spacing:-.035em}.ground-title em{font:700 10px/1.2 Inter;font-style:normal;letter-spacing:.08em;text-transform:uppercase;color:rgba(203,239,255,.64)}
        .ground-spatial-root canvas{position:absolute!important;inset:0;z-index:1;display:block;width:100%!important;height:100%!important;touch-action:none}.ground-loader{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:#071015;color:rgba(226,246,255,.78);letter-spacing:.16em;text-transform:uppercase;font-size:12px}
        .ground-movement-prompt{position:absolute;left:50%;bottom:max(124px,calc(env(safe-area-inset-bottom) + 112px));z-index:7;transform:translateX(-50%);display:grid;gap:3px;min-width:min(430px,calc(100vw - 32px));padding:10px 16px;border:1px solid rgba(207,250,254,.18);border-radius:18px;background:rgba(2,10,22,.7);backdrop-filter:blur(16px);text-align:center;pointer-events:none}.ground-movement-prompt strong{font:800 11px/1.2 Inter;letter-spacing:.08em;text-transform:uppercase}.ground-movement-prompt span{font:600 10px/1.3 Inter;color:rgba(199,235,247,.7)}
        .ground-directory{position:absolute;left:max(12px,env(safe-area-inset-left));right:max(96px,calc(env(safe-area-inset-right) + 84px));bottom:max(12px,env(safe-area-inset-bottom));z-index:9;display:grid;gap:5px}.ground-layer-tabs{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none}.ground-layer-tabs button{min-height:34px;padding:6px 12px;border:1px solid rgba(174,225,255,.14);border-radius:999px;background:rgba(2,10,22,.68);color:rgba(239,249,255,.74);text-transform:capitalize;font:750 10px/1 Inter}.ground-layer-tabs button[aria-selected='true']{background:rgba(207,250,254,.9);color:#061017}
        .ground-destination-compass{display:flex;gap:6px;overflow-x:auto;padding:2px;scrollbar-width:none;touch-action:pan-x;scroll-padding-inline:12px}.ground-destination-compass::-webkit-scrollbar,.ground-layer-tabs::-webkit-scrollbar{display:none}.ground-destination-entry{display:flex;flex:0 0 auto;gap:4px}.ground-destination-entry>button{display:inline-flex;align-items:center;gap:7px;min-height:48px;padding:8px 12px;border:1px solid rgba(174,225,255,.18);border-radius:15px;background:linear-gradient(180deg,rgba(11,28,43,.85),rgba(1,7,18,.82));color:rgba(239,249,255,.86);font:700 10px/1 Inter;cursor:pointer;white-space:nowrap}.ground-destination-entry>button:first-child span{width:8px;height:8px;border-radius:50%;box-shadow:0 0 16px currentColor}.ground-destination-entry>button[aria-current]{border-color:rgba(207,250,254,.76);background:linear-gradient(180deg,rgba(20,57,79,.96),rgba(5,22,35,.94));outline:2px solid rgba(255,255,255,.84);outline-offset:2px}.ground-destination-entry i{font-style:normal}.ground-go-now{padding-inline:10px!important;color:#a5f3fc!important}
        .ground-accessible-instruction{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}:global(.ground-active-label){display:grid;gap:5px;min-width:210px;max-width:300px;padding:13px 15px;border:1px solid rgba(207,250,254,.34);border-radius:18px;background:linear-gradient(180deg,rgba(7,22,35,.94),rgba(1,7,18,.9));box-shadow:0 18px 60px rgba(0,0,0,.52);backdrop-filter:blur(18px);text-align:center;pointer-events:none}:global(.ground-active-label strong){font-size:11px;letter-spacing:.12em;text-transform:uppercase}:global(.ground-active-label span),:global(.ground-active-label small){font-size:9px;color:rgba(235,244,255,.76)}:global(.ground-active-label em){font-size:8px;font-style:normal;color:#a5f3fc;text-transform:uppercase;letter-spacing:.09em}
        @media(max-width:700px){.ground-title{top:max(15px,env(safe-area-inset-top));left:max(16px,env(safe-area-inset-left))}.ground-title strong{font-size:18px}.ground-movement-prompt{bottom:max(246px,calc(env(safe-area-inset-bottom) + 236px));min-width:min(320px,calc(100vw - 24px))}.ground-directory{left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));padding-left:170px}.ground-layer-tabs button{min-height:38px}.ground-destination-entry>button{min-height:48px;font-size:9px}}
        @media(prefers-reduced-motion:reduce){.ground-spatial-root *{scroll-behavior:auto!important}.ground-destination-entry>button,.ground-layer-tabs button{transition:none!important}}
      `}</style>
    </main>
  );
}

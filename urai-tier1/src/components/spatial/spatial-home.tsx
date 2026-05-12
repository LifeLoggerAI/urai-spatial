"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { demoCompanionState, demoEmotionalBiome, demoLifeMapNodes, demoMemoryStars, demoMoodForecast } from "@/lib/spatial/publicSafeSpatialData";
import { PublicPreviewBadge } from "./public-preview-badge";
import { CompanionOrb } from "./companion-orb";
import { EmotionalSky } from "./emotional-sky";
import { HorizonLayer } from "./horizon-layer";
import { MoodForecastOverlay } from "./mood-forecast-overlay";
import { MemoryNodeDetail } from "./memory-node-detail";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function SpatialHome() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [showCompanion, setShowCompanion] = useState(false);
  const [showState, setShowState] = useState(false);
  const [labelsVisible, setLabelsVisible] = useState(false);
  const activeNode = useMemo(() => demoLifeMapNodes.find((node) => node.id === activeNodeId) ?? null, [activeNodeId]);
  const enterLifeMap = () => router.push("/spatial/life-map", { scroll: false });

  return (
    <main
      className={`spatialHome ${reduceMotion ? "spatialHome--reduced" : ""}`}
      aria-label="URAI Spatial Home Sky View"
      onDoubleClick={enterLifeMap}
      onPointerDown={(event) => {
        if (event.pointerType === "touch") window.setTimeout(() => setLabelsVisible(true), 520);
      }}
    >
      <EmotionalSky nodes={demoLifeMapNodes} stars={demoMemoryStars} labelsVisible={labelsVisible} onSky={enterLifeMap} onStar={setActiveNodeId} />
      <div className="spatialHome__aurora" aria-hidden="true" />
      <button className="spatialHome__body" type="button" aria-label="Open self state and emotional biome summary" onClick={() => setShowState((value) => !value)} onFocus={() => setLabelsVisible(true)}>
        <span className="spatialHome__bodyHead" />
        <span className="spatialHome__bodyTorso" />
        <span className="spatialHome__bodyArm spatialHome__bodyArm--left" />
        <span className="spatialHome__bodyArm spatialHome__bodyArm--right" />
        <span className="spatialHome__bodyLeg spatialHome__bodyLeg--left" />
        <span className="spatialHome__bodyLeg spatialHome__bodyLeg--right" />
        {labelsVisible ? <span className="spatialHome__label">Self State</span> : null}
      </button>
      <CompanionOrb state={demoCompanionState} expanded={showCompanion} onToggle={() => setShowCompanion((value) => !value)} />
      <HorizonLayer biome={demoEmotionalBiome} onOpen={() => router.push("/spatial/biome", { scroll: false })} />
      <MoodForecastOverlay forecast={demoMoodForecast} />
      <PublicPreviewBadge />
      <button className="spatialHome__cta" type="button" onClick={enterLifeMap} onFocus={() => setLabelsVisible(true)} aria-label="Enter Life Map 3D starfield">
        Enter Life Map
      </button>
      {showState ? (
        <section className="spatialHome__panel spatialHome__panel--state" aria-live="polite">
          <strong>Emotional Biome</strong>
          <span>{demoEmotionalBiome.terrainType} · {demoEmotionalBiome.dominantMood}</span>
          <small>Recovery {Math.round(demoEmotionalBiome.intensityMap.recovery * 100)}% · Connection {Math.round(demoEmotionalBiome.intensityMap.connection * 100)}%</small>
        </section>
      ) : null}
      {activeNode ? <MemoryNodeDetail node={activeNode} onClose={() => setActiveNodeId(null)} compact /> : null}
      <style jsx>{`
        .spatialHome{position:relative;min-height:100svh;overflow:hidden;background:radial-gradient(circle at 50% 48%,rgba(101,210,255,.26),transparent 12rem),linear-gradient(180deg,#10234b 0%,#071426 58%,#020711 100%);color:#dff7ff;font-family:Inter,ui-sans-serif,system-ui;}
        .spatialHome__aurora{position:absolute;inset:10% 18% 30%;background:radial-gradient(ellipse at 42% 38%,rgba(112,222,255,.24),transparent 40%),radial-gradient(ellipse at 68% 48%,rgba(136,115,255,.18),transparent 46%);filter:blur(14px);animation:aurora 18s ease-in-out infinite alternate;pointer-events:none;}
        .spatialHome--reduced .spatialHome__aurora{animation:none}.spatialHome__body{position:absolute;left:50%;top:43%;width:10rem;height:16rem;transform:translate(-50%,-45%);border:0;background:transparent;cursor:pointer;filter:drop-shadow(0 0 2.4rem rgba(99,219,255,.38));}
        .spatialHome__body span:not(.spatialHome__label){position:absolute;display:block;background:rgba(120,210,240,.15);border:1px solid rgba(175,235,255,.13);box-shadow:0 0 2rem rgba(80,210,255,.22)}
        .spatialHome__bodyHead{left:3.55rem;top:1.1rem;width:3rem;height:3rem;border-radius:999px;background:rgba(126,225,255,.55)!important;box-shadow:0 0 3.2rem rgba(97,218,255,.9)!important}.spatialHome__bodyTorso{left:2.7rem;top:4.2rem;width:4.4rem;height:6.1rem;border-radius:4rem 4rem 1.2rem 1.2rem}.spatialHome__bodyArm{top:5.3rem;width:1.1rem;height:6.9rem;border-radius:2rem}.spatialHome__bodyArm--left{left:1.2rem;transform:rotate(12deg)}.spatialHome__bodyArm--right{right:1.2rem;transform:rotate(-12deg)}.spatialHome__bodyLeg{top:10rem;width:1.1rem;height:6.1rem;border-radius:2rem}.spatialHome__bodyLeg--left{left:4rem}.spatialHome__bodyLeg--right{right:4rem}.spatialHome__label{position:absolute;left:50%;top:-1.8rem;transform:translateX(-50%);font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:#bdefff}.spatialHome__cta{position:absolute;left:50%;bottom:2.2rem;transform:translateX(-50%);border:1px solid rgba(180,235,255,.28);border-radius:999px;background:rgba(12,30,54,.58);color:#dff7ff;padding:.95rem 1.4rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;box-shadow:0 0 1.8rem rgba(80,210,255,.22);backdrop-filter:blur(12px);animation:cta 4.8s ease-in-out infinite}.spatialHome__cta:hover,.spatialHome__cta:focus-visible{outline:2px solid rgba(156,231,255,.8);background:rgba(38,83,120,.58);box-shadow:0 0 2.8rem rgba(93,219,255,.55)}.spatialHome__panel{position:absolute;right:1.2rem;bottom:6rem;display:grid;gap:.2rem;max-width:20rem;padding:1rem;border:1px solid rgba(184,232,255,.2);border-radius:1rem;background:rgba(5,14,28,.68);backdrop-filter:blur(16px)}.spatialHome__panel small{color:#a6cfe1}@keyframes aurora{from{transform:translate3d(-2%,1%,0) scale(1)}to{transform:translate3d(2%,-2%,0) scale(1.06)}}@keyframes cta{0%,100%{box-shadow:0 0 1.4rem rgba(80,210,255,.18)}50%{box-shadow:0 0 2.7rem rgba(80,210,255,.5)}}@media (max-width:640px){.spatialHome__body{top:43%;transform:translate(-50%,-45%) scale(1.08)}.spatialHome__cta{bottom:calc(1rem + env(safe-area-inset-bottom));font-size:.74rem}.spatialHome__panel{left:1rem;right:1rem;bottom:5.7rem;max-width:none}}@media (prefers-reduced-motion:reduce){.spatialHome__aurora,.spatialHome__cta{animation:none!important}}
      `}</style>
    </main>
  );
}

export default SpatialHome;

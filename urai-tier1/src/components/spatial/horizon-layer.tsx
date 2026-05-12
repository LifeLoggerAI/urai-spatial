"use client";

import type { EmotionalBiome } from "@/lib/firebase/firebaseSpatialSchema";

type Props = { biome: EmotionalBiome; onOpen: () => void };

export function HorizonLayer({ biome, onOpen }: Props) {
  return (
    <button className="horizonLayer" type="button" aria-label={`Open Emotional Biome: ${biome.terrainType}`} onClick={onOpen}>
      <span className="horizonLayer__arc" />
      <span className="horizonLayer__glow" style={{ opacity: biome.visualParams.horizonGlow }} />
      <span className="horizonLayer__label">Emotional Biome · {biome.terrainType}</span>
      <style jsx>{`.horizonLayer{position:absolute;left:0;right:0;bottom:-7.5rem;height:20rem;border:0;background:transparent;cursor:pointer;z-index:3}.horizonLayer__arc{position:absolute;left:-8%;right:-8%;top:0;height:15rem;border-radius:50% 50% 0 0/45% 45% 0 0;background:linear-gradient(180deg,rgba(78,157,190,.28),rgba(14,39,66,.75));border-top:1px solid rgba(160,225,255,.15);box-shadow:0 -1.5rem 4rem rgba(64,190,240,.12) inset}.horizonLayer__glow{position:absolute;left:20%;right:20%;top:-2rem;height:5rem;background:radial-gradient(ellipse,rgba(104,220,255,.28),transparent 70%);filter:blur(22px);animation:horizonBreath 7s ease-in-out infinite}.horizonLayer__label{position:absolute;left:50%;top:2.4rem;transform:translateX(-50%);opacity:0;color:#c8efff;font-size:.68rem;letter-spacing:.13em;text-transform:uppercase}.horizonLayer:hover .horizonLayer__label,.horizonLayer:focus-visible .horizonLayer__label{opacity:1}.horizonLayer:focus-visible{outline:2px solid rgba(160,232,255,.72);outline-offset:-10px}@keyframes horizonBreath{0%,100%{transform:scaleX(.92);opacity:.38}50%{transform:scaleX(1.05);opacity:.78}}@media (prefers-reduced-motion:reduce){.horizonLayer__glow{animation:none}}`}</style>
    </button>
  );
}

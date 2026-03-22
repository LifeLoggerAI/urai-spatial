"use client";

import type { RefObject } from "react";
import type { JSX } from "react";
import { useMemo } from "react";
import { Group } from "three";
import { SceneMode, useSceneStore } from "../state/sceneStore";
import StarMesh from "./StarMesh";
import CinematicAtmosphere from "../effects/CinematicAtmosphere";
import CinematicIdleMotion from "../effects/CinematicIdleMotion";
import CinematicLightingRig from "../lighting/CinematicLightingRig";
import CinematicGroundAccents from "./CinematicGroundAccents";

export interface Tier1Star {
id: string;
position: [number, number, number];
baseScale: number;
tint: string;
emissiveIntensity: number;
}

function mulberry32(seed: number): () => number {
let t = seed >>> 0;
return () => {
      <CinematicAtmosphere />
      <CinematicLightingRig />
      <CinematicIdleMotion amplitude={0.02} />
      <CinematicGroundAccents />
t += 0x6d2b79f5;
let r = Math.imul(t ^ (t >>> 15), 1 | t);
r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
};
}

export function createTier1Stars(count = 92): Tier1Star[] {
const rand = mulberry32(90210);
const stars: Tier1Star[] = [];

for (let i = 0; i < count; i += 1) {
const arc = (i / count) * Math.PI * 2;
const depthBand = i % 3;
const radius = 5 + rand() * 14 + depthBand * 3.2;
const spreadX = Math.cos(arc + rand() * 0.35) * radius * (1.25 + rand() * 0.35);
const spreadY = (rand() - 0.5) * 6.5 + Math.sin(arc * 2.3) * 0.7;
const z = -4 - rand() * 22 - depthBand * 6.8;
const baseScale = 0.045 + rand() * 0.13 + (depthBand === 0 ? 0.08 : 0);
const tint = depthBand === 0 ? "#dbe7ff" : depthBand === 1 ? "#cbd8f7" : "#aab7d5";
const emissiveIntensity = depthBand === 0 ? 1.35 : depthBand === 1 ? 0.95 : 0.55;

stars.push({
  id: `star-${i.toString().padStart(3, "0")}`,
  position: [spreadX, spreadY, z],
  baseScale,
  tint,
  emissiveIntensity,
});

}

return stars.sort((a, b) => b.position[2] - a.position[2]);
}

export interface StarfieldProps {
mode: SceneMode;
selectedStarId?: string | null;
onSelectStar?: (id: string) => void;
stars?: Tier1Star[];
groupRef?: RefObject<Group | null>;
}

export default function Starfield({
mode,
selectedStarId = null,
onSelectStar,
stars,
groupRef,
}: StarfieldProps): JSX.Element {
const hoveredStar = useSceneStore((s) => s.hoveredStar);
const setHoveredStar = useSceneStore((s) => s.setHoveredStar);

const starData = useMemo(() => stars ?? createTier1Stars(), [stars]);

return ( <group ref={groupRef}>
{starData.map((star) => {
const distance = Math.abs(star.position[2]);
const distanceFactor = Math.max(0.48, 1.14 - distance * 0.02);
const farFade = Math.max(0.18, 1 - distance * 0.028);
const isSelected = selectedStarId === star.id;
const isFocusMode = mode === "focus" || mode === "replay";
const dimmed = isFocusMode && !isSelected;
const hoverBoost = hoveredStar === star.id ? 1.06 : 1;
const scale = distanceFactor * hoverBoost;
const nextEmissiveIntensity = star.emissiveIntensity * farFade * (isSelected ? 1.5 : 1);

    return (
      <StarMesh
        key={star.id}
        id={star.id}
        position={star.position}
        scale={scale}
        baseScale={star.baseScale}
        color={star.tint}
        emissiveIntensity={nextEmissiveIntensity}
        interactive
        selected={isSelected}
        dimmed={dimmed}
        onSelectStar={onSelectStar}
        onHoverChange={setHoveredStar}
      />
    );
  })}
</group>

);
}

"use client";

import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { Group, Mesh } from "three";

export interface StarMeshProps {
id: string;
position: [number, number, number];
scale: number;
baseScale: number;
color: string;
emissiveIntensity: number;
interactive: boolean;
selected: boolean;
dimmed?: boolean;
onSelectStar?: (id: string) => void;
onHoverChange?: (id: string | null) => void;
}

export default function StarMesh({
id,
position,
scale,
baseScale,
color,
emissiveIntensity,
interactive,
selected,
dimmed = false,
onSelectStar,
onHoverChange,
}: StarMeshProps): JSX.Element {
const groupRef = useRef<Group>(null);
const coreRef = useRef<Mesh>(null);
const glowRef = useRef<Mesh>(null);
const haloRef = useRef<Mesh>(null);
const [hovered, setHovered] = useState(false);

const seed = useMemo(() => {
let value = 0;
for (let i = 0; i < id.length; i += 1) value += id.charCodeAt(i) * (i + 1);
return value * 0.00123;
}, [id]);

useFrame(({ clock }) => {
const t = clock.elapsedTime;
const pulse = 1 + Math.sin(t * 1.6 + seed) * 0.04;
const hoverBoost = hovered ? 1.1 : 1;
const selectedBoost = selected ? 1.34 : 1;
const nextScale = scale * hoverBoost * selectedBoost * pulse;

if (groupRef.current) {
  groupRef.current.scale.setScalar(nextScale);
}

if (coreRef.current) {
  const material = coreRef.current.material;
  if ("emissiveIntensity" in material) {
    material.emissiveIntensity =
      emissiveIntensity * (hovered ? 1.5 : 1) * (selected ? 1.35 : 1);
  }
  if ("opacity" in material) {
    material.opacity = dimmed ? 0.22 : 1;
  }
}

if (glowRef.current) {
  const material = glowRef.current.material;
  if ("opacity" in material) {
    material.opacity = (dimmed ? 0.05 : 0.18) + (hovered ? 0.08 : 0) + (selected ? 0.12 : 0);
  }
}

if (haloRef.current) {
  const material = haloRef.current.material;
  if ("opacity" in material) {
    material.opacity = interactive ? (hovered ? 0.18 : 0.09) : 0.03;
  }
}

});

const handlePointerOver = (event: ThreeEvent<PointerEvent>): void => {
event.stopPropagation();
if (!interactive) return;
setHovered(true);
onHoverChange?.(id);
if (typeof document !== "undefined") document.body.style.cursor = "pointer";
};

const handlePointerOut = (): void => {
setHovered(false);
onHoverChange?.(null);
if (typeof document !== "undefined") document.body.style.cursor = "default";
};

const handleClick = (event: ThreeEvent<MouseEvent>): void => {
event.stopPropagation();
if (!interactive) return;
onSelectStar?.(id);
};

return ( <group ref={groupRef} position={position}> <mesh ref={haloRef}>
<sphereGeometry args={[baseScale * 2.65, 20, 20]} /> <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} /> </mesh> <mesh ref={glowRef}>
<sphereGeometry args={[baseScale * 1.9, 20, 20]} /> <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} /> </mesh> <mesh
     ref={coreRef}
     onPointerOver={handlePointerOver}
     onPointerOut={handlePointerOut}
     onClick={handleClick}
     castShadow
     receiveShadow
   >
<sphereGeometry args={[baseScale, 24, 24]} />
<meshStandardMaterial
color={color}
emissive={color}
emissiveIntensity={emissiveIntensity}
metalness={0.18}
roughness={0.24}
transparent
opacity={dimmed ? 0.25 : 1}
/> </mesh> </group>
);
}

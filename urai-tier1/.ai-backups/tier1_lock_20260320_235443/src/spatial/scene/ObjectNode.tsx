"use client";

import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { Group, Mesh } from "three";

export interface ObjectNodeProps {
id: string;
position: [number, number, number];
kind?: "cube" | "cone" | "pillar";
color?: string;
interactive?: boolean;
selected?: boolean;
onSelect?: (id: string) => void;
onHoverChange?: (id: string | null) => void;
}

export default function ObjectNode({
id,
position,
kind = "cube",
color = "#87a8e8",
interactive = true,
selected = false,
onSelect,
onHoverChange,
}: ObjectNodeProps): JSX.Element {
const groupRef = useRef<Group>(null);
const meshRef = useRef<Mesh>(null);
const glowRef = useRef<Mesh>(null);
const [hovered, setHovered] = useState(false);

const seed = useMemo(() => {
let value = 0;
for (let i = 0; i < id.length; i += 1) value += id.charCodeAt(i) * (i + 1);
return value * 0.0027;
}, [id]);

useFrame(({ clock }) => {
const t = clock.elapsedTime;
const pulse = 1 + Math.sin(t * 1.4 + seed) * 0.025;
const hoverBoost = hovered ? 1.1 : 1;
const selectedBoost = selected ? 1.18 : 1;
const s = pulse * hoverBoost * selectedBoost;

if (groupRef.current) {
  groupRef.current.scale.set(s, s, s);
  groupRef.current.position.y = position[1] + Math.sin(t + seed) * 0.03;
}

if (meshRef.current) {
  const material = meshRef.current.material;
  if ("emissiveIntensity" in material) {
    material.emissiveIntensity = hovered || selected ? 1.15 : 0.35;
  }
}

if (glowRef.current) {
  const material = glowRef.current.material;
  if ("opacity" in material) {
    material.opacity = hovered || selected ? 0.18 : 0.08;
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
onSelect?.(id);
};

return ( <group
   ref={groupRef}
   position={position}
   onPointerOver={handlePointerOver}
   onPointerOut={handlePointerOut}
   onClick={handleClick}
   castShadow
   receiveShadow
 >
<mesh ref={glowRef} position={[0, kind === "pillar" ? 1.5 : 0.75, 0]}>
<sphereGeometry args={[kind === "pillar" ? 1.25 : 1.05, 18, 18]} /> <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} /> </mesh>

  {kind === "cube" ? (
    <mesh ref={meshRef} castShadow receiveShadow>
      <boxGeometry args={[1.55, 1.55, 1.55]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.35}
        roughness={0.38}
        metalness={0.12}
      />
    </mesh>
  ) : null}

  {kind === "cone" ? (
    <mesh ref={meshRef} position={[0, 1.05, 0]} castShadow receiveShadow>
      <coneGeometry args={[0.95, 2.6, 22]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.35}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  ) : null}

  {kind === "pillar" ? (
    <group>
      <mesh ref={meshRef} position={[0, 1.8, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.44, 2.5, 10, 18]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.35}
          roughness={0.26}
          metalness={0.18}
        />
      </mesh>
      <mesh position={[0, 3.35, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.2}
        />
      </mesh>
    </group>
  ) : null}
</group>

);
}

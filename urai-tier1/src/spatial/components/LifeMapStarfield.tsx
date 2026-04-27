"use client";

import * as THREE from "three";

export type StarPoint = {
id: string;
x: number;
y: number;
z: number;
color: string;
size: number;
};

type Props = {
visible: boolean;
selectedStarId?: string | null;
onSelectStar: (starId: string) => void;
ascentProgress: number;
focusProgress: number;
replayProgress: number;
};

export const LIFE_MAP_STARS: StarPoint[] = [
{ id: "origin", x: -5.8, y: -1.8, z: -16.5, color: "#9dc9ff", size: 0.3 },
{ id: "echo", x: -2.1, y: 1.3, z: -13.8, color: "#d6c3ff", size: 0.27 },
{ id: "ember", x: 2.6, y: 0.4, z: -12.9, color: "#ffc79d", size: 0.28 },
{ id: "rift", x: 5.2, y: -2.3, z: -15.2, color: "#9de0d1", size: 0.32 },
{ id: "veil", x: 0.4, y: 2.8, z: -18.4, color: "#c7dcff", size: 0.26 },
{ id: "north", x: -0.8, y: -0.7, z: -11.9, color: "#7ee8ff", size: 0.33 },
];

function clamp01(v: number) {
return Math.max(0, Math.min(1, v));
}

export default function LifeMapStarfield({
visible,
selectedStarId,
onSelectStar,
ascentProgress,
focusProgress,
replayProgress,
}: Props) {
if (!visible) return null;

const reveal = clamp01(ascentProgress);
const mapFade = Math.max(0, reveal - replayProgress * 0.36);
const focusFade = 1 - focusProgress * 0.28;

return ( <group visible={mapFade > 0.01}>
<fog attach="fog" args={["#03101b", 8, 44]} />


  {LIFE_MAP_STARS.map((star) => {
    const selected = star.id === selectedStarId;
    const opacity = (0.2 + mapFade * 0.8) * focusFade;
    const scale = selected ? 1.45 : 1;

    return (
      <group key={star.id} position={[star.x, star.y, star.z]}>
        <mesh onClick={() => onSelectStar(star.id)} scale={[scale, scale, scale]}>
          <sphereGeometry args={[star.size, 32, 24]} />
          <meshBasicMaterial color={star.color} transparent opacity={opacity} />
        </mesh>

        <mesh onClick={() => onSelectStar(star.id)} scale={[2.8 * scale, 2.8 * scale, 2.8 * scale]}>
          <sphereGeometry args={[star.size, 32, 24]} />
          <meshBasicMaterial color={star.color} transparent opacity={0.055 * opacity} depthWrite={false} />
        </mesh>

        <mesh onClick={() => onSelectStar(star.id)} scale={[5, 5, 5]}>
          <sphereGeometry args={[star.size, 16, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {selected && (
          <mesh scale={[2.6, 2.6, 2.6]}>
            <ringGeometry args={[star.size * 1.8, star.size * 1.92, 96]} />
            <meshBasicMaterial color="#bdefff" transparent opacity={0.24 * opacity} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    );
  })}
</group>


);
}

"use client";
/* URAI_CANON_LIFEMAP_V2 */
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Group, MathUtils } from "three";
import type { StarPoint } from "@/lib/uraiCanon/types";

export type LifeMapStarfieldProps = {
visible?: boolean;
stars?: StarPoint[];
selectedStarId?: string | null;
onSelectStar?: (starId: string) => void;
onHoverStar?: (starId: string | null) => void;
focusSuppression?: number;
};

function buildFallbackStars(): StarPoint[] {
const items: StarPoint[] = [];
for (let i = 0; i < 18; i += 1) {
const depthBand = i % 3;
const z = -28 - depthBand * 28 - Math.floor(i / 3) * 8;
const angle = (i / 18) * Math.PI * 2;
const radius = 6 + (i % 5) * 2.2 + depthBand * 1.6;
items.push({
id: `star-${i + 1}`,
position: [Math.cos(angle) * radius, Math.sin(angle * 1.4) * 3.6, z],
color: depthBand === 0 ? "#dce8ff" : depthBand === 1 ? "#b9d2ff" : "#8cb1ff",
scale: depthBand === 0 ? 0.34 : depthBand === 1 ? 0.28 : 0.22,
label: `Memory ${i + 1}`,
});
}
return items;
}

export function LifeMapStarfield({
visible = true,
stars,
selectedStarId = null,
onSelectStar,
onHoverStar,
focusSuppression = 0,
}: LifeMapStarfieldProps) {
const rootRef = useRef<Group>(null);
const { camera } = useThree();
const resolvedStars = useMemo(() => (stars && stars.length > 0 ? stars : buildFallbackStars()), [stars]);

useFrame((_, delta) => {
if (!rootRef.current) return;
const factor = 1 - Math.exp(-delta * 2.2);
rootRef.current.visible = visible;
rootRef.current.position.x = MathUtils.lerp(rootRef.current.position.x, -camera.position.x * 0.08, factor);
rootRef.current.position.y = MathUtils.lerp(rootRef.current.position.y, -camera.position.y * 0.05, factor);
rootRef.current.scale.setScalar(
MathUtils.lerp(rootRef.current.scale.x, visible ? 1 - focusSuppression * 0.04 : 0.9, factor),
);
});

return ( <group ref={rootRef} visible={visible}>
<group position={[0, 0, -70]}> <mesh>
<sphereGeometry args={[86, 48, 48]} /> <meshBasicMaterial color="#02091f" transparent opacity={0.14} /> </mesh> </group>

  {resolvedStars.map((star, index) => {
    const isSelected = star.id === selectedStarId;
    const baseScale = star.scale ?? 0.28;
    const scale = isSelected ? baseScale * 1.65 : baseScale;
    const opacity = isSelected ? 0.9 : 0.62 - Math.abs(star.position[2]) * 0.0024;

    return (
      <group key={star.id} position={star.position}>
        <mesh
          onPointerOver={() => onHoverStar?.(star.id)}
          onPointerOut={() => onHoverStar?.(null)}
          onClick={() => onSelectStar?.(star.id)}
        >
          <sphereGeometry args={[scale, 18, 18]} />
          <meshBasicMaterial color={star.color ?? "#dce8ff"} transparent opacity={Math.max(0.18, opacity)} />
        </mesh>

        <mesh scale={[1.85, 1.85, 1.85]}>
          <sphereGeometry args={[scale, 18, 18]} />
          <meshBasicMaterial color={star.color ?? "#dce8ff"} transparent opacity={isSelected ? 0.12 : 0.04} />
        </mesh>

        {index % 3 === 0 ? (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[scale * 3.4, 0.012, 10, 120]} />
            <meshBasicMaterial color="#86a5ff" transparent opacity={isSelected ? 0.35 : 0.1} />
          </mesh>
        ) : null}
      </group>
    );
  })}
</group>

);
}

export default LifeMapStarfield;

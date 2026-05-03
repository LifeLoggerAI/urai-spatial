"use client";
/* URAI_TIER2_LIFEMAP_DEPTH_LOCK_V1 */
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
for (let i = 0; i < 36; i += 1) {
const band = i % 4;
const z = -22 - band * 22 - Math.floor(i / 4) * 3.5;
const angle = (i / 36) * Math.PI * 2;
const radius = 6 + (i % 6) * 1.65 + band * 1.5;
items.push({
id: `star-${i + 1}`,
position: [Math.cos(angle) * radius, Math.sin(angle * 1.33) * 4.4, z],
color: band === 0 ? "#e5eeff" : band === 1 ? "#c8dbff" : band === 2 ? "#a8c2ff" : "#84a5ff",
scale: band === 0 ? 0.32 : band === 1 ? 0.26 : band === 2 ? 0.22 : 0.18,
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
const layerNearRef = useRef<Group>(null);
const layerMidRef = useRef<Group>(null);
const layerFarRef = useRef<Group>(null);
const { camera } = useThree();
const resolvedStars = useMemo(() => (stars && stars.length > 0 ? stars : buildFallbackStars()), [stars]);

useFrame((_, delta) => {
const f = 1 - Math.exp(-delta * 2.4);
if (rootRef.current) {
rootRef.current.visible = visible;
rootRef.current.scale.setScalar(MathUtils.lerp(rootRef.current.scale.x, visible ? 1 - focusSuppression * 0.035 : 0.92, f));
}
if (layerNearRef.current) {
layerNearRef.current.position.x = MathUtils.lerp(layerNearRef.current.position.x, -camera.position.x * 0.12, f);
layerNearRef.current.position.y = MathUtils.lerp(layerNearRef.current.position.y, -camera.position.y * 0.08, f);
}
if (layerMidRef.current) {
layerMidRef.current.position.x = MathUtils.lerp(layerMidRef.current.position.x, -camera.position.x * 0.07, f);
layerMidRef.current.position.y = MathUtils.lerp(layerMidRef.current.position.y, -camera.position.y * 0.045, f);
}
if (layerFarRef.current) {
layerFarRef.current.position.x = MathUtils.lerp(layerFarRef.current.position.x, -camera.position.x * 0.035, f);
layerFarRef.current.position.y = MathUtils.lerp(layerFarRef.current.position.y, -camera.position.y * 0.02, f);
}
});

const nearStars = resolvedStars.filter((s) => s.position[2] >= -40);
const midStars = resolvedStars.filter((s) => s.position[2] < -40 && s.position[2] >= -72);
const farStars = resolvedStars.filter((s) => s.position[2] < -72);

const renderStars = (items: StarPoint[]) =>
items.map((star, index) => {
const isSelected = star.id === selectedStarId;
const baseScale = star.scale ?? 0.24;
const depth = Math.abs(star.position[2]);
const fogged = Math.max(0.16, 0.72 - depth * 0.0048);
const scale = isSelected ? baseScale * 1.7 : baseScale;

```
  return (
    <group key={star.id} position={star.position}>
      <mesh
        onPointerOver={() => onHoverStar?.(star.id)}
        onPointerOut={() => onHoverStar?.(null)}
        onClick={() => onSelectStar?.(star.id)}
      >
        <sphereGeometry args={[scale, 18, 18]} />
        <meshBasicMaterial color={star.color ?? "#dce8ff"} transparent opacity={isSelected ? 0.92 : fogged} />
      </mesh>

      <mesh scale={[1.9, 1.9, 1.9]}>
        <sphereGeometry args={[scale, 18, 18]} />
        <meshBasicMaterial color={star.color ?? "#dce8ff"} transparent opacity={isSelected ? 0.14 : 0.045} />
      </mesh>

      {index % 4 === 0 ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[scale * 3.0, 0.01, 10, 120]} />
          <meshBasicMaterial color="#86a5ff" transparent opacity={isSelected ? 0.28 : 0.08} />
        </mesh>
      ) : null}
    </group>
  );
});
```

return ( <group ref={rootRef} visible={visible}>
<group position={[0, 0, -88]}> <mesh>
<sphereGeometry args={[120, 48, 48]} /> <meshBasicMaterial color="#02081a" transparent opacity={0.15} /> </mesh> </group>

```
  <group ref={layerNearRef}>{renderStars(nearStars)}</group>
  <group ref={layerMidRef}>{renderStars(midStars)}</group>
  <group ref={layerFarRef}>{renderStars(farStars)}</group>
</group>
```

);
}

export default LifeMapStarfield;

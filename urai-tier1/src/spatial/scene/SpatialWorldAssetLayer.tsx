"use client";

import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";

type GroupProps = ThreeElements["group"];

type SpatialAssetPhase = "HOME" | "GROUND" | "LIFEMAP" | "FOCUS" | "REPLAY" | "PASSPORT" | "STATUS" | "ASCENT";

const GENERATED_HOME_ENTRY_CHAMBER = "/assets/urai/generated/models/home-entry-chamber-v1.glb";
const GENERATED_PORTAL_RING = "/assets/urai/generated/models/portal-ring-master-v1.glb";
const GENERATED_GROUND_WORLD = "/assets/urai/generated/models/ground-world-terrain-v1.glb";
const GENERATED_FOCUS_STAR_FLIGHT = "/assets/urai/generated/models/focus-star-flight-v1.glb";
const GENERATED_REPLAY_MEMORY_FILM = "/assets/urai/generated/models/replay-memory-film-v1.glb";
const GENERATED_PASSPORT_STATUS_ROOM = "/assets/urai/generated/models/passport-status-room-v1.glb";

function AssetModel({ src, name, ...props }: GroupProps & { src: string; name: string }) {
  const gltf = useGLTF(src);
  return <primitive object={gltf.scene.clone(true)} name={name} {...props} />;
}

function OptionalGeneratedAssetModel(props: GroupProps & { src: string; name: string }) {
  // Generated V1 assets are committed candidate files. If a future replacement is missing,
  // Suspense/fallback handles the load boundary without reintroducing legacy 404 paths.
  return <AssetModel {...props} />;
}

export default function SpatialWorldAssetLayer({ phase }: { phase: string }) {
  const worldPhase = phase as SpatialAssetPhase;
  const showHome = worldPhase === "HOME" || worldPhase === "ASCENT" || worldPhase === "LIFEMAP";
  const showGround = worldPhase === "GROUND" || worldPhase === "HOME" || worldPhase === "LIFEMAP";
  const showLifeMap = worldPhase === "LIFEMAP" || worldPhase === "ASCENT" || worldPhase === "FOCUS" || worldPhase === "REPLAY";
  const showFocus = worldPhase === "FOCUS" || worldPhase === "REPLAY";
  const showReplay = worldPhase === "REPLAY";
  const showPassportStatus = worldPhase === "PASSPORT" || worldPhase === "STATUS" || worldPhase === "HOME";

  return (
    <group name="urai-spatial-world-asset-layer">
      {showHome && (
        <group name="entry-chamber-assets">
          <OptionalGeneratedAssetModel src={GENERATED_HOME_ENTRY_CHAMBER} name="home-entry-chamber-v1" position={[0, -0.08, -2.4]} scale={[0.72, 0.72, 0.72]} />
          <OptionalGeneratedAssetModel src={GENERATED_PORTAL_RING} name="portal-ring-ground-descent-v1" position={[-2.95, 0.9, -1.2]} rotation={[Math.PI / 2, 0.08, -0.2]} scale={[0.34, 0.34, 0.34]} />
          <OptionalGeneratedAssetModel src={GENERATED_PORTAL_RING} name="portal-ring-life-map-ascent-v1" position={[2.95, 1.15, -1.4]} rotation={[Math.PI / 2, -0.08, 0.2]} scale={[0.34, 0.34, 0.34]} />
          <OptionalGeneratedAssetModel src={GENERATED_PORTAL_RING} name="portal-ring-passport-status-v1" position={[0, 0.98, 2.95]} rotation={[Math.PI / 2, 0, Math.PI]} scale={[0.28, 0.28, 0.28]} />
        </group>
      )}

      {showGround && (
        <group name="ground-world-assets" position={[0, -3.35, -5.35]} scale={[0.52, 0.52, 0.52]}>
          <OptionalGeneratedAssetModel src={GENERATED_GROUND_WORLD} name="ground-world-terrain-v1" />
          <OptionalGeneratedAssetModel src={GENERATED_PORTAL_RING} name="ground-return-portal-v1" position={[0, 0.28, -2.85]} rotation={[Math.PI / 2, 0, 0]} scale={[0.42, 0.42, 0.42]} />
        </group>
      )}

      {showLifeMap && (
        <group name="life-map-sky-assets" position={[0, 4.8, -7.2]} scale={[0.75, 0.75, 0.75]}>
          <OptionalGeneratedAssetModel src={GENERATED_PORTAL_RING} name="life-map-sky-aperture-v1" position={[0, 0.15, -0.8]} rotation={[Math.PI / 2, 0, 0]} scale={[0.48, 0.48, 0.48]} />
          <OptionalGeneratedAssetModel src={GENERATED_PORTAL_RING} name="life-map-star-selection-ring-left-v1" position={[-2.7, 0.5, -2.5]} rotation={[Math.PI / 2, 0.12, -0.28]} scale={[0.22, 0.22, 0.22]} />
          <OptionalGeneratedAssetModel src={GENERATED_PORTAL_RING} name="life-map-star-selection-ring-right-v1" position={[2.7, 0.62, -2.8]} rotation={[Math.PI / 2, -0.12, 0.28]} scale={[0.22, 0.22, 0.22]} />
        </group>
      )}

      {showFocus && (
        <group name="focus-star-assets" position={[0, 4.4, -8]} scale={[0.82, 0.82, 0.82]}>
          <OptionalGeneratedAssetModel src={GENERATED_FOCUS_STAR_FLIGHT} name="focus-star-flight-v1" />
        </group>
      )}

      {showReplay && <OptionalGeneratedAssetModel src={GENERATED_REPLAY_MEMORY_FILM} name="replay-memory-film-v1" position={[0, 4.25, -9.3]} scale={[0.72, 0.72, 0.72]} />}
      {showPassportStatus && <OptionalGeneratedAssetModel src={GENERATED_PASSPORT_STATUS_ROOM} name="passport-status-room-v1" position={[0, -0.42, 3.9]} scale={[0.42, 0.42, 0.42]} />}
    </group>
  );
}

useGLTF.preload(GENERATED_HOME_ENTRY_CHAMBER);
useGLTF.preload(GENERATED_PORTAL_RING);
useGLTF.preload(GENERATED_GROUND_WORLD);
useGLTF.preload(GENERATED_FOCUS_STAR_FLIGHT);
useGLTF.preload(GENERATED_REPLAY_MEMORY_FILM);
useGLTF.preload(GENERATED_PASSPORT_STATUS_ROOM);

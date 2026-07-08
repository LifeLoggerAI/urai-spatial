"use client";

import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";

type GroupProps = ThreeElements["group"];

const GENERATED_HOME_ENTRY_CHAMBER = "/assets/urai/generated/models/home-entry-chamber-v1.glb";

function AssetModel({ src, name, ...props }: GroupProps & { src: string; name: string }) {
  const gltf = useGLTF(src);
  return <primitive object={gltf.scene.clone(true)} name={name} {...props} />;
}

function OptionalLegacyAssetModel(props: GroupProps & { src: string; name: string }) {
  // The legacy procedural GLTF paths are generation slots, not guaranteed runtime files.
  // Do not attempt to fetch them until they are promoted; missing files must not crash Home.
  if (props.src.startsWith("/assets/urai/spatial/")) return null;
  return <AssetModel {...props} />;
}

export default function SpatialWorldAssetLayer({ phase }: { phase: string }) {
  const showHome = phase === "HOME" || phase === "ASCENT" || phase === "LIFEMAP";
  const showGround = phase === "GROUND" || phase === "HOME";
  const showLifeMap = phase === "LIFEMAP" || phase === "ASCENT";
  const showFocus = phase === "FOCUS" || phase === "REPLAY";
  const showReplay = phase === "REPLAY";
  const showPassport = phase === "PASSPORT";
  const showStatus = phase === "STATUS";

  return (
    <group name="urai-spatial-world-asset-layer">
      {showHome && (
        <group name="entry-chamber-assets">
          <AssetModel src={GENERATED_HOME_ENTRY_CHAMBER} name="home-entry-chamber-v1" position={[0, -0.08, -2.4]} scale={[0.72, 0.72, 0.72]} />
          <OptionalLegacyAssetModel src="/assets/urai/spatial/entry-chamber/models/entry-floor-ring-v1.gltf" name="entry-floor-ring-v1" position={[0, -0.03, -0.55]} scale={[0.94, 0.94, 0.94]} />
          <OptionalLegacyAssetModel src="/assets/urai/spatial/entry-chamber/models/central-orb-v1.gltf" name="central-orb-v1" position={[-0.52, 1.05, 0]} scale={[0.44, 0.44, 0.44]} />
          <OptionalLegacyAssetModel src="/assets/urai/spatial/shared/models/universal-portal-ring-v1.gltf" name="entry-ground-portal-ring-v1" position={[0, -0.24, -4.8]} rotation={[Math.PI / 2, 0, 0]} scale={[0.52, 0.52, 0.52]} />
          <OptionalLegacyAssetModel src="/assets/urai/spatial/entry-chamber/models/ground-descent-hatch-v1.gltf" name="ground-descent-hatch-v1" position={[0, -0.35, -3.4]} scale={[0.72, 0.72, 0.72]} />
        </group>
      )}

      {showGround && (
        <group name="ground-room-assets" position={[0, -2.9, -5.8]} scale={[0.62, 0.62, 0.62]}>
          <OptionalLegacyAssetModel src="/assets/urai/spatial/ground-room/models/ground-room-shell-v1.gltf" name="ground-room-shell-v1" />
          <OptionalLegacyAssetModel src="/assets/urai/spatial/ground-room/models/ground-terminal-v1.gltf" name="ground-terminal-left-v1" position={[-3.2, 0.35, -1.8]} rotation={[0, 0.42, 0]} />
          <OptionalLegacyAssetModel src="/assets/urai/spatial/ground-room/models/ground-terminal-v1.gltf" name="ground-terminal-right-v1" position={[3.2, 0.35, -1.8]} rotation={[0, -0.42, 0]} />
          <OptionalLegacyAssetModel src="/assets/urai/spatial/ground-room/models/agent-source-station-v1.gltf" name="agent-source-station-left-v1" position={[-1.9, 0.2, -0.8]} />
          <OptionalLegacyAssetModel src="/assets/urai/spatial/ground-room/models/agent-source-station-v1.gltf" name="agent-source-station-right-v1" position={[1.9, 0.2, -0.8]} />
        </group>
      )}

      {showLifeMap && (
        <group name="life-map-sky-assets" position={[0, 4.8, -7.2]} scale={[0.75, 0.75, 0.75]}>
          <OptionalLegacyAssetModel src="/assets/urai/spatial/life-map/models/life-map-sky-dome-v1.gltf" name="life-map-sky-dome-v1" />
          <OptionalLegacyAssetModel src="/assets/urai/spatial/life-map/models/star-memory-node-v1.gltf" name="star-memory-node-origin-v1" position={[0, 1.1, -1.2]} />
          <OptionalLegacyAssetModel src="/assets/urai/spatial/life-map/models/star-memory-node-v1.gltf" name="star-memory-node-left-v1" position={[-2.7, 0.5, -2.5]} scale={[0.7, 0.7, 0.7]} />
          <OptionalLegacyAssetModel src="/assets/urai/spatial/life-map/models/star-memory-node-v1.gltf" name="star-memory-node-right-v1" position={[2.7, 0.62, -2.8]} scale={[0.7, 0.7, 0.7]} />
        </group>
      )}

      {showFocus && (
        <group name="focus-star-assets" position={[0, 4.4, -8]} scale={[0.82, 0.82, 0.82]}>
          <OptionalLegacyAssetModel src="/assets/urai/spatial/focus-star/models/focus-star-tunnel-v1.gltf" name="focus-star-tunnel-v1" />
          <OptionalLegacyAssetModel src="/assets/urai/spatial/life-map/models/star-memory-node-v1.gltf" name="focus-selected-star-node-v1" position={[0, 0, -1.2]} scale={[1.25, 1.25, 1.25]} />
        </group>
      )}

      {showReplay && <OptionalLegacyAssetModel src="/assets/urai/spatial/replay-portal/models/replay-film-portal-v1.gltf" name="replay-film-portal-v1" position={[0, 4.25, -9.3]} scale={[0.72, 0.72, 0.72]} />}
      {showPassport && <OptionalLegacyAssetModel src="/assets/urai/spatial/passport-room/models/passport-identity-plinth-v1.gltf" name="passport-identity-plinth-v1" position={[-1.15, 0.58, -2.2]} scale={[1.25, 1.25, 1.25]} />}
      {showStatus && <OptionalLegacyAssetModel src="/assets/urai/spatial/status-room/models/status-control-board-v1.gltf" name="status-control-board-v1" position={[1.25, 0.42, -2.2]} scale={[1.1, 1.1, 1.1]} />}
    </group>
  );
}

useGLTF.preload(GENERATED_HOME_ENTRY_CHAMBER);

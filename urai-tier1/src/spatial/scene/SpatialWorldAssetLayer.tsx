"use client";

import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { resolvePromotedUraiSpatialAssetPath } from "../assets/promotedAssetResolver";
import SpatialSensoryLayer from "./SpatialSensoryLayer";

type GroupProps = ThreeElements["group"];

type AssetErrorBoundaryProps = { children: ReactNode; fallback: ReactNode };
type AssetErrorBoundaryState = { failed: boolean };

class AssetErrorBoundary extends Component<AssetErrorBoundaryProps, AssetErrorBoundaryState> {
  state: AssetErrorBoundaryState = { failed: false };
  static getDerivedStateFromError(): AssetErrorBoundaryState { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.warn("URAI spatial asset load failed; rendering governed fallback.", error, info.componentStack); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

type AssetModelProps = GroupProps & {
  assetId: string;
  name: string;
};

function resolveRequiredModelPath(assetId: string): string {
  const path = resolvePromotedUraiSpatialAssetPath(assetId);
  if (!path) throw new Error(`URAI spatial model is unavailable: ${assetId}`);
  if (!/\.(?:gltf|glb)$/i.test(path)) {
    throw new Error(`URAI spatial asset is not a model: ${assetId} -> ${path}`);
  }
  return path;
}

function AssetModel({ assetId, name, ...props }: AssetModelProps) {
  const src = resolveRequiredModelPath(assetId);
  const gltf = useGLTF(src);
  return <primitive object={gltf.scene.clone(true)} name={name} data-urai-asset-id={assetId} data-urai-asset-path={src} {...props} />;
}

function HomeEntryChamber(props: GroupProps) {
  const proofFallback = (
    <AssetErrorBoundary fallback={<group name="entry-chamber-empty-fallback" data-urai-asset-state="unavailable" />}>
      <AssetModel assetId="home-entry-chamber-proof-fallback" name="entry-chamber-proof-fallback" {...props} />
    </AssetErrorBoundary>
  );
  return (
    <AssetErrorBoundary fallback={proofFallback}>
      <AssetModel assetId="home-entry-chamber-model-v1" name="entry-chamber-shell-v1" {...props} />
    </AssetErrorBoundary>
  );
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
      <SpatialSensoryLayer />
      {showHome && (
        <group name="entry-chamber-assets">
          <HomeEntryChamber position={[0, -0.08, -2.4]} scale={[0.72, 0.72, 0.72]} />
          <AssetModel assetId="home-entry-floor-ring-proof-fallback" name="entry-floor-ring-v1" position={[0, -0.03, -0.55]} scale={[0.94, 0.94, 0.94]} />
          <AssetModel assetId="urai-orb-avatar-glb-v1" name="central-orb-v1" position={[-0.52, 1.05, 0]} scale={[0.44, 0.44, 0.44]} />
          <AssetModel assetId="portal-ring-master-glb-v1" name="entry-ground-portal-ring-v1" position={[0, -0.24, -4.8]} rotation={[Math.PI / 2, 0, 0]} scale={[0.52, 0.52, 0.52]} />
          <AssetModel assetId="ground-descent-hatch-proof-fallback" name="ground-descent-hatch-v1" position={[0, -0.35, -3.4]} scale={[0.72, 0.72, 0.72]} />
        </group>
      )}
      {showGround && (
        <group name="ground-room-assets" position={[0, -2.9, -5.8]} scale={[0.62, 0.62, 0.62]}>
          <AssetModel assetId="ground-world-terrain-glb-v1" name="ground-room-shell-v1" />
          <AssetModel assetId="ground-terminal-proof-fallback" name="ground-terminal-left-v1" position={[-3.2, 0.35, -1.8]} rotation={[0, 0.42, 0]} />
          <AssetModel assetId="ground-terminal-proof-fallback" name="ground-terminal-right-v1" position={[3.2, 0.35, -1.8]} rotation={[0, -0.42, 0]} />
          <AssetModel assetId="agent-source-station-proof-fallback" name="agent-source-station-left-v1" position={[-1.9, 0.2, -0.8]} />
          <AssetModel assetId="agent-source-station-proof-fallback" name="agent-source-station-right-v1" position={[1.9, 0.2, -0.8]} />
        </group>
      )}
      {showLifeMap && (
        <group name="life-map-sky-assets" position={[0, 4.8, -7.2]} scale={[0.75, 0.75, 0.75]}>
          <AssetModel assetId="life-map-sky-dome-proof-fallback" name="life-map-sky-dome-v1" />
          <AssetModel assetId="life-map-memory-star-glb-v1" name="star-memory-node-origin-v1" position={[0, 1.1, -1.2]} />
          <AssetModel assetId="life-map-memory-star-glb-v1" name="star-memory-node-left-v1" position={[-2.7, 0.5, -2.5]} scale={[0.7, 0.7, 0.7]} />
          <AssetModel assetId="life-map-memory-star-glb-v1" name="star-memory-node-right-v1" position={[2.7, 0.62, -2.8]} scale={[0.7, 0.7, 0.7]} />
        </group>
      )}
      {showFocus && (
        <group name="focus-star-assets" position={[0, 4.4, -8]} scale={[0.82, 0.82, 0.82]}>
          <AssetModel assetId="focus-memory-chamber-glb-v1" name="focus-star-tunnel-v1" />
          <AssetModel assetId="life-map-memory-star-glb-v1" name="focus-selected-star-node-v1" position={[0, 0, -1.2]} scale={[1.25, 1.25, 1.25]} />
        </group>
      )}
      {showReplay && <AssetModel assetId="replay-memory-environment-glb-v1" name="replay-film-portal-v1" position={[0, 4.25, -9.3]} scale={[0.72, 0.72, 0.72]} />}
      {showPassport && <AssetModel assetId="passport-status-room-glb-v1" name="passport-identity-plinth-v1" position={[-1.15, 0.58, -2.2]} scale={[1.25, 1.25, 1.25]} />}
      {showStatus && <AssetModel assetId="status-control-board-proof-fallback" name="status-control-board-v1" position={[1.25, 0.42, -2.2]} scale={[1.1, 1.1, 1.1]} />}
    </group>
  );
}

"use client";

import { Html, useGLTF, useTexture } from "@react-three/drei";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { resolvePromotedUraiSpatialAssetPath } from "../assets/promotedAssetResolver";

type GroupProps = ThreeElements["group"];

type AssetModelProps = GroupProps & {
  assetId: string;
  name: string;
};

const PARTICLE_ATLAS_PATH = "/assets/urai/generated/textures/spatial-particle-atlas-v1.svg";
const MATERIAL_PACK_PATH = "/assets/urai/generated/textures/global-cinematic-material-pack-v1.json";
const LOADING_SEQUENCE_PATH = "/assets/urai/generated/loading/urai-loading-sequence-v1.json";
const AMBIENT_SCORE_PATH = "/assets/urai/generated/audio/urai-ambient-bed-v1.json";

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

type AmbientVoice = { type: OscillatorType; frequencyHz: number; gain: number };
type AmbientScore = { voices: AmbientVoice[]; masterGain: number; fadeSeconds: number };
type MaterialPack = { materials?: { portalEnergy?: { baseColor?: string } } };
type LoadingSequence = { accessibleLabel?: string };

function SpatialSensoryLayer() {
  const points = useRef<THREE.Points>(null);
  const texture = useTexture(PARTICLE_ATLAS_PATH);
  const audioRef = useRef<{ context: AudioContext; gain: GainNode; oscillators: OscillatorNode[] } | null>(null);
  const [particleColor, setParticleColor] = useState("#9eeeff");
  const [loadingLabel, setLoadingLabel] = useState("Preparing your spatial world");
  const [audioEnabled, setAudioEnabled] = useState(false);

  const positions = useMemo(() => {
    const values = new Float32Array(240 * 3);
    for (let index = 0; index < 240; index += 1) {
      const radius = 3.8 + (index % 37) * 0.13;
      const angle = index * 2.399963;
      values[index * 3] = Math.cos(angle) * radius;
      values[index * 3 + 1] = -0.4 + ((index * 19) % 95) / 18;
      values[index * 3 + 2] = Math.sin(angle) * radius;
    }
    return values;
  }, []);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(MATERIAL_PACK_PATH).then((response) => response.ok ? response.json() as Promise<MaterialPack> : Promise.reject(new Error("material pack unavailable"))),
      fetch(LOADING_SEQUENCE_PATH).then((response) => response.ok ? response.json() as Promise<LoadingSequence> : Promise.reject(new Error("loading sequence unavailable"))),
    ]).then(([materials, loading]) => {
      if (!active) return;
      setParticleColor(materials.materials?.portalEnergy?.baseColor ?? "#9eeeff");
      setLoadingLabel(loading.accessibleLabel ?? "Preparing your spatial world");
    }).catch(() => {
      if (!active) return;
      setParticleColor("#9eeeff");
      setLoadingLabel("Preparing your spatial world");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    const current = audioRef.current;
    if (!current) return;
    current.oscillators.forEach((oscillator) => oscillator.stop());
    void current.context.close();
  }, []);

  useFrame(({ clock }) => {
    if (points.current) points.current.rotation.y = clock.elapsedTime * 0.018;
  });

  async function toggleAmbientAudio() {
    const current = audioRef.current;
    if (current) {
      const now = current.context.currentTime;
      current.gain.gain.cancelScheduledValues(now);
      current.gain.gain.linearRampToValueAtTime(0, now + 0.35);
      window.setTimeout(() => {
        current.oscillators.forEach((oscillator) => oscillator.stop());
        void current.context.close();
      }, 400);
      audioRef.current = null;
      setAudioEnabled(false);
      return;
    }

    try {
      const response = await fetch(AMBIENT_SCORE_PATH);
      if (!response.ok) throw new Error("ambient score unavailable");
      const score = await response.json() as AmbientScore;
      const context = new AudioContext();
      const master = context.createGain();
      master.gain.setValueAtTime(0, context.currentTime);
      master.gain.linearRampToValueAtTime(score.masterGain, context.currentTime + score.fadeSeconds);
      master.connect(context.destination);
      const oscillators = score.voices.map((voice) => {
        const oscillator = context.createOscillator();
        const voiceGain = context.createGain();
        oscillator.type = voice.type;
        oscillator.frequency.value = voice.frequencyHz;
        voiceGain.gain.value = voice.gain;
        oscillator.connect(voiceGain).connect(master);
        oscillator.start();
        return oscillator;
      });
      audioRef.current = { context, gain: master, oscillators };
      setAudioEnabled(true);
    } catch {
      setAudioEnabled(false);
    }
  }

  return (
    <group name="urai-production-sensory-layer" data-loading-sequence={LOADING_SEQUENCE_PATH} data-material-pack={MATERIAL_PACK_PATH}>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial map={texture} color={particleColor} size={0.42} transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <Html position={[0, -2.6, 0]} center>
        <button type="button" aria-label={`${audioEnabled ? "Disable" : "Enable"} ambient spatial audio`} title={loadingLabel} data-urai-asset-id="urai-ambient-bed-v1" data-urai-asset-path={AMBIENT_SCORE_PATH} onClick={toggleAmbientAudio} style={{ border: "1px solid rgba(126,232,255,.38)", borderRadius: 999, background: "rgba(4,9,22,.82)", color: "#dff8ff", padding: "8px 12px", cursor: "pointer" }}>
          {audioEnabled ? "Ambient on" : "Ambient off"}
        </button>
      </Html>
    </group>
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
          <AssetModel assetId="home-entry-chamber-model-v1" name="entry-chamber-shell-v1" position={[0, -0.08, -2.4]} scale={[0.72, 0.72, 0.72]} />
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

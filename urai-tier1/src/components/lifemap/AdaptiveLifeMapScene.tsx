"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import * as THREE from "three";
import { useLifeMapEvents } from "./useLifeMapEvents";
import {
  lifeMapTypeLabels,
  narrationForNode,
  type LifeMapNode,
} from "./lifeMapData";
import {
  markFirstSpatialFrame,
  useAdaptiveSpatialQuality,
  type SpatialQualityProfile,
} from "@/spatial/performance/useAdaptiveSpatialQuality";

type CameraIntent = {
  position: [number, number, number];
  target: [number, number, number];
};

type PersistedLifeMapState = {
  selectedId: string | null;
  cameraIntent: CameraIntent;
};

type WebGLState = "starting" | "ready" | "lost" | "recovering" | "failed";

type LoseContextExtension = {
  restoreContext?: () => void;
};

type MemoryPortalHandlers = {
  onEnterFocus: (node: LifeMapNode) => void;
  onEnterReplay: (node: LifeMapNode) => void;
  onOverview: () => void;
};

const OVERVIEW_CAMERA: CameraIntent = {
  position: [0.35, 2.55, 11.8],
  target: [0.05, 0.05, -2.6],
};

const LIFE_MAP_STATE_KEY = "urai:spatial:lifeMapState";
const DEFAULT_MANIFEST_ID = "replay-recovery-thread";

function safeToken(value: string | null, fallback = "") {
  if (!value) return fallback;
  const trimmed = value.trim().slice(0, 120);
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : fallback;
}

function validVector(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "number" && Number.isFinite(item));
}

function isLifeMapUiTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(".life-map-accessibility-menu, .life-map-recovery, .life-map-memory-portals"));
}

function readPersistedState(): PersistedLifeMapState {
  if (typeof window === "undefined") return { selectedId: null, cameraIntent: OVERVIEW_CAMERA };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIFE_MAP_STATE_KEY) || "{}") as Partial<PersistedLifeMapState>;
    const camera = parsed.cameraIntent;
    return {
      selectedId: typeof parsed.selectedId === "string" ? parsed.selectedId : null,
      cameraIntent: camera && validVector(camera.position) && validVector(camera.target)
        ? { position: camera.position, target: camera.target }
        : OVERVIEW_CAMERA,
    };
  } catch {
    return { selectedId: null, cameraIntent: OVERVIEW_CAMERA };
  }
}

function cameraForNode(node: LifeMapNode): CameraIntent {
  const lateral = node.position[0] >= 0 ? 0.95 : -0.95;
  return {
    position: [node.position[0] + lateral, node.position[1] + 0.72, node.position[2] + 3.35],
    target: [node.position[0], node.position[1] + 0.05, node.position[2] - 0.18],
  };
}

function titleize(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((part) => part + part).join("") : value.padEnd(6, "0").slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return `rgba(138, 223, 255, ${alpha})`;
  const number = Number.parseInt(normalized, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function createMemorySurface(node: LifeMapNode, resolution: number) {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const designScale = resolution / 768;
  ctx.scale(designScale, designScale);
  const aura = node.aura || "#8adfff";
  const deep = ctx.createLinearGradient(80, 40, 688, 728);
  deep.addColorStop(0, "rgba(230,250,255,.96)");
  deep.addColorStop(0.08, hexToRgba(aura, 0.92));
  deep.addColorStop(0.46, "rgba(8,20,48,.98)");
  deep.addColorStop(1, "rgba(1,4,14,.99)");

  roundedRect(ctx, 52, 52, 664, 664, 78);
  ctx.fillStyle = deep;
  ctx.fill();

  ctx.save();
  roundedRect(ctx, 64, 64, 640, 640, 68);
  ctx.clip();

  const horizon = ctx.createLinearGradient(0, 180, 0, 650);
  horizon.addColorStop(0, "rgba(255,255,255,.03)");
  horizon.addColorStop(0.5, hexToRgba(aura, 0.12));
  horizon.addColorStop(1, "rgba(0,0,0,.72)");
  ctx.fillStyle = horizon;
  ctx.fillRect(64, 64, 640, 640);

  for (let index = 0; index < 48; index += 1) {
    const x = 80 + ((Math.sin(index * 17.13 + node.id.length) * 0.5 + 0.5) * 610);
    const y = 80 + ((Math.cos(index * 11.71 + node.title.length) * 0.5 + 0.5) * 560);
    const radius = 1.2 + (index % 5) * 0.55;
    ctx.fillStyle = index % 4 === 0 ? "rgba(255,255,255,.78)" : hexToRgba(aura, 0.48);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "screen";
  if (node.type === "relationship") {
    ctx.fillStyle = "rgba(245,252,255,.7)";
    ctx.beginPath();
    ctx.arc(286, 328, 64, 0, Math.PI * 2);
    ctx.arc(494, 300, 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(aura, 0.74);
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(340, 316);
    ctx.bezierCurveTo(382, 250, 438, 382, 456, 322);
    ctx.stroke();
  } else if (node.type === "threshold") {
    ctx.fillStyle = hexToRgba(aura, 0.4);
    ctx.beginPath();
    ctx.moveTo(382, 142);
    ctx.lineTo(586, 520);
    ctx.lineTo(182, 520);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.58)";
    ctx.fillRect(366, 252, 34, 274);
  } else if (node.type === "ritual") {
    ctx.strokeStyle = hexToRgba(aura, 0.68);
    ctx.lineWidth = 8;
    for (let ring = 0; ring < 4; ring += 1) {
      ctx.beginPath();
      ctx.ellipse(384, 380, 96 + ring * 58, 30 + ring * 14, -0.08, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (node.type === "recovery") {
    ctx.strokeStyle = hexToRgba(aura, 0.78);
    ctx.lineWidth = 7;
    for (let arc = 0; arc < 5; arc += 1) {
      ctx.beginPath();
      ctx.arc(384, 430, 58 + arc * 48, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(245,255,255,.7)";
    ctx.beginPath();
    ctx.arc(384, 360, 58, 0, Math.PI * 2);
    ctx.fill();
  } else if (node.type === "forecast") {
    ctx.strokeStyle = hexToRgba(aura, 0.66);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(170, 500);
    ctx.bezierCurveTo(260, 420, 330, 464, 404, 350);
    ctx.bezierCurveTo(486, 230, 552, 300, 624, 190);
    ctx.stroke();
  } else if (node.type === "legacy") {
    ctx.fillStyle = "rgba(3,9,24,.72)";
    for (let slab = 0; slab < 5; slab += 1) {
      const inset = slab * 32;
      roundedRect(ctx, 176 + inset, 172 + inset * 0.55, 416 - inset * 2, 318 - inset, 24);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(aura, 0.34 + slab * 0.06);
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  } else {
    const glow = ctx.createRadialGradient(330, 292, 18, 384, 372, 280);
    glow.addColorStop(0, "rgba(255,255,255,.86)");
    glow.addColorStop(0.22, hexToRgba(aura, 0.66));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(92, 92, 584, 540);

    ctx.strokeStyle = "rgba(235,251,255,.48)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(170, 490);
    ctx.bezierCurveTo(258, 420, 318, 520, 408, 438);
    ctx.bezierCurveTo(480, 374, 548, 408, 618, 326);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "source-over";
  const lower = ctx.createLinearGradient(0, 440, 0, 704);
  lower.addColorStop(0, "rgba(1,5,16,0)");
  lower.addColorStop(1, "rgba(1,5,16,.92)");
  ctx.fillStyle = lower;
  ctx.fillRect(64, 420, 640, 284);

  ctx.fillStyle = "rgba(235,250,255,.72)";
  ctx.font = "700 22px system-ui, sans-serif";
  ctx.fillText(lifeMapTypeLabels[node.type].toUpperCase(), 108, 552);

  ctx.fillStyle = "rgba(255,255,255,.98)";
  ctx.font = "800 40px system-ui, sans-serif";
  const title = node.title.length > 28 ? `${node.title.slice(0, 26)}…` : node.title;
  ctx.fillText(title, 108, 608);

  ctx.fillStyle = "rgba(219,241,255,.72)";
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText(node.dateLabel, 108, 648);

  ctx.restore();

  roundedRect(ctx, 52, 52, 664, 664, 78);
  ctx.strokeStyle = "rgba(235,252,255,.42)";
  ctx.lineWidth = 5;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = resolution >= 384 ? 8 : 4;
  texture.needsUpdate = true;
  return texture;
}

function FirstFrame({ profile }: { profile: SpatialQualityProfile }) {
  const marked = useRef(false);
  useFrame(() => {
    if (marked.current || !profile.documentVisible) return;
    marked.current = true;
    markFirstSpatialFrame("/life-map", profile.tier);
  });
  return null;
}

function CameraRig({ intent, reducedMotion, visible }: {
  intent: CameraIntent;
  reducedMotion: boolean;
  visible: boolean;
}) {
  const { camera } = useThree();
  const desired = useMemo(() => new THREE.Vector3(...intent.position), [intent.position]);
  const desiredTarget = useMemo(() => new THREE.Vector3(...intent.target), [intent.target]);
  const currentTarget = useRef(new THREE.Vector3(...intent.target));
  const transition = useRef({
    startPosition: camera.position.clone(),
    startTarget: currentTarget.current.clone(),
    progress: 1,
  });
  const workingPosition = useRef(new THREE.Vector3());

  useEffect(() => {
    transition.current = {
      startPosition: camera.position.clone(),
      startTarget: currentTarget.current.clone(),
      progress: reducedMotion ? 1 : 0,
    };
  }, [camera, desired, desiredTarget, reducedMotion]);

  useFrame((_, delta) => {
    if (!visible) return;
    if (reducedMotion) {
      camera.position.copy(desired);
      currentTarget.current.copy(desiredTarget);
      camera.lookAt(currentTarget.current);
      return;
    }

    const state = transition.current;
    state.progress = Math.min(1, state.progress + delta * 0.48);
    const eased = THREE.MathUtils.smootherstep(state.progress, 0, 1);
    workingPosition.current.lerpVectors(state.startPosition, desired, eased);
    const distance = state.startPosition.distanceTo(desired);
    const arc = Math.sin(Math.PI * eased);
    workingPosition.current.y += arc * Math.min(1.2, distance * 0.12);
    workingPosition.current.x += arc * (desired.x >= state.startPosition.x ? 0.18 : -0.18);
    camera.position.copy(workingPosition.current);
    currentTarget.current.lerpVectors(state.startTarget, desiredTarget, eased);
    camera.lookAt(currentTarget.current);
  });

  return null;
}

function ParallaxLayer({ profile, countMultiplier, radius, depth, opacity, size, seed }: {
  profile: SpatialQualityProfile;
  countMultiplier: number;
  radius: number;
  depth: number;
  opacity: number;
  size: number;
  seed: number;
}) {
  const group = useRef<THREE.Group>(null);
  const count = Math.max(180, Math.round(profile.particleCount * countMultiplier));
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      const normalized = index / Math.max(1, count - 1);
      const angle = index * 2.399963229728653 + seed;
      const radial = Math.sqrt(normalized) * radius;
      const wave = Math.sin(index * 0.37 + seed) * radius * 0.08;
      positions[index * 3] = Math.cos(angle) * radial + wave;
      positions[index * 3 + 1] = (Math.sin(index * 0.61 + seed) * 0.5 + Math.cos(index * 0.13) * 0.5) * radius * 0.34;
      positions[index * 3 + 2] = -Math.abs(Math.sin(angle * 0.72)) * depth - normalized * depth - 1.5;
      color.setHSL(0.52 + ((index + seed) % 7) * 0.012, 0.72, 0.58 + (index % 5) * 0.055);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    next.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return next;
  }, [count, depth, radius, seed]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (!group.current || profile.reducedMotion || !profile.documentVisible) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * (0.018 + seed * 0.002)) * 0.035;
    group.current.rotation.z = Math.cos(clock.elapsedTime * (0.014 + seed * 0.001)) * 0.018;
  });

  return (
    <group ref={group} name={`life-map-parallax-layer-${seed}`}>
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial size={size} vertexColors transparent opacity={opacity} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function ContinuityNexus({ profile }: { profile: SpatialQualityProfile }) {
  const group = useRef<THREE.Group>(null);
  const shards = useMemo(() => [
    { position: [-0.82, 0.4, 0.2] as [number, number, number], scale: [0.18, 1.8, 0.42] as [number, number, number], rotation: [0.22, -0.18, -0.14] as [number, number, number] },
    { position: [-0.28, -0.2, -0.15] as [number, number, number], scale: [0.28, 2.5, 0.58] as [number, number, number], rotation: [-0.12, 0.2, 0.1] as [number, number, number] },
    { position: [0.42, 0.48, 0.08] as [number, number, number], scale: [0.22, 2.05, 0.5] as [number, number, number], rotation: [0.18, -0.1, 0.2] as [number, number, number] },
    { position: [0.92, -0.18, -0.32] as [number, number, number], scale: [0.15, 1.45, 0.36] as [number, number, number], rotation: [-0.24, 0.26, -0.18] as [number, number, number] },
    { position: [0.08, 1.2, -0.45] as [number, number, number], scale: [1.8, 0.12, 0.34] as [number, number, number], rotation: [0.04, -0.2, -0.08] as [number, number, number] },
  ], []);

  useFrame(({ clock }) => {
    if (!group.current || profile.reducedMotion || !profile.documentVisible) return;
    group.current.rotation.y = -0.18 + Math.sin(clock.elapsedTime * 0.05) * 0.035;
    group.current.position.y = 0.2 + Math.sin(clock.elapsedTime * 0.11) * 0.08;
  });

  return (
    <group ref={group} position={[0.45, 0.2, -10.4]} rotation={[0.06, -0.18, -0.04]} name="life-map-continuity-nexus">
      {shards.map((shard, index) => (
        <mesh key={index} position={shard.position} rotation={shard.rotation} scale={shard.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhysicalMaterial
            color={index % 2 === 0 ? "#071425" : "#0b0c1f"}
            emissive={index === 2 ? "#5ce8ff" : "#342450"}
            emissiveIntensity={index === 2 ? 0.42 : 0.11}
            roughness={0.16}
            metalness={0.72}
            transmission={0.08}
            transparent
            opacity={0.94}
          />
        </mesh>
      ))}
      <mesh position={[0.08, 0.08, 0.18]} rotation={[0, 0.12, 0]}>
        <planeGeometry args={[2.6, 4.5]} />
        <meshBasicMaterial color="#90f5ff" transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight position={[0.08, 0.4, 1.2]} color="#9ff7ff" intensity={1.1} distance={8} />
    </group>
  );
}

function ChapterRegions({ nodes, selectedId }: { nodes: LifeMapNode[]; selectedId: string | null }) {
  const regions = useMemo(() => {
    const grouped = new Map<string, LifeMapNode[]>();
    nodes.forEach((node) => {
      const key = node.eraId || node.clusterId || "present";
      grouped.set(key, [...(grouped.get(key) || []), node]);
    });
    return [...grouped.entries()].map(([id, members], index) => {
      const total = members.reduce<[number, number, number]>((sum, node) => [
        sum[0] + node.position[0],
        sum[1] + node.position[1],
        sum[2] + node.position[2],
      ], [0, 0, 0]);
      const center: [number, number, number] = [
        total[0] / members.length,
        total[1] / members.length,
        total[2] / members.length - 0.24,
      ];
      return {
        id,
        center,
        radius: 1.05 + members.length * 0.28,
        aura: members[0]?.aura || "#8adfff",
        selected: members.some((node) => node.id === selectedId),
        start: index * 0.65,
      };
    });
  }, [nodes, selectedId]);

  return (
    <group name="life-map-middle-chapter-regions">
      {regions.map((region, index) => (
        <group key={region.id} position={region.center} rotation={[Math.PI / 2 + index * 0.07, index * 0.16, index * 0.04]}>
          <mesh>
            <ringGeometry args={[region.radius, region.radius + 0.035, 96, 1, region.start, Math.PI * 1.42]} />
            <meshBasicMaterial color={region.aura} transparent opacity={region.selected ? 0.34 : 0.11} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh rotation={[0.08, 0.18, 0]} position={[0, 0, -0.08]}>
            <ringGeometry args={[region.radius * 0.72, region.radius * 0.735, 80, 1, region.start + 0.8, Math.PI * 0.92]} />
            <meshBasicMaterial color="#d8fbff" transparent opacity={region.selected ? 0.22 : 0.055} depthWrite={false} />
          </mesh>
          {!selectedId ? (
            <Html distanceFactor={12} position={[region.radius * 0.28, region.radius * 0.72, 0]} center zIndexRange={[24, 4]}>
              <span className="life-map-region-label">{titleize(region.id)}</span>
            </Html>
          ) : null}
        </group>
      ))}
    </group>
  );
}

function GoalMonuments() {
  const monuments = [
    { position: [-7.4, 0.15, -19.5] as [number, number, number], height: 4.8, width: 0.8 },
    { position: [6.8, 1.1, -22.5] as [number, number, number], height: 6.2, width: 1.05 },
    { position: [2.6, -0.4, -26.5] as [number, number, number], height: 5.4, width: 0.72 },
  ];

  return (
    <group name="life-map-far-goal-monuments">
      {monuments.map((monument, index) => (
        <group key={index} position={monument.position} rotation={[0, index * 0.42 - 0.36, 0]}>
          <mesh scale={[monument.width, monument.height, 0.7]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#050b18" emissive={index === 1 ? "#d9c98e" : "#557a91"} emissiveIntensity={0.18} roughness={0.26} metalness={0.82} />
          </mesh>
          <mesh position={[0, monument.height * 0.56, 0.15]} scale={[monument.width * 1.35, 0.08, 0.9]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={index === 1 ? "#fff0b8" : "#b7efff"} transparent opacity={0.28} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PrivateVaults() {
  return (
    <group name="life-map-private-vaults">
      <group position={[-5.6, -2.4, -7.2]} rotation={[0.08, 0.44, -0.06]}>
        <mesh scale={[1.45, 0.72, 1.15]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#01040a" emissive="#182338" emissiveIntensity={0.14} roughness={0.18} metalness={0.88} />
        </mesh>
        <mesh position={[0, 0.02, 0.59]} scale={[0.34, 0.34, 0.03]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#d9f7ff" transparent opacity={0.22} />
        </mesh>
      </group>
      <group position={[5.7, -2.05, -9.2]} rotation={[-0.04, -0.38, 0.04]}>
        <mesh scale={[1.12, 0.58, 0.92]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#02030a" emissive="#271c38" emissiveIntensity={0.12} roughness={0.2} metalness={0.84} />
        </mesh>
      </group>
    </group>
  );
}

function EmotionalWeather({ profile }: { profile: SpatialQualityProfile }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || profile.reducedMotion || !profile.documentVisible) return;
    group.current.position.x = Math.sin(clock.elapsedTime * 0.035) * 0.8;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.022) * 0.04;
  });

  return (
    <group ref={group} position={[0, 0.3, -8]} name="life-map-emotional-weather">
      <mesh position={[-3.4, 1.1, -0.8]} rotation={[0.18, -0.28, 0.12]}>
        <planeGeometry args={[9.2, 4.8]} />
        <meshBasicMaterial color="#4fdfff" transparent opacity={0.026} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[3.5, -0.4, -1.8]} rotation={[-0.12, 0.32, -0.18]}>
        <planeGeometry args={[10.8, 5.6]} />
        <meshBasicMaterial color="#b177ff" transparent opacity={0.035} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.8, 2.4, -4.2]} rotation={[0.14, 0.08, 0.2]}>
        <planeGeometry args={[8.4, 3.2]} />
        <meshBasicMaterial color="#fff1bd" transparent opacity={0.018} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function MemoryPath({ from, to, active, profile }: {
  from: LifeMapNode;
  to: LifeMapNode;
  active: boolean;
  profile: SpatialQualityProfile;
}) {
  const pulse = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...from.position);
    const end = new THREE.Vector3(...to.position);
    const middle = start.clone().lerp(end, 0.5);
    middle.y += 0.7 + Math.abs(start.x - end.x) * 0.11;
    middle.z -= 0.55 + Math.abs(start.z - end.z) * 0.08;
    return new THREE.CatmullRomCurve3([start, middle, end]);
  }, [from, to]);

  useFrame(({ clock }) => {
    if (!pulse.current || !active || profile.reducedMotion || !profile.documentVisible) return;
    const t = (clock.elapsedTime * 0.075 + from.intensity * 0.17) % 1;
    pulse.current.position.copy(curve.getPointAt(t));
  });

  return (
    <group name="life-map-temporal-path">
      <mesh>
        <tubeGeometry args={[curve, 72, active ? 0.012 : 0.005, 6, false]} />
        <meshBasicMaterial color={active ? "#a5f7ff" : "#24344d"} transparent opacity={active ? 0.38 : 0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={pulse} visible={active && !profile.reducedMotion}>
        <sphereGeometry args={[0.034, 10, 10]} />
        <meshBasicMaterial color="#f4ffff" transparent opacity={0.78} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function MemoryArtifact({ node, selected, related, overview, profile, onSelect, onEnterFocus, onEnterReplay, onOverview }: {
  node: LifeMapNode;
  selected: boolean;
  related: boolean;
  overview: boolean;
  profile: SpatialQualityProfile;
  onSelect: (node: LifeMapNode) => void;
} & MemoryPortalHandlers) {
  const group = useRef<THREE.Group>(null);
  const glass = useRef<THREE.MeshPhysicalMaterial>(null);
  const { camera } = useThree();
  const textureResolution = selected
    ? profile.tier === "high" ? 512 : 384
    : overview
      ? profile.tier === "high" ? 128 : 96
      : related
        ? profile.tier === "high" ? 224 : 160
        : 80;
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const scale = 0.72 + node.intensity * 0.24;

  useEffect(() => {
    const nextTexture = createMemorySurface(node, textureResolution);
    setTexture(nextTexture);
    return () => {
      if (typeof window === "undefined") {
        nextTexture?.dispose();
        return;
      }
      window.requestAnimationFrame(() => nextTexture?.dispose());
    };
  }, [node, textureResolution]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.quaternion.slerp(camera.quaternion, profile.reducedMotion ? 1 : 0.075);
    if (!profile.reducedMotion && profile.documentVisible) {
      const breath = 1 + Math.sin(clock.elapsedTime * (0.52 + node.intensity) + node.position[0]) * 0.026;
      group.current.scale.setScalar(selected ? breath * 1.26 : related ? breath : breath * 0.78);
      group.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * 0.22 + node.position[2]) * 0.035;
    }
    if (glass.current) glass.current.opacity = selected ? 0.34 : related ? 0.16 : 0.06;
  });

  const choose = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(node);
  };

  return (
    <group ref={group} position={node.position} name={`life-map-memory-artifact-${node.type}`}>
      <mesh
        onClick={choose}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = ""; }}
        scale={[scale * 1.12, scale * 1.12, 1]}
      >
        <planeGeometry args={[1.42, 1.42, 1, 1]} />
        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 1 : related ? 0.88 : 0.42} toneMapped={false} />
      </mesh>

      <mesh position={[0, 0, -0.045]} scale={[scale * 1.27, scale * 1.27, 1]}>
        <planeGeometry args={[1.42, 1.42]} />
        <meshPhysicalMaterial
          ref={glass}
          color={node.aura}
          transparent
          opacity={selected ? 0.34 : 0.12}
          roughness={0.08}
          metalness={0.12}
          transmission={0.36}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[-scale * 0.86, scale * 0.52, -0.08]} rotation={[0, 0, -0.24]} scale={[scale * 0.34, scale * 0.18, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 0.52 : related ? 0.2 : 0.04} depthWrite={false} />
      </mesh>
      <mesh position={[scale * 0.82, -scale * 0.46, -0.1]} rotation={[0, 0, 0.2]} scale={[scale * 0.28, scale * 0.22, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 0.42 : related ? 0.16 : 0.03} depthWrite={false} />
      </mesh>

      {node.privacyLevel === "hidden" || node.locked ? (
        <mesh position={[0, 0, 0.08]} scale={[scale * 1.18, scale * 1.18, 1]}>
          <planeGeometry args={[1.42, 1.42]} />
          <meshBasicMaterial color="#01040a" transparent opacity={0.52} depthWrite={false} />
        </mesh>
      ) : null}

      {selected ? (
        <Html distanceFactor={8.6} position={[0, -scale * 1.18, 0.12]} center zIndexRange={[90, 30]}>
          <div className="life-map-memory-portals" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => onEnterFocus(node)}>Enter Focus</button>
            <button type="button" onClick={() => onEnterReplay(node)} disabled={!node.replayAvailable || node.locked}>Replay</button>
            <button type="button" onClick={onOverview}>Overview</button>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function ForegroundDepthCrossings({ profile }: { profile: SpatialQualityProfile }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || profile.reducedMotion || !profile.documentVisible) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.04) * 0.025;
  });

  return (
    <group ref={group} name="life-map-near-depth-crossings">
      <mesh position={[-6.8, -2.7, 3.4]} rotation={[0.1, 0.62, -0.12]} scale={[1.5, 4.8, 0.18]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#02050b" emissive="#102235" emissiveIntensity={0.12} roughness={0.16} metalness={0.86} />
      </mesh>
      <mesh position={[7.1, 2.3, 2.2]} rotation={[-0.18, -0.48, 0.2]} scale={[1.2, 3.9, 0.14]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#03040b" emissive="#241833" emissiveIntensity={0.1} roughness={0.18} metalness={0.82} />
      </mesh>
    </group>
  );
}

function LifeMapWorld({ nodes, selectedNode, profile, cameraIntent, onSelect, onEnterFocus, onEnterReplay, onOverview }: {
  nodes: LifeMapNode[];
  selectedNode: LifeMapNode | null;
  profile: SpatialQualityProfile;
  cameraIntent: CameraIntent;
  onSelect: (node: LifeMapNode) => void;
} & MemoryPortalHandlers) {
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const related = useMemo(() => {
    if (!selectedNode) return new Set(nodes.map((node) => node.id));
    const next = new Set<string>([selectedNode.id, ...selectedNode.connectedTo]);
    nodes.forEach((node) => {
      if (node.connectedTo.includes(selectedNode.id)) next.add(node.id);
    });
    return next;
  }, [nodes, selectedNode]);

  const edges = useMemo(() => {
    const seen = new Set<string>();
    return nodes.flatMap((node) => node.connectedTo.flatMap((targetId) => {
      const target = nodeById.get(targetId);
      if (!target) return [];
      const key = [node.id, target.id].sort().join("::");
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ from: node, to: target, key }];
    }));
  }, [nodeById, nodes]);

  return (
    <>
      <FirstFrame profile={profile} />
      <color attach="background" args={["#01030a"]} />
      <fog attach="fog" args={["#01030a", selectedNode ? 5.5 : 8, selectedNode ? 30 : 44]} />
      <CameraRig intent={cameraIntent} reducedMotion={profile.reducedMotion} visible={profile.documentVisible} />
      <ambientLight intensity={0.28} />
      <directionalLight position={[-5, 8, 5]} intensity={1.1} color="#dffbff" castShadow={profile.shadows} />
      <pointLight position={[-4, 3, 5]} color="#7df8ff" intensity={1.8} />
      <pointLight position={[5, 1.2, 1]} color="#c887ff" intensity={1.25} />
      <pointLight position={[0, -2, 2]} color="#fff0c2" intensity={0.42} />

      <Stars radius={120} depth={92} count={profile.tier === "high" ? 5200 : profile.tier === "medium" ? 3200 : 1600} factor={4.2} saturation={0.42} fade speed={profile.reducedMotion ? 0 : 0.14} />
      <ParallaxLayer profile={profile} countMultiplier={1.1} radius={9} depth={7} opacity={0.62} size={0.034} seed={1} />
      <ParallaxLayer profile={profile} countMultiplier={1.65} radius={17} depth={19} opacity={0.34} size={0.052} seed={3} />
      <ParallaxLayer profile={profile} countMultiplier={2.1} radius={31} depth={42} opacity={0.2} size={0.075} seed={5} />

      <EmotionalWeather profile={profile} />
      <ContinuityNexus profile={profile} />
      <GoalMonuments />
      <PrivateVaults />
      <ChapterRegions nodes={nodes} selectedId={selectedNode?.id || null} />

      <group rotation={[-0.11, 0.05, -0.02]} position={[0, -0.05, -0.4]} name="life-map-memory-field">
        {edges.map(({ from, to, key }) => (
          <MemoryPath
            key={key}
            from={from}
            to={to}
            active={!selectedNode || related.has(from.id) || related.has(to.id)}
            profile={profile}
          />
        ))}
        {nodes.map((node) => (
          <MemoryArtifact
            key={node.id}
            node={node}
            selected={selectedNode?.id === node.id}
            related={related.has(node.id)}
            overview={!selectedNode}
            profile={profile}
            onSelect={onSelect}
            onEnterFocus={onEnterFocus}
            onEnterReplay={onEnterReplay}
            onOverview={onOverview}
          />
        ))}
      </group>

      <ForegroundDepthCrossings profile={profile} />

      {profile.postprocessing && !profile.reducedMotion ? (
        <EffectComposer>
          <Bloom intensity={0.46} luminanceThreshold={0.24} luminanceSmoothing={0.38} />
          <Vignette eskil={false} offset={0.2} darkness={0.54} />
        </EffectComposer>
      ) : null}
    </>
  );
}

export default function AdaptiveLifeMapScene() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useAdaptiveSpatialQuality();
  const { nodes, loading, error, usingSeedData } = useLifeMapEvents();
  const initial = useRef<PersistedLifeMapState | null>(null);
  if (!initial.current) initial.current = readPersistedState();

  const queryNodeId = safeToken(params.get("node") || params.get("nodeId") || params.get("memoryId"));
  const manifestId = safeToken(params.get("manifestId"), DEFAULT_MANIFEST_ID);
  const [selectedId, setSelectedId] = useState<string | null>(() => queryNodeId || initial.current?.selectedId || null);
  const [cameraIntent, setCameraIntent] = useState<CameraIntent>(() => initial.current?.cameraIntent || OVERVIEW_CAMERA);
  const [narratorText, setNarratorText] = useState("The Life Map is open. Select a star to move inside the memory field.");
  const [webglState, setWebglState] = useState<WebGLState>("starting");
  const mainRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ x: number; y: number; camera: CameraIntent } | null>(null);
  const rendererCleanupRef = useRef<(() => void) | null>(null);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedId) || null, [nodes, selectedId]);
  const stableCanvas = useRef({ antialias: profile.antialias, pixelRatioMax: profile.pixelRatioMax });

  useEffect(() => {
    if (!queryNodeId || !nodes.length) return;
    const node = nodes.find((candidate) => candidate.id === queryNodeId);
    if (!node) return;
    setSelectedId(node.id);
    setCameraIntent(cameraForNode(node));
    setNarratorText(narrationForNode(node).text);
  }, [nodes, queryNodeId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LIFE_MAP_STATE_KEY, JSON.stringify({ selectedId, cameraIntent }));
    } catch {
      // State restoration is best-effort when storage is unavailable.
    }
  }, [cameraIntent, selectedId]);

  const identityHref = useCallback((route: "focus" | "replay", node: LifeMapNode) => {
    const next = new URLSearchParams();
    next.set("memoryId", node.id);
    next.set("manifestId", manifestId);
    next.set("node", node.id);
    next.set("returnNode", node.id);
    next.set("lifeMapOrigin", cameraIntent.position.map((value) => value.toFixed(3)).join(","));
    next.set("from", "life-map-camera");
    return `/${route}?${next.toString()}`;
  }, [cameraIntent.position, manifestId]);

  const selectNode = useCallback((node: LifeMapNode) => {
    setSelectedId(node.id);
    setCameraIntent(cameraForNode(node));
    setNarratorText(narrationForNode(node).text);
    const next = new URLSearchParams();
    next.set("memoryId", node.id);
    next.set("manifestId", manifestId);
    next.set("node", node.id);
    router.replace(`/life-map?${next.toString()}`, { scroll: false });
  }, [manifestId, router]);

  const recenter = useCallback(() => {
    setSelectedId(null);
    setCameraIntent(OVERVIEW_CAMERA);
    setNarratorText("Back to the whole private constellation. Select any star to enter it.");
    router.replace("/life-map", { scroll: false });
  }, [router]);

  const enterFocus = useCallback((node: LifeMapNode) => {
    router.push(identityHref("focus", node));
  }, [identityHref, router]);

  const enterReplay = useCallback((node: LifeMapNode) => {
    router.push(identityHref("replay", node));
  }, [identityHref, router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (selectedId) recenter();
      else router.push("/home");
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recenter, router, selectedId]);

  useEffect(() => {
    const target = mainRef.current;
    if (!target) return;
    const onWheel = (event: WheelEvent) => {
      if (isLifeMapUiTarget(event.target)) return;
      event.preventDefault();
      setCameraIntent((current) => ({
        position: [current.position[0], current.position[1], THREE.MathUtils.clamp(current.position[2] + event.deltaY * 0.005, 4.2, 14.8)],
        target: current.target,
      }));
    };
    target.addEventListener("wheel", onWheel, { passive: false });
    return () => target.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => () => {
    rendererCleanupRef.current?.();
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
  }, []);

  const configureRenderer = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    rendererCleanupRef.current?.();
    const canvas = gl.domElement;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setWebglState("lost");
      setNarratorText("The visual field paused safely. Your map and selected memory are still here.");
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = setTimeout(() => {
        setWebglState("recovering");
        const extension = gl.getContext().getExtension("WEBGL_lose_context") as LoseContextExtension | null;
        extension?.restoreContext?.();
        recoveryTimerRef.current = setTimeout(() => setWebglState((current) => current === "ready" ? current : "failed"), 8000);
      }, 250);
    };
    const onContextRestored = () => {
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
      gl.setPixelRatio(Math.min(window.devicePixelRatio, stableCanvas.current.pixelRatioMax));
      gl.shadowMap.enabled = profile.shadows;
      setWebglState("ready");
    };
    canvas.addEventListener("webglcontextlost", onContextLost, false);
    canvas.addEventListener("webglcontextrestored", onContextRestored, false);
    rendererCleanupRef.current = () => {
      canvas.removeEventListener("webglcontextlost", onContextLost, false);
      canvas.removeEventListener("webglcontextrestored", onContextRestored, false);
    };
    gl.setPixelRatio(Math.min(window.devicePixelRatio, stableCanvas.current.pixelRatioMax));
    gl.shadowMap.enabled = profile.shadows;
    setWebglState("ready");
  }, [profile.shadows]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (isLifeMapUiTarget(event.target)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, camera: cameraIntent };
  }, [cameraIntent]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!dragRef.current || selectedId) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    const base = dragRef.current.camera;
    const shiftX = dx * -0.008;
    const shiftY = dy * 0.005;
    setCameraIntent({
      position: [THREE.MathUtils.clamp(base.position[0] + shiftX, -5.8, 5.8), THREE.MathUtils.clamp(base.position[1] + shiftY, -1.4, 4.2), base.position[2]],
      target: [THREE.MathUtils.clamp(base.target[0] + shiftX * 0.7, -4.8, 4.8), THREE.MathUtils.clamp(base.target[1] + shiftY * 0.45, -1.8, 2.8), base.target[2]],
    });
  }, [selectedId]);

  const onPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Browser may already have released the pointer.
    }
  }, []);

  const semanticRecoveryVisible = webglState === "lost" || webglState === "recovering" || webglState === "failed";

  return (
    <main
      ref={mainRef}
      className="life-map-independent-realm"
      data-testid="urai-true-3d-life-map"
      data-spatial-quality={profile.tier}
      data-spatial-visible={profile.documentVisible ? "true" : "false"}
      data-webgl-state={webglState}
      data-life-map-source={usingSeedData ? "explicit-sample" : "private"}
      data-home-companion-owned="false"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <h1 className="sr-only">Step inside the map.</h1>
      <div
        className="sr-only"
        data-life-map-layer-contract="near middle far"
        data-life-map-memory-contract="authored-media-surfaces"
        data-life-map-companion-contract="home-companion-unmounted"
      >
        Life Map independent memory universe
      </div>

      <div className="life-map-cosmic-wash" aria-hidden="true" />
      <div className="life-map-depth-vignette" aria-hidden="true" />

      <Canvas
        className="life-map-canvas"
        camera={{ position: OVERVIEW_CAMERA.position, fov: 43, near: 0.1, far: 180 }}
        dpr={[1, profile.pixelRatioMax]}
        shadows={profile.shadows}
        frameloop={profile.documentVisible ? "always" : "never"}
        gl={{ antialias: stableCanvas.current.antialias, alpha: false, powerPreference: "high-performance" }}
        onCreated={configureRenderer}
      >
        <LifeMapWorld
          nodes={nodes}
          selectedNode={selectedNode}
          profile={profile}
          cameraIntent={cameraIntent}
          onSelect={selectNode}
          onEnterFocus={enterFocus}
          onEnterReplay={enterReplay}
          onOverview={recenter}
        />
      </Canvas>

      <div className="life-map-realm-mark" aria-hidden="true">
        <span>URAI · LIFE MAP</span>
        <i>{selectedNode ? selectedNode.dateLabel : "PRIVATE CONSTELLATION"}</i>
      </div>

      {usingSeedData ? (
        <div className="life-map-sample-boundary" role="status">
          Sample constellation · not your memories
        </div>
      ) : null}

      {semanticRecoveryVisible ? (
        <section className="life-map-recovery" role="status" aria-live="assertive">
          <p>Life Map protected mode</p>
          <h2>{webglState === "failed" ? "The visual field could not restart." : "Restoring the visual field…"}</h2>
          <span>Your selected memory and camera context remain preserved.</span>
          <div>
            {nodes.map((node) => (
              <button key={node.id} type="button" onClick={() => selectNode(node)}>
                {node.title}
              </button>
            ))}
            <button type="button" onClick={() => router.push("/home")}>Return Home</button>
          </div>
        </section>
      ) : null}

      <section className="life-map-whisper" data-life-map-whisper="true" aria-live="polite" aria-atomic="true">
        <p>{selectedNode ? selectedNode.title : loading ? "Opening the constellation" : error ? usingSeedData ? "Protected sample field" : "Private constellation unavailable" : "Private constellation"}</p>
        <span>{narratorText}</span>
      </section>

      <details
        className="life-map-accessibility-menu"
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <summary>Map controls</summary>
        <div>
          <p>Explore memories without the visual field.</p>
          {nodes.map((node) => (
            <button key={node.id} type="button" onClick={() => selectNode(node)}>
              {node.title}: {node.summary}
            </button>
          ))}
          {selectedNode ? (
            <>
              <button type="button" onClick={() => router.push(identityHref("focus", selectedNode))}>Enter Focus</button>
              <button type="button" onClick={() => router.push(identityHref("replay", selectedNode))} disabled={!selectedNode.replayAvailable || selectedNode.locked}>Replay</button>
              <button type="button" onClick={recenter}>Overview</button>
            </>
          ) : null}
          <button type="button" onClick={() => router.push("/ground")}>Ground</button>
          <button type="button" onClick={() => router.push("/home")}>Home</button>
        </div>
      </details>
    </main>
  );
}

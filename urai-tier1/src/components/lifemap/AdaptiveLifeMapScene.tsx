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

const OVERVIEW_CAMERA: CameraIntent = {
  position: [0.72, 2.18, 9.65],
  target: [0.05, 0.06, -1.25],
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
  return {
    position: [node.position[0] + 0.82, node.position[1] + 0.7, node.position[2] + 3.05],
    target: [node.position[0], node.position[1] + 0.04, node.position[2]],
  };
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

function CameraRig({
  intent,
  reducedMotion,
  visible,
}: {
  intent: CameraIntent;
  reducedMotion: boolean;
  visible: boolean;
}) {
  const { camera } = useThree();
  const desired = useMemo(() => new THREE.Vector3(...intent.position), [intent.position]);
  const target = useMemo(() => new THREE.Vector3(...intent.target), [intent.target]);

  useFrame(() => {
    if (!visible) return;
    camera.position.lerp(desired, reducedMotion ? 1 : 0.095);
    camera.lookAt(target);
  });

  return null;
}

function AdaptiveGalaxy({ profile }: { profile: SpatialQualityProfile }) {
  const group = useRef<THREE.Group>(null);
  const count = Math.max(360, profile.particleCount * 3);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      const arm = index % 5;
      const progress = index / count;
      const radius = 0.55 + Math.sqrt(progress) * 7.6;
      const angle = progress * 13.8 + arm * ((Math.PI * 2) / 5);
      const jitter = Math.sin(index * 12.9898) * 0.18;
      positions[index * 3] = Math.cos(angle) * radius + jitter;
      positions[index * 3 + 1] = Math.sin(index * 0.43) * 0.6 + (arm - 2) * 0.025;
      positions[index * 3 + 2] = Math.sin(angle) * radius * 0.62 - 2.15 + Math.cos(index * 0.31) * 0.25;
      color.setHSL(0.52 + arm * 0.025, 0.88, 0.68 + Math.sin(index) * 0.1);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    next.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return next;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (!group.current || profile.reducedMotion || !profile.documentVisible) return;
    group.current.rotation.y = -0.12 + Math.sin(clock.elapsedTime * 0.08) * 0.055;
    group.current.rotation.z = -0.08 + Math.cos(clock.elapsedTime * 0.06) * 0.025;
  });

  return (
    <group ref={group} rotation={[-0.18, -0.12, -0.06]} position={[0.1, -0.15, -1.25]}>
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial size={0.038} vertexColors transparent opacity={0.54} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function LifeCore({ profile }: { profile: SpatialQualityProfile }) {
  const core = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!core.current || profile.reducedMotion || !profile.documentVisible) return;
    core.current.rotation.z = clock.elapsedTime * 0.055;
    core.current.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.12;
  });

  return (
    <group ref={core} position={[0, 0.15, -1.25]} data-testid="urai-life-core">
      <mesh>
        <icosahedronGeometry args={[0.46, profile.tier === "high" ? 4 : 2]} />
        <meshStandardMaterial color="#f6ffff" emissive="#78ecff" emissiveIntensity={2.3} roughness={0.18} metalness={0.24} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.82, 0.026, 12, 96]} />
        <meshBasicMaterial color="#9bf7ff" transparent opacity={0.54} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2.6, 0.6, 0.25]}>
        <torusGeometry args={[1.12, 0.014, 10, 96]} />
        <meshBasicMaterial color="#d7a8ff" transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function EraRegions({ nodes }: { nodes: LifeMapNode[] }) {
  const regions = useMemo(() => {
    const grouped = new Map<string, LifeMapNode[]>();
    nodes.forEach((node) => {
      const key = node.eraId || node.clusterId || "present";
      grouped.set(key, [...(grouped.get(key) || []), node]);
    });
    return [...grouped.entries()].map(([id, members]) => {
      const center = members.reduce<[number, number, number]>((sum, node) => [
        sum[0] + node.position[0],
        sum[1] + node.position[1],
        sum[2] + node.position[2],
      ], [0, 0, 0]).map((value) => value / members.length) as [number, number, number];
      return { id, center, radius: 0.95 + members.length * 0.22, aura: members[0]?.aura || "#8adfff" };
    });
  }, [nodes]);

  return (
    <group data-testid="urai-era-regions">
      {regions.map((region, index) => (
        <mesh key={region.id} position={region.center} rotation={[Math.PI / 2 + index * 0.08, index * 0.18, 0]}>
          <torusGeometry args={[region.radius, 0.012, 8, 80]} />
          <meshBasicMaterial color={region.aura} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

function Connections({ nodes, selectedId }: { nodes: LifeMapNode[]; selectedId: string | null }) {
  const geometry = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const positions: number[] = [];
    nodes.forEach((node) => {
      node.connectedTo.forEach((targetId) => {
        const target = byId.get(targetId);
        if (!target || node.id > target.id) return;
        positions.push(...node.position, ...target.position);
      });
    });
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return next;
  }, [nodes]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color={selectedId ? "#8ff6ff" : "#547397"} transparent opacity={selectedId ? 0.34 : 0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
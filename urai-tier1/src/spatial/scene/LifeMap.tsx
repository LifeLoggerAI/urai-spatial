"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { Group, Mesh, MeshBasicMaterial } from "three";

import { URAI_SEED_MEMORIES } from "@/spatial/data/uraiSeedMemories";
import type { ScenePhase, StarPoint } from "./sceneState";

type Props = {
  phase: ScenePhase;
  progress: number;
  opacity: number;
  selectedStar: StarPoint | null;
  onSelectStar: (star: StarPoint) => void;
};

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function mapRange(n: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  const t = (n - inMin) / (inMax - inMin);
  return outMin + (outMax - outMin) * t;
}

function easeInOut(t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}

function makeStar(id: number, band: StarPoint["band"]): StarPoint {
  const a = hash(id + 1);
  const b = hash(id + 2);
  const c = hash(id + 3);
  const s = hash(id + 4);

  let z = -60;
  let radius = 0.04;
  let alpha = 0.16;
  let clickable = false;
  const importance = mapRange(s, 0, 1, 0.2, 1);

  if (band === "foreground") {
    z = mapRange(c, 0, 1, -28, -52);
    radius = mapRange(s, 0, 1, 0.055, 0.11);
    alpha = mapRange(b, 0, 1, 0.1, 0.22);
    clickable = s > 0.58;
  } else if (band === "mid") {
    z = mapRange(c, 0, 1, -50, -95);
    radius = mapRange(s, 0, 1, 0.03, 0.075);
    alpha = mapRange(b, 0, 1, 0.14, 0.34);
    clickable = s > 0.22;
  } else {
    z = mapRange(c, 0, 1, -90, -165);
    radius = mapRange(s, 0, 1, 0.008, 0.028);
    alpha = mapRange(b, 0, 1, 0.05, 0.16);
  }

  const spreadX = mapRange(Math.abs(z), 28, 165, 9, 28);
  const spreadY = mapRange(Math.abs(z), 28, 165, 5, 18);

  return {
    id: `sky-star-${band}-${id}`,
    position: [
      mapRange(a, 0, 1, -spreadX, spreadX),
      mapRange(b, 0, 1, -spreadY * 0.72, spreadY) + 9,
      z,
    ],
    importance,
    band,
    radius,
    alpha,
    clickable,
  };
}

export function useStarData() {
  return useMemo<StarPoint[]>(() => {
    const memoryStars = URAI_SEED_MEMORIES.map((memory): StarPoint => ({
      id: memory.id,
      position: memory.position,
      importance: memory.focusPresence,
      band: "foreground",
      radius: Math.max(0.065, memory.scale * 0.075),
      alpha: memory.auraIntensity,
      clickable: true,
    }));

    const ambientStars = [
      ...Array.from({ length: 34 }, (_, i) => makeStar(i, "foreground")),
      ...Array.from({ length: 90 }, (_, i) => makeStar(i + 200, "mid")),
      ...Array.from({ length: 160 }, (_, i) => makeStar(i + 500, "background")),
    ];

    return [...memoryStars, ...ambientStars];
  }, []);
}

function setOpacity(mesh: Mesh | null, opacity: number) {
  if (!mesh) return;

  const material = mesh.material as MeshBasicMaterial | MeshBasicMaterial[];

  if (Array.isArray(material)) {
    material.forEach((m) => {
      m.opacity = opacity;
    });
  } else {
    material.opacity = opacity;
  }
}

function LifeMapCamera({ phase, progress, selectedStar }: Pick<Props, "phase" | "progress" | "selectedStar">) {
  const { camera } = useThree();
  const desiredPosition = useRef(new Vector3(0, 6, 24));
  const desiredLookAt = useRef(new Vector3(0, 7, -70));
  const currentLookAt = useRef(new Vector3(0, 7, -70));

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const p = easeInOut(progress);
    const replayDrift = phase === "REPLAY" ? Math.sin(t * 0.42) * 1.2 : 0;
    const focusActive = !!selectedStar && ["focus_lock", "focus_travel", "focus_arrive", "REPLAY"].includes(phase);

    if (focusActive && selectedStar) {
      const [x, y, z] = selectedStar.position;
      const arrival = phase === "focus_arrive" || phase === "REPLAY" ? 1 : p;
      const distance = phase === "REPLAY" ? 13.5 : 16.5;

      desiredPosition.current.set(x * 0.64 + replayDrift, y * 0.58 + 1.8 + replayDrift * 0.35, z + distance);
      desiredLookAt.current.set(x, y, z);

      if (phase === "focus_travel") {
        desiredPosition.current.lerp(new Vector3(x * 0.52, y * 0.52 + 2.2, z + 20), 1 - arrival);
      }
    } else if (phase === "enter_ascent") {
      desiredPosition.current.set(0, 4 + p * 5, 28 - p * 8);
      desiredLookAt.current.set(0, 8 + p * 2, -62);
    } else if (phase === "enter_separation") {
      desiredPosition.current.set(0, 8, 20 - p * 4);
      desiredLookAt.current.set(0, 8, -78);
    } else if (phase === "return_home_descent" || phase === "return_home_settle") {
      desiredPosition.current.set(0, 6, 26 + p * 8);
      desiredLookAt.current.set(0, 7, -56);
    } else {
      desiredPosition.current.set(0, 7.2, 22);
      desiredLookAt.current.set(0, 8, -76);
    }

    const smoothing = Math.min(1, delta * (phase === "REPLAY" ? 2.4 : 3.8));
    camera.position.lerp(desiredPosition.current, smoothing);
    currentLookAt.current.lerp(desiredLookAt.current, smoothing);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}

function StarMesh({
  star,
  sceneOpacity,
  dimmed,
  selected,
  interactive,
  onSelectStar,
}: {
  star: StarPoint;
  sceneOpacity: number;
  dimmed: boolean;
  selected: boolean;
  interactive: boolean;
  onSelectStar: (star: StarPoint) => void;
}) {
  const group = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * (0.25 + star.importance * 0.15) + star.importance * 10) * 0.03;
    const dim = dimmed ? 0.46 : 1;
    const sel = selected ? 1.18 : 1;

    group.current?.scale.setScalar(pulse * sel);

    setOpacity(core.current, star.alpha * sceneOpacity * dim * (selected ? 1.12 : 1));
    setOpacity(halo.current, star.alpha * 0.25 * sceneOpacity * dim * (selected ? 1.25 : 1));
    halo.current?.scale.setScalar(selected ? 3.4 : 2.2);
  });

  return (
    <group
      ref={group}
      position={star.position}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (interactive && star.clickable) onSelectStar(star);
      }}
    >
      <mesh ref={halo}>
        <sphereGeometry args={[star.radius * 2.2, 12, 12]} />
        <meshBasicMaterial color={selected ? "#c9ddff" : "#8faeff"} transparent depthWrite={false} />
      </mesh>

      <mesh ref={core}>
        <sphereGeometry args={[star.radius, 14, 14]} />
        <meshBasicMaterial color={selected ? "#eef5ff" : "#dce7ff"} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function LifeMap({ phase, progress, opacity, selectedStar, onSelectStar }: Props) {
  const stars = useStarData();

  const sceneOpacity = (() => {
    const eased = easeInOut(progress);

    if (phase === "enter_ascent") return 0.02 + 0.42 * eased;
    if (phase === "enter_separation") return 0.44 + 0.36 * eased;
    if (phase === "enter_arrival") return 0.8 + 0.2 * eased;
    if (phase === "return_home_descent") return Math.max(0.12, 1 - progress * 0.78);
    if (phase === "return_home_settle") return 0.12 * (1 - progress);

    return opacity;
  })();

  const interactive = phase === "LIFEMAP";

  return (
    <group visible={sceneOpacity > 0.001}>
      <LifeMapCamera phase={phase} progress={progress} selectedStar={selectedStar} />
      {stars.map((star) => {
        const dimmed =
          !!selectedStar &&
          selectedStar.id !== star.id &&
          ["focus_lock", "focus_travel", "focus_arrive", "REPLAY"].includes(phase);

        return (
          <StarMesh
            key={star.id}
            star={star}
            sceneOpacity={sceneOpacity}
            dimmed={dimmed}
            selected={selectedStar?.id === star.id}
            interactive={interactive}
            onSelectStar={onSelectStar}
          />
        );
      })}
    </group>
  );
}

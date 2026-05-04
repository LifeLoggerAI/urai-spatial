"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
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
  const x = mapRange(a, 0, 1, -spreadX, spreadX);
  const y = mapRange(b, 0, 1, -spreadY * 0.72, spreadY);

  return {
    id: `sky-star-${band}-${id}`,
    position: [x, y + 9.0, z],
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
      ...Array.from({ length: 34 }, (_, index) => makeStar(index, "foreground")),
      ...Array.from({ length: 90 }, (_, index) => makeStar(index + 200, "mid")),
      ...Array.from({ length: 160 }, (_, index) => makeStar(index + 500, "background")),
    ];

    return [...memoryStars, ...ambientStars];
  }, []);
}

function setOpacity(mesh: Mesh | null, opacity: number) {
  if (!mesh) return;
  const material = mesh.material as MeshBasicMaterial | MeshBasicMaterial[];
  if (Array.isArray(material)) {
    material.forEach((item) => {
      item.opacity = opacity;
    });
    return;
  }
  material.opacity = opacity;
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
  const localStart = useRef(Date.now());

  useFrame(() => {
    const t = (Date.now() - localStart.current) / 1000;
    const pulse = 1 + Math.sin(t * (0.25 + star.importance * 0.15) + star.importance * 10) * 0.03;
    const dim = dimmed ? 0.46 : 1;
    const sel = selected ? 1.18 : 1;
    const haloScale = selected ? 3.4 : 2.2;

    group.current?.scale.setScalar(pulse * sel);
    setOpacity(core.current, star.alpha * sceneOpacity * dim * (selected ? 1.12 : 1));
    setOpacity(halo.current, star.alpha * 0.25 * sceneOpacity * dim * (selected ? 1.25 : 1));
    halo.current?.scale.setScalar(haloScale);
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
        <meshBasicMaterial
          color={selected ? "#c9ddff" : "#8faeff"}
          transparent
          opacity={star.alpha * 0.25 * sceneOpacity}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={core}>
        <sphereGeometry args={[star.radius, 14, 14]} />
        <meshBasicMaterial
          color={selected ? "#eef5ff" : "#dce7ff"}
          transparent
          opacity={star.alpha * sceneOpacity}
          depthWrite={false}
        />
      </mesh>
      {interactive && star.clickable ? (
        <mesh visible={false}>
          <sphereGeometry args={[Math.max(star.radius * 1.8, 0.12), 10, 10]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      ) : null}
    </group>
  );
}

export default function LifeMap({ phase, progress, opacity, selectedStar, onSelectStar }: Props) {
  const stars = useStarData();

  const sceneOpacity = (() => {
    if (phase === "enter_ascent") {
      const t = Math.max(0, Math.min(1, progress));
      const eased = t * t * (3 - 2 * t);
      return 0.02 + 0.42 * eased;
    }

    if (phase === "enter_separation") {
      const t = Math.max(0, Math.min(1, progress));
      const eased = t * t * (3 - 2 * t);
      return 0.44 + 0.36 * eased;
    }

    if (phase === "enter_arrival") {
      const t = Math.max(0, Math.min(1, progress));
      const eased = t * t * (3 - 2 * t);
      return 0.8 + 0.2 * eased;
    }

    if (phase === "return_home_descent") return Math.max(0.12, 1 - progress * 0.78);
    if (phase === "return_home_settle") return 0.12 * (1 - progress);
    return opacity;
  })();

  const continuityProgress =
    phase === "enter_ascent" || phase === "enter_separation" || phase === "enter_arrival"
      ? Math.max(0, Math.min(1, progress))
      : 1;

  const continuityEase = continuityProgress * continuityProgress * (3 - 2 * continuityProgress);

  const lifeMapContinuityY =
    phase === "enter_ascent" ? 3.8 * (1 - continuityEase) : phase === "enter_separation" ? 1.35 * (1 - continuityEase) : 0;

  const lifeMapContinuityZ =
    phase === "enter_ascent" ? -10.5 * (1 - continuityEase) : phase === "enter_separation" ? -3.2 * (1 - continuityEase) : 0;

  const lifeMapContinuityScale =
    phase === "enter_ascent" ? 0.86 + 0.14 * continuityEase : phase === "enter_separation" ? 0.96 + 0.04 * continuityEase : 1;

  const interactive = phase === "LIFEMAP";

  return (
    <group visible={sceneOpacity > 0.001} position={[0, lifeMapContinuityY, lifeMapContinuityZ]} scale={lifeMapContinuityScale}>
      {stars.map((star) => {
        const dimmed =
          !!selectedStar &&
          selectedStar.id !== star.id &&
          ["focus_lock", "focus_travel", "focus_arrive", "REPLAY", "return_from_replay", "return_to_lifemap"].includes(phase);

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

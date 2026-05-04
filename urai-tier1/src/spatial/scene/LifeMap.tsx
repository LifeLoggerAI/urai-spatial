"use client";

import { useMemo, useRef, useEffect } from "react";
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

const GLOBAL_START = typeof window !== "undefined" ? performance.now() : 0;

function getTime() {
  return (performance.now() - GLOBAL_START) / 1000;
}

/* ------------------ DETERMINISTIC STAR GEN ------------------ */

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

/* ------------------ UTIL ------------------ */

function setOpacity(mesh: Mesh | null, opacity: number) {
  if (!mesh) return;

  const material = mesh.material as MeshBasicMaterial | MeshBasicMaterial[];

  if (Array.isArray(material)) {
    material.forEach((m) => (m.opacity = opacity));
  } else {
    material.opacity = opacity;
  }
}

/* ------------------ NARRATOR + TIMELINE ------------------ */

function emitNarrator(event: string, detail?: any) {
  window.dispatchEvent(new CustomEvent("urai:narrator", { detail: { event, ...detail } }));
}

function emitTimeline(event: string, detail?: any) {
  window.dispatchEvent(new CustomEvent("urai:timeline", { detail: { event, ...detail } }));
}

/* ------------------ STAR ------------------ */

function StarMesh({
  star,
  sceneOpacity,
  dimmed,
  selected,
  interactive,
  onSelectStar,
}: any) {
  const group = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);

  useFrame(() => {
    const t = getTime();

    const pulse =
      1 +
      Math.sin(t * (0.25 + star.importance * 0.15) + star.importance * 10) * 0.03;

    const dim = dimmed ? 0.4 : 1;
    const sel = selected ? 1.25 : 1;

    group.current?.scale.setScalar(pulse * sel);

    setOpacity(core.current, star.alpha * sceneOpacity * dim);
    setOpacity(halo.current, star.alpha * 0.25 * sceneOpacity * dim);

    halo.current?.scale.setScalar(selected ? 3.6 : 2.2);
  });

  return (
    <group
      ref={group}
      position={star.position}
      onPointerDown={(e) => {
        e.stopPropagation();

        if (interactive && star.clickable) {
          emitNarrator("star.selected", { id: star.id });
          emitTimeline("star_focus", { id: star.id });

          onSelectStar(star);
        }
      }}
    >
      <mesh ref={halo}>
        <sphereGeometry args={[star.radius * 2.2, 12, 12]} />
        <meshBasicMaterial color={selected ? "#c9ddff" : "#8faeff"} transparent />
      </mesh>

      <mesh ref={core}>
        <sphereGeometry args={[star.radius, 14, 14]} />
        <meshBasicMaterial color={selected ? "#eef5ff" : "#dce7ff"} transparent />
      </mesh>
    </group>
  );
}

/* ------------------ MAIN ------------------ */

export default function LifeMap({
  phase,
  progress,
  opacity,
  selectedStar,
  onSelectStar,
}: Props) {
  const stars = useStarData();

  /* --------- PHASE-DRIVEN OPACITY (SYNCED) --------- */

  const sceneOpacity = (() => {
    const t = Math.min(1, Math.max(0, progress));
    const eased = t * t * (3 - 2 * t);

    switch (phase) {
      case "enter_ascent":
        return 0.02 + 0.42 * eased;

      case "enter_separation":
        return 0.44 + 0.36 * eased;

      case "enter_arrival":
        return 0.8 + 0.2 * eased;

      case "return_home_descent":
        return Math.max(0.12, 1 - progress * 0.78);

      case "return_home_settle":
        return 0.12 * (1 - progress);

      default:
        return opacity;
    }
  })();

  const interactive = phase === "LIFEMAP";

  /* --------- PHASE HOOKS --------- */

  useEffect(() => {
    emitTimeline("lifemap_phase", { phase, progress });

    if (phase === "enter_arrival") {
      emitNarrator("lifemap.arrival");
    }

    if (phase === "focus_lock") {
      emitNarrator("focus.lock");
    }

    if (phase === "REPLAY") {
      emitNarrator("replay.start");
    }
  }, [phase]);

  return (
    <group visible={sceneOpacity > 0.001}>
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
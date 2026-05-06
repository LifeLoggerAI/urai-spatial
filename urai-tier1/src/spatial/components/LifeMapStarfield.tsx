"use client";

import { useMemo } from "react";
import * as THREE from "three";

export type LifeMapStar = {
  id: string;
  title?: string;
  tone?: string;
  symbolicWeight?: string;
  position?: [number, number, number];
};

export const LIFE_MAP_STARS: LifeMapStar[] = [
  { id: "center-memory", title: "Center Memory", tone: "awe", symbolicWeight: "threshold", position: [0, 18, -220] },
  { id: "left-memory", title: "Left Memory", tone: "hope", symbolicWeight: "heavy", position: [-30, 18, -220] },
  { id: "right-memory", title: "Right Memory", tone: "recovery", symbolicWeight: "heavy", position: [30, 18, -220] },
  { id: "low-left-memory", title: "Low Left Memory", tone: "calm", symbolicWeight: "medium", position: [-20, 8, -220] },
  { id: "low-right-memory", title: "Low Right Memory", tone: "charged", symbolicWeight: "medium", position: [20, 8, -220] },
  { id: "upper-left-memory", title: "Upper Left Memory", tone: "grief", symbolicWeight: "medium", position: [-42, 30, -220] },
  { id: "upper-right-memory", title: "Upper Right Memory", tone: "tension", symbolicWeight: "medium", position: [42, 30, -220] },
  { id: "far-left-thread", title: "Far Left Thread", tone: "calm", symbolicWeight: "light", position: [-72, 34, -310] },
  { id: "far-right-thread", title: "Far Right Thread", tone: "hope", symbolicWeight: "light", position: [72, 35, -315] },
  { id: "deep-thread", title: "Deep Thread", tone: "awe", symbolicWeight: "medium", position: [0, 54, -370] },
];

type Props = {
  active?: boolean;
  phase?: string;
  selectedStarId?: string | null;
  ascentProgress?: number;
  onSelectStar?: (star: LifeMapStar) => void;
  onStarSelect?: (star: LifeMapStar) => void;
};

type LifeMapNarratorEvent = {
  event: "lifemap.star.focus" | "lifemap.star.select";
  source: "pointer" | "click";
  phase: string;
  starId: string;
  title: string | null;
  tone: string | null;
  symbolicWeight: string | null;
  selected: boolean;
  position: [number, number, number];
  context: {
    surface: "lifemap";
    target: "star";
    visibleMode: "lifemap" | "focus" | "replay";
    depth: number;
    horizontalOffset: number;
    verticalOffset: number;
  };
  timestamp: number;
};

const COLORS: Record<string, string> = {
  neutral: "#ffffff",
  calm: "#93c5fd",
  charged: "#fb7185",
  grief: "#b79bff",
  hope: "#fde68a",
  tension: "#fb923c",
  awe: "#67e8f9",
  recovery: "#86efac",
};

function emitLifeMapNarratorEvent(detail: Omit<LifeMapNarratorEvent, "timestamp">) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<LifeMapNarratorEvent>("urai:narrator", {
      detail: {
        ...detail,
        timestamp: Date.now(),
      },
    }),
  );
}

function makeDust(seedStart: number, count: number) {
  const out: Array<{
    id: string;
    position: [number, number, number];
    size: number;
    opacity: number;
    color: string;
  }> = [];

  let seed = seedStart;

  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < count; i++) {
    out.push({
      id: "dust-" + seedStart + "-" + i,
      position: [-190 + rand() * 380, rand() * 110, -130 - rand() * 920],
      size: 0.045 + rand() * 0.1,
      opacity: 0.16 + rand() * 0.4,
      color: rand() > 0.72 ? "#d5e5ff" : "#ffffff",
    });
  }

  return out;
}

function starScale(weight?: string) {
  if (weight === "threshold") return 1.22;
  if (weight === "heavy") return 1.1;
  if (weight === "medium") return 1;
  return 0.82;
}

function visibleModeForPhase(phase: string): "lifemap" | "focus" | "replay" {
  if (phase === "REPLAY") return "replay";
  if (phase === "FOCUS") return "focus";
  return "lifemap";
}

export function LifeMapStarfield({
  active = true,
  phase = "HIDDEN",
  selectedStarId = null,
  onSelectStar,
  onStarSelect,
}: Props) {
  const phaseName = String(phase);
  const isAscent = phaseName === "ASCENT";
  const isLifeMap = phaseName === "LIFEMAP";
  const isFocusOrReplay = phaseName === "FOCUS" || phaseName === "REPLAY";
  const dust = useMemo(() => makeDust(991, 950), []);
  const visibleDust = isAscent ? dust.slice(0, 340) : dust;

  const clickStar = (star: LifeMapStar, event: { stopPropagation?: () => void }, source: "pointer" | "click") => {
    event.stopPropagation?.();
    console.info("[URAI_STAR_CLICK]", star.id);
    onSelectStar?.(star);
    onStarSelect?.(star);

    const p = star.position ?? [0, 18, -220];
    const selected = selectedStarId === star.id;

    emitLifeMapNarratorEvent({
      event: source === "pointer" ? "lifemap.star.focus" : "lifemap.star.select",
      source,
      phase: phaseName,
      starId: star.id,
      title: star.title ?? null,
      tone: star.tone ?? null,
      symbolicWeight: star.symbolicWeight ?? null,
      selected,
      position: p,
      context: {
        surface: "lifemap",
        target: "star",
        visibleMode: visibleModeForPhase(phaseName),
        depth: Math.abs(p[2]),
        horizontalOffset: p[0],
        verticalOffset: p[1],
      },
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("urai:lifemap-star-click", {
          detail: { id: star.id, star, phase: phaseName, selected },
        }),
      );
    }
  };

  if (active === false) return null;
  if (!isAscent && !isLifeMap && !isFocusOrReplay) return null;

  return (
    <group>
      <fog attach="fog" args={["#020617", isAscent ? 110 : 125, 920]} />

      {visibleDust.map((star) => (
        <mesh key={star.id} position={star.position} scale={star.size}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial
            color={star.color}
            transparent
            opacity={star.opacity * (isFocusOrReplay ? 0.18 : 1)}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      {isLifeMap && (
        <group>
          {LIFE_MAP_STARS.map((star) => {
            const color = COLORS[star.tone ?? "neutral"] ?? "#ffffff";
            const selected = selectedStarId === star.id;
            const p = star.position ?? [0, 18, -220];
            const scale = starScale(star.symbolicWeight);

            return (
              <group
                key={star.id}
                position={p}
                scale={scale}
                userData={{ starId: star.id, tone: star.tone, symbolicWeight: star.symbolicWeight }}
                onPointerDown={(event: any) => clickStar(star, event, "pointer")}
                onClick={(event: any) => clickStar(star, event, "click")}
              >
                <mesh renderOrder={40}>
                  <sphereGeometry args={[3.4, 48, 48]} />
                  <meshBasicMaterial color={color} transparent opacity={1} toneMapped={false} />
                </mesh>

                <mesh scale={2.0} renderOrder={39}>
                  <sphereGeometry args={[3.4, 48, 48]} />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={selected ? 0.34 : 0.2}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

export default LifeMapStarfield;

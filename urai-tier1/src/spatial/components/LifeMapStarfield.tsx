"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { createMemoryJourney } from "../world/memoryJourneyController";
import { createConstellation, createRelationshipDrivenStar } from "../lifemap/relationshipStarFactory";
import type { MemoryStarRelationship } from "../lifemap/memoryStarRelationships";

export type LifeMapStar = {
  id: string;
  title?: string;
  tone?: string;
  symbolicWeight?: string;
  position?: [number, number, number];
  relationship?: MemoryStarRelationship;
  links?: string[];
};

const LIFE_MAP_RELATIONSHIPS: Array<MemoryStarRelationship & { title: string; tone: string; symbolicWeight: string }> = [
  {
    id: "seed-threshold-storm",
    title: "Chapter of Becoming",
    tone: "awe",
    symbolicWeight: "threshold",
    period: "Becoming",
    themes: ["threshold", "purpose", "identity"],
    connectedStars: ["seed-first-light", "seed-recovery-arc", "seed-quiet-reset"],
    emotionalWeight: 0.95,
    distance: 0.18,
  },
  {
    id: "seed-memory-bloom",
    title: "Memory Bloom",
    tone: "calm",
    symbolicWeight: "medium",
    period: "Origin",
    themes: ["identity", "image-form", "archive"],
    connectedStars: ["seed-consent-key", "seed-mirror-thread"],
    emotionalWeight: 0.72,
    distance: 0.38,
  },
  {
    id: "seed-recovery-arc",
    title: "Recovery Arc",
    tone: "recovery",
    symbolicWeight: "heavy",
    period: "Recovery",
    themes: ["body", "steadiness", "care"],
    connectedStars: ["seed-quiet-reset", "seed-threshold-storm", "seed-weather-front"],
    emotionalWeight: 0.82,
    distance: 0.31,
  },
  {
    id: "seed-quiet-reset",
    title: "Quiet Reset",
    tone: "hope",
    symbolicWeight: "heavy",
    period: "Recovery",
    themes: ["focus", "breath", "return"],
    connectedStars: ["seed-night-window", "seed-recovery-arc", "seed-threshold-storm"],
    emotionalWeight: 0.88,
    distance: 0.24,
  },
  {
    id: "seed-night-window",
    title: "Night Window",
    tone: "awe",
    symbolicWeight: "medium",
    period: "Memory Film",
    themes: ["replay", "wonder", "threshold"],
    connectedStars: ["seed-quiet-reset", "seed-legacy-lantern"],
    emotionalWeight: 0.7,
    distance: 0.58,
  },
  {
    id: "seed-consent-key",
    title: "Consent Key",
    tone: "charged",
    symbolicWeight: "medium",
    period: "Ownership",
    themes: ["privacy", "consent", "passport"],
    connectedStars: ["seed-memory-bloom", "seed-legacy-lantern"],
    emotionalWeight: 0.68,
    distance: 0.62,
  },
  {
    id: "seed-first-light",
    title: "First Light",
    tone: "hope",
    symbolicWeight: "light",
    period: "Origin",
    themes: ["home", "arrival", "threshold"],
    connectedStars: ["seed-threshold-storm"],
    emotionalWeight: 0.64,
    distance: 0.48,
  },
];

export const LIFE_MAP_STARS: LifeMapStar[] = LIFE_MAP_RELATIONSHIPS.map((relationship, index) => {
  const angle = (index / LIFE_MAP_RELATIONSHIPS.length) * Math.PI * 2;
  const radius = 34 + relationship.distance * 66;
  const position: [number, number, number] = [
    Math.cos(angle) * radius,
    18 + (index % 4) * 8 + relationship.emotionalWeight * 10,
    -190 - relationship.distance * 220,
  ];
  const rendered = createRelationshipDrivenStar(relationship, position);

  return {
    id: relationship.id,
    title: relationship.title,
    tone: relationship.tone,
    symbolicWeight: relationship.symbolicWeight,
    position: rendered.position,
    relationship,
    links: relationship.connectedStars,
  };
});

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

function positionsForEdge(starsById: Map<string, LifeMapStar>, from: string, to: string) {
  const start = starsById.get(from)?.position;
  const end = starsById.get(to)?.position;
  if (!start || !end) return null;
  return new Float32Array([...start, ...end]);
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
  const starsById = useMemo(() => new Map(LIFE_MAP_STARS.map((star) => [star.id, star])), []);
  const constellationEdges = useMemo(() => {
    const rendered = LIFE_MAP_STARS.map((star) => createRelationshipDrivenStar(
      star.relationship ?? {
        id: star.id,
        period: star.title ?? star.id,
        themes: [star.tone ?? "memory"],
        connectedStars: star.links ?? [],
        emotionalWeight: 0.5,
        distance: 0.5,
      },
      star.position ?? [0, 18, -220],
    ));
    return createConstellation(rendered);
  }, []);

  const clickStar = (star: LifeMapStar, event: { stopPropagation?: () => void }, source: "pointer" | "click") => {
    event.stopPropagation?.();
    console.info("[URAI_STAR_CLICK]", star.id);
    onSelectStar?.(star);
    onStarSelect?.(star);

    const p = star.position ?? [0, 18, -220];
    const selected = selectedStarId === star.id;
    const journey = star.relationship ? createMemoryJourney(star.relationship) : null;

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
          detail: { id: star.id, star, journey, phase: phaseName, selected },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("urai:memory-journey", {
          detail: { id: star.id, journey, camera: journey?.camera ?? null },
        }),
      );
    }
  };

  if (active === false) return null;
  if (!isAscent && !isLifeMap && !isFocusOrReplay) return null;

  return (
    <group userData={{ contract: "urai-memory-star-relationships-v1", source: "relationshipStarFactory" }}>
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
          {constellationEdges.map((edge) => {
            const positions = positionsForEdge(starsById, edge.from, edge.to);
            if (!positions) return null;
            return (
              <line key={`${edge.from}-${edge.to}`} renderOrder={20}>
                <bufferGeometry>
                  <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                </bufferGeometry>
                <lineBasicMaterial color="#7dd3fc" transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
              </line>
            );
          })}

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
                userData={{
                  starId: star.id,
                  tone: star.tone,
                  symbolicWeight: star.symbolicWeight,
                  relationshipThemes: star.relationship?.themes ?? [],
                }}
                onPointerDown={(event: any) => clickStar(star, event, "pointer")}
                onClick={(event: any) => clickStar(star, event, "click")}
              >
                <mesh renderOrder={40}>
                  <sphereGeometry args={[3.4, 48, 48]} />
                  <meshBasicMaterial color={color} transparent opacity={1} toneMapped={false} />
                </mesh>

                <mesh scale={selected ? 2.5 : 2.0} renderOrder={39}>
                  <sphereGeometry args={[3.4, 48, 48]} />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={selected ? 0.42 : 0.25}
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

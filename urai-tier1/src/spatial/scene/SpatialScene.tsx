"use client";




// URAI_PASS5_PATTERN_INTELLIGENCE_LAW
// Tier-5 foundation: detect memory patterns, related memories, dominant narrative arc,
// and next suggested focus without touching Tier-1 state or Tier-2 camera laws.
// URAI_PASS4_NARRATOR_MEANING_LAW
// Tier-4 rule: narrator must respond to memory weight, tone, replay stillness,
// symbolic phase, and selected memory. Meaning layer should explain why this
// memory is being shown without breaking cinematic immersion.
// URAI_PASS2_REPLAY_PLACE_LAW
// Replay must feel like entering an enclosed memory-place, not enabling a flat overlay.
// It uses nested depth shells, low camera drift, heavier fog, and phase-gated aura separation.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uraiRuntimeGuard } from "@/lib/uraiRuntimeGuard";
import { useSpatialNarrator } from "@/spatial/hooks/useSpatialNarrator";
import { NarratorOverlay } from "@/spatial/components/NarratorOverlay";
import { Tier3Field } from "@/spatial/components/Tier3Field";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ReplayVisualEngine } from "@/spatial/visual-engine/ReplayVisualEngine";
import { FocusVisualEngine } from "@/spatial/visual-engine/FocusVisualEngine";
import { LifeMapVisualEngine } from "@/spatial/visual-engine/LifeMapVisualEngine";
import { HomeVisualEngine } from "@/spatial/visual-engine/HomeVisualEngine";
import { AscentVisualEngine } from "@/spatial/visual-engine/AscentVisualEngine";
import { Tier3PresenceLayer } from "@/spatial/components/Tier3PresenceLayer";


type Phase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";

type Star = {
  id: string;
  title: string;
  memoryType: "threshold" | "relationship" | "clarity" | "shadow" | "recovery";
  narratorLine: string;
  position: [number, number, number];
  scale: number;
  memoryWeight: number;
  auraIntensity: number;
  emotionalTone: "calm" | "charged" | "shadow" | "bright" | "threshold";
};

const ASCENT_MS = 3400;
const ASCENT_LIFEMAP_HANDOFF_MS = 2100;
const FOCUS_MS = 1500;
const FOCUS_ARRIVAL_SETTLE_MS = 1100;
const REPLAY_MS = 1600;
const REPLAY_PRESENCE_SETTLE_MS = 1400;
const REPLAY_DWELL_MS = 900;
const FOCUS_REVERSE_BRIDGE_MS = 520;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function ease(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function nowMs(): number {
  return Date.now();
}

/* URAI_VOICE_FORWARD_PHASE_ORDER_V1 */
const URAI_PHASE_ORDER: Record<Phase, number> = {
  HOME: 0,
  ASCENT: 1,
  LIFEMAP: 2,
  FOCUS: 3,
  REPLAY: 4,
};

function isForwardPhaseMove(from: Phase, to: Phase): boolean {
  return URAI_PHASE_ORDER[to] > URAI_PHASE_ORDER[from];
}

type EmotionalModel = {
  memoryWeight: number;
  auraIntensity: number;
  fogWeight: number;
  particleDensity: number;
  pulseRate: number;
  replayStillness: number;
  tone: "neutral" | "calm" | "charged" | "shadow" | "bright" | "threshold";
};

type MemoryPatternInsight = {
  dominantArc: "threshold_crossing" | "shadow_loop" | "recovery_arc" | "relationship_charge" | "clarity_sequence" | "mixed_field";
  relatedMemoryIds: string[];
  relatedTitles: string[];
  systemInsight: string;
  nextSuggestedFocusId: string | null;
  chainLine: string;
};




function inferMemoryPattern(stars: Star[], selected: Star | null): MemoryPatternInsight {
  const counts = stars.reduce<Record<Star["memoryType"], number>>((acc, star) => {
    acc[star.memoryType] = (acc[star.memoryType] ?? 0) + 1;
    return acc;
  }, {
    threshold: 0,
    relationship: 0,
    clarity: 0,
    shadow: 0,
    recovery: 0,
  });

  const avgWeight =
    stars.length > 0
      ? stars.reduce((sum, star) => sum + star.memoryWeight, 0) / stars.length
      : 0;

  const dominantType = (Object.keys(counts) as Star["memoryType"][]).sort((a, b) => counts[b] - counts[a])[0] ?? "clarity";

  const dominantArc =
    selected?.memoryType === "threshold" || counts.threshold >= 2 ? "threshold_crossing" :
    selected?.memoryType === "shadow" || counts.shadow >= 2 ? "shadow_loop" :
    selected?.memoryType === "recovery" || counts.recovery >= 2 ? "recovery_arc" :
    selected?.memoryType === "relationship" || counts.relationship >= 2 ? "relationship_charge" :
    selected?.memoryType === "clarity" || counts.clarity >= 2 ? "clarity_sequence" :
    "mixed_field";

  const related = selected
    ? stars
        .filter((star) => star.id !== selected.id)
        .map((star) => {
          const typeMatch = star.memoryType === selected.memoryType ? 0.42 : 0;
          const toneMatch = star.emotionalTone === selected.emotionalTone ? 0.24 : 0;
          const weightDistance = Math.abs(star.memoryWeight - selected.memoryWeight);
          const weightScore = Math.max(0, 0.24 - weightDistance * 0.3);
          const proximityScore = Math.max(
            0,
            0.18 -
              Math.hypot(
                star.position[0] - selected.position[0],
                star.position[1] - selected.position[1],
                star.position[2] - selected.position[2]
              ) * 0.012
          );

          return {
            star,
            score: typeMatch + toneMatch + weightScore + proximityScore,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map((entry) => entry.star)
    : [];

  const nextSuggested =
    selected
      ? related[0] ?? null
      : stars.slice().sort((a, b) => b.memoryWeight - a.memoryWeight)[0] ?? null;

  const systemInsight =
    dominantArc === "threshold_crossing"
      ? "URAI is detecting a threshold-crossing pattern. Multiple memories cluster around transition, identity shift, or before-and-after meaning."
      : dominantArc === "shadow_loop"
        ? "URAI is detecting a shadow-loop pattern. The field contains repeated pressure points that may be connected by unresolved tension."
        : dominantArc === "recovery_arc"
          ? "URAI is detecting a recovery arc. The map shows movement from strain toward return, repair, or stabilization."
          : dominantArc === "relationship_charge"
            ? "URAI is detecting relationship charge. Several memories appear shaped by connection, conflict, attachment, or social residue."
            : dominantArc === "clarity_sequence"
              ? "URAI is detecting a clarity sequence. The map contains signals where confusion resolves into pattern recognition."
              : "URAI is detecting a mixed field. No single arc dominates yet, but the memories are beginning to form a readable system.";

  const chainLine =
    selected && related.length > 0
      ? selected.title + " appears connected to " + related.map((star) => star.title).join(" and ") + "."
      : selected
        ? selected.title + " is currently isolated as a standalone signal."
        : dominantType + " is the strongest visible memory type in the current LifeMap.";

  return {
    dominantArc,
    relatedMemoryIds: related.map((star) => star.id),
    relatedTitles: related.map((star) => star.title),
    systemInsight:
      systemInsight +
      " Average symbolic weight: " +
      avgWeight.toFixed(2) +
      ".",
    nextSuggestedFocusId: nextSuggested?.id ?? null,
    chainLine,
  };
}

function formatDominantArcLabel(arc: MemoryPatternInsight["dominantArc"]): string {
  if (arc === "threshold_crossing") return "Threshold crossing";
  if (arc === "shadow_loop") return "Shadow loop";
  if (arc === "recovery_arc") return "Recovery arc";
  if (arc === "relationship_charge") return "Relationship charge";
  if (arc === "clarity_sequence") return "Clarity sequence";
  return "Mixed field";
}

function resolveTier4DynamicMeaning(star: Star | null, phase: Phase, emotionalModel: EmotionalModel): string {
  if (!star) return "";

  const weight = emotionalModel.memoryWeight;
  const stillness = emotionalModel.replayStillness;
  const tone = emotionalModel.tone;

  const weightLine =
    weight >= 0.78 ? "URAI is treating this as a high-weight memory because the signal is dense, persistent, or emotionally marked." :
    weight >= 0.52 ? "URAI is treating this as a medium-weight memory because it carries enough pattern signal to hold focus." :
    "URAI is treating this as a lighter memory because the signal is present but not dominant.";

  const toneLine =
    tone === "shadow" ? "The field is slower because this memory carries unresolved pressure." :
    tone === "threshold" ? "The field is heightened because this point marks a transition." :
    tone === "charged" ? "The field is more active because this memory carries relational or emotional charge." :
    tone === "bright" ? "The field is clearer because this memory resolves into a brighter signal." :
    tone === "calm" ? "The field is quieter because this memory is stabilizing rather than disruptive." :
    "The field is neutral because the memory is present without a dominant emotional signature.";

  const phaseLine =
    phase === "REPLAY" && stillness >= 0.72
      ? "Replay is holding the scene with extra stillness so the memory feels like a place, not a passing overlay."
      : phase === "REPLAY"
        ? "Replay is active. URAI is preserving the memory long enough for its weight to become visible."
        : phase === "FOCUS"
          ? "Focus is isolating this memory from the wider LifeMap so its signal can be read clearly."
          : phase === "LIFEMAP"
            ? "The LifeMap is showing this as one point inside the larger pattern."
            : "";

  return [star.narratorLine, weightLine, toneLine, phaseLine].filter(Boolean).join(" ");
}

function resolveTier4WhyThis(star: Star | null, phase: Phase, emotionalModel: EmotionalModel): string {
  if (!star) return "";

  const reason =
    emotionalModel.memoryWeight >= 0.78 ? "high symbolic weight" :
    star.memoryType === "threshold" ? "threshold status" :
    star.memoryType === "shadow" ? "shadow pressure" :
    star.memoryType === "recovery" ? "recovery signal" :
    star.memoryType === "relationship" ? "relational charge" :
    "pattern clarity";

  

  
  const base = star.narratorLine || star.title;

  if (phase === "REPLAY") {
    if (star.memoryType === "threshold") return base + " This was a threshold moment. The system is holding it with extra weight.";
    if (star.memoryType === "shadow") return base + " This memory carries shadow tension. Replay is slowing the field so the pattern can be seen.";
    if (star.memoryType === "recovery") return base + " This is a recovery signal. The system is marking the rebound, not just the pain.";
    if (star.memoryType === "relationship") return base + " This memory is relational. Its meaning lives in the connection pattern around it.";
    if (star.memoryType === "clarity") return base + " This is a clarity point. The field sharpens because the pattern resolved here.";
  }

  if (phase === "FOCUS") {
    if (star.memoryType === "threshold") return base + " A threshold is forming around this point.";
    if (star.memoryType === "shadow") return base + " There is unresolved pressure here.";
    if (star.memoryType === "recovery") return base + " This point carries recovery energy.";
    if (star.memoryType === "relationship") return base + " This point is shaped by connection.";
    if (star.memoryType === "clarity") return base + " This point has a clear signal.";
  }

  return base;
}

function memoryVisualProfile(star: Star | null) {
  const kind = star?.memoryType ?? "clarity";

  if (kind === "threshold") {
    return { glow: 1.28, aura: 1.22, fog: 1.08, pulse: 1.18, contrast: 1.12 };
  }

  if (kind === "shadow") {
    return { glow: 0.82, aura: 0.92, fog: 1.34, pulse: 0.74, contrast: 0.86 };
  }

  if (kind === "recovery") {
    return { glow: 1.14, aura: 1.32, fog: 0.82, pulse: 0.92, contrast: 1.02 };
  }

  if (kind === "relationship") {
    return { glow: 1.08, aura: 1.18, fog: 0.94, pulse: 1.32, contrast: 1.04 };
  }

  return { glow: 1.18, aura: 1.04, fog: 0.76, pulse: 1.0, contrast: 1.18 };
}

function buildEmotionalModel(phase: Phase, selected: Star | null): EmotionalModel {
  const base =
    phase === "REPLAY" ? 0.82 :
    phase === "FOCUS" ? 0.62 :
    phase === "LIFEMAP" ? 0.34 :
    phase === "ASCENT" ? 0.26 :
    0.18;

  const starWeight = selected?.memoryWeight ?? 0.35;
  const aura = selected?.auraIntensity ?? 0.32;
  const weight = clamp01(base * 0.52 + starWeight * 0.48);

  return {
    memoryWeight: weight,
    auraIntensity: clamp01(
      (0.34 + weight * 0.66) *
      (phase === "REPLAY" ? 1.4 :
       phase === "FOCUS" ? 1.1 :
       phase === "LIFEMAP" ? 0.72 :
       phase === "ASCENT" ? 0.46 :
       0.34)
    ),
    fogWeight: clamp01(
      (0.28 + weight * 0.72) *
      (phase === "REPLAY" ? 1.25 :
       phase === "FOCUS" ? 0.9 :
       phase === "LIFEMAP" ? 0.52 :
       0.34)
    ),
    particleDensity: clamp01(
      (0.3 + weight * 0.7) *
      (phase === "REPLAY" ? 1.3 :
       phase === "FOCUS" ? 1.0 :
       phase === "LIFEMAP" ? 0.66 :
       0.42)
    ),
    pulseRate:
      phase === "REPLAY" ? 0.74 + weight * 0.18 :
      phase === "FOCUS" ? 0.98 + weight * 0.22 :
      0.58 + weight * 0.18,
    replayStillness:
      phase === "REPLAY"
        ? clamp01(0.6 + weight * 0.4)
        : 0,
    tone: selected?.emotionalTone ?? "neutral",
  };
}

function useClock(): number {
  const [now, setNow] = useState(() => nowMs());

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setNow(nowMs());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
return () => cancelAnimationFrame(raf);
  }, []);

  return now;
}

function assertLegal(from: Phase, allowed: Phase[], action: string): boolean {
  if (!allowed.includes(from)) {
    console.error("[URAI_CANON_ILLEGAL]", action, "blocked from", from);
    return false;
  }
  return true;
}

function CameraRig({
  phase,
  startedAt,
  selected,
  now,
}: {
  phase: Phase;
  startedAt: number;
  selected: [number, number, number] | null;
  now: number;
}) {
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(0, 0.8, 12));
  const look = useRef(new THREE.Vector3(0, 0.4, 0));

  useFrame((_, delta) => {
  const smoothedDelta = Math.min(delta, 0.032);
    /* TIER2_REVERSE_SYMMETRY_DAMPING */
    const returnDamp =
  phase === "ASCENT" ? 2.1 :
  phase === "HOME" ? 2.7 :
  phase === "LIFEMAP" ? 2.9 :
  phase === "FOCUS" ? 3.2 :
  phase === "REPLAY" ? 3.0 :
  2.8;

    const returnLookDamp = returnDamp;


    const elapsed = now - startedAt;
    const ASCENT_CAMERA_SYNC_DELAY_MS = 120;
    const ascentRaw = Math.max(0, elapsed - ASCENT_CAMERA_SYNC_DELAY_MS) / ASCENT_MS;
    /* TIER2_ASCENT_MICRO_SEAM_CAMERA_SYNC_V1 */
    const ascentClamped = Math.max(0, Math.min(1, ascentRaw));
    const ascentSmooth = ascentClamped * ascentClamped * (3 - 2 * ascentClamped);
    const ascent = ease(ascentSmooth);
    const focus = ease(elapsed / FOCUS_MS);
    const replay = ease(elapsed / REPLAY_MS);

    let targetPos = new THREE.Vector3(0, 0.8, 12);
    let targetLook = new THREE.Vector3(0, 0.2, 0);

    if (phase === "HOME") {
      targetPos = new THREE.Vector3(0, 0.9, 12);
      targetLook = new THREE.Vector3(0, 0.2, 0);
    }

    if (phase === "ASCENT") {
      targetPos = new THREE.Vector3(
        0,
        /* TIER2_ASCENT_CAMERA_POSITION_SEAM_SOFTEN_V1 */
        0.9 + ascent * 12.4,
        12 - ascent * 11.25
      );
      targetLook = new THREE.Vector3(
        0,
        /* TIER2_ASCENT_LOOKAT_SEAM_SOFTEN_V1 */
        0.2 + ascent * 7.95,
        -ascent * 8.65
      );
    }

    if (phase === "LIFEMAP") {
      const handoffRaw = clamp01((now - startedAt) / ASCENT_LIFEMAP_HANDOFF_MS);
      const handoff = handoffRaw * handoffRaw * handoffRaw * (handoffRaw * (handoffRaw * 6 - 15) + 10);

      const ascentEndPos = new THREE.Vector3(
        0,
        0.9 + 12.4,
        12 - 11.25
      );

      const ascentEndLook = new THREE.Vector3(
        0,
        0.2 + 7.95,
        -8.65
      );

      const lifeMapPos = new THREE.Vector3(0, 9.92, 3.28);
      const lifeMapLook = new THREE.Vector3(0, 6.48, -6.72);

      targetPos = ascentEndPos.lerp(lifeMapPos, handoff);
      targetLook = ascentEndLook.lerp(lifeMapLook, handoff);
    }

    if (phase === "FOCUS" && selected) {
  const s = new THREE.Vector3(...selected);

  // Start far, travel forward into space
  const start = new THREE.Vector3(
    s.x * 0.3,
    s.y + 2.5,
    s.z + 12
  );

  const end = new THREE.Vector3(
    s.x * 0.6,
    s.y + 1.4,
    s.z + 4.35
  );

  targetPos = start.lerp(end, focus);
  targetLook = new THREE.Vector3(s.x, s.y, s.z);
}

    if (phase === "REPLAY" && selected) {
  const s = new THREE.Vector3(...selected);

  // Continue forward motion deeper into space
  const start = new THREE.Vector3(
    s.x * 0.6,
    s.y + 1.4,
    s.z + 4.35
  );

  const end = new THREE.Vector3(
    s.x * 0.8,
    s.y + 0.9,
    s.z + 2.35
  );

  targetPos = start.lerp(end, replay);
  targetLook = new THREE.Vector3(s.x, s.y + 0.05, s.z - 0.92);
}

    pos.current.lerp(targetPos, 1 - Math.pow(0.0008, smoothedDelta));
    look.current.lerp(targetLook, 1 - Math.pow(0.0012, smoothedDelta));

    camera.position.copy(pos.current);
    look.current.x = THREE.MathUtils.damp(look.current.x, targetLook.x, returnLookDamp, smoothedDelta);
    look.current.y = THREE.MathUtils.damp(look.current.y, targetLook.y, returnLookDamp, smoothedDelta);
    look.current.z = THREE.MathUtils.damp(look.current.z, targetLook.z, returnLookDamp, smoothedDelta);

    camera.lookAt(look.current);

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov =
        phase === "REPLAY" ? 29 :
        phase === "FOCUS" ? 34 :
        /* TIER2_ASCENT_FOV_SEAM_SOFTEN_V1 */
        phase === "ASCENT" ? 39 :
        40;

      camera.fov += (targetFov - camera.fov) * (1 - Math.pow(0.001, smoothedDelta));
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

function HomeWorld({
  phase,
  now,
  startedAt,
  onBeginAscent,
  emotionalModel,
}: {
  phase: Phase;
  now: number;
  startedAt: number;
  onBeginAscent: () => void;
  emotionalModel: EmotionalModel;
}) {
  const handoffGhost = phase === "LIFEMAP" ? 1 - ease((now - startedAt) / ASCENT_LIFEMAP_HANDOFF_MS) : 0;
  const visible = phase === "HOME" || phase === "ASCENT" || handoffGhost > 0.02;
  const ascentEase =
    phase === "ASCENT"
      ? ease((now - startedAt) / ASCENT_MS)
      : phase === "LIFEMAP"
        ? 1
        : 0;
  /* TIER2_ASCENT_HOME_Y_SOFTEN_V1 */
  const homeY = -2.4 * ascentEase;
  /* TIER2_ASCENT_HOME_Z_SOFTEN_V1 */
  const homeZ = -4.2 * ascentEase;
  const homeScale = 1 - 0.35 * ascentEase;
  /* TIER2_ASCENT_HOME_LATE_FADE */
  /* TIER2_ASCENT_HOME_LATE_FADE_V2 */
  const homePresence =
    phase === "LIFEMAP"
      ? Math.max(0, handoffGhost * 0.32)
      : 1;

  if (!visible) return null;

  return (
    <group position={[0, homeY, homeZ]} scale={homeScale}>
      <mesh onClick={phase === "HOME" ? onBeginAscent : undefined} position={[0, 0, 0]}>
        <sphereGeometry args={[1.18, 64, 64]}  />
        <meshStandardMaterial color="#7c3cff" emissive="#3f18a8" emissiveIntensity={0.9 * homePresence + emotionalModel.auraIntensity * 0.35} roughness={0.52} transparent opacity={homePresence}  />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.38, 0]} onClick={phase === "HOME" ? onBeginAscent : undefined}>
        <ringGeometry args={[2.1, 3.2, 96]}  />
        <meshBasicMaterial color="#6b4cff" transparent opacity={0.16 * homePresence} side={THREE.DoubleSide}  depthWrite={false}  />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.42, 0]}>
        <circleGeometry args={[10.8, 128]}  />
        <meshBasicMaterial color="#140521" transparent opacity={0.42 * homePresence} side={THREE.DoubleSide}  depthWrite={false}  />
      </mesh>

      <mesh position={[0, 0, -15]} onClick={phase === "HOME" ? onBeginAscent : undefined}>
        <sphereGeometry args={[55, 64, 64]}  />
        <meshBasicMaterial color="#090314" transparent opacity={homePresence} side={THREE.BackSide} depthWrite={false}  />
      </mesh>
    </group>
  );
}

function LifeMapWorld({
  phase,
  startedAt,
  now,
  stars,
  onSelectStar,
  emotionalModel,
}: {
  phase: Phase;
  startedAt: number;
  now: number;
  stars: Star[];
  onSelectStar: (id: string) => void;
  emotionalModel: EmotionalModel;
}) {
  const handoff =
    phase === "LIFEMAP"
      ? Math.min(1, (now - startedAt) / ASCENT_LIFEMAP_HANDOFF_MS)
      : 1;
  const ascentReveal = 1; // PASS1: always present, camera reveals
  const visible = phase === "ASCENT" || phase === "LIFEMAP" || phase === "FOCUS" || phase === "REPLAY";

  if (!visible) return null;

  const opacity =
    phase === "ASCENT"
      ? Math.pow(Math.max(0, ascentReveal - 0.72) / 0.28, 1.25)
    : phase === "LIFEMAP" ? 1
    : phase === "FOCUS" ? 0.52
    : 0.22;

  return (
    <group
      /* TIER2_ASCENT_Z_ALIGNMENT_V1 */
      position={[
        0,
        (phase === "ASCENT" || phase === "LIFEMAP") ? (5.6 + (4.8 - 5.6) * handoff) : 4.8,
        (phase === "ASCENT" || phase === "LIFEMAP") ? (-12.3 + (-8.5 + 12.3) * handoff) : -8.5
      ]}
    >
      <mesh position={[0, 0, -18]}>
        <sphereGeometry args={[70, 64, 64]}  />
        <meshBasicMaterial color="#030812" side={THREE.BackSide} depthWrite={false}  />
      </mesh>

      {stars.map((star) => {
        const profile = memoryVisualProfile(star);
        const starGlow =
          ((phase === "LIFEMAP" ? 1.6 : 0.55) * profile.glow) +
          emotionalModel.auraIntensity * (0.45 + star.memoryWeight * 0.75);
        const starAura =
          opacity *
          (0.12 + star.auraIntensity * 0.24 + emotionalModel.particleDensity * 0.12) *
          profile.aura;
        const starScale =
          star.scale *
          (1 + star.auraIntensity * 0.18 * profile.aura + emotionalModel.memoryWeight * 0.045);

        return (
        <group key={star.id} position={star.position} scale={starScale}>
          <mesh
            onClick={phase === "LIFEMAP" ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onSelectStar(star.id);
            } : undefined}
          >
            <sphereGeometry args={[star.scale, 32, 32]}  />
            <meshStandardMaterial
              color="#a980ff"
              emissive="#6e37ff"
              emissiveIntensity={starGlow}
              transparent
              opacity={opacity}
              roughness={0.35}
             />
          </mesh>

          <mesh rotation={[0, 0, 0]}>
            <ringGeometry args={[star.scale * 1.8, star.scale * 2.2, 64]}  />
            <meshBasicMaterial color="#8d6bff" transparent opacity={starAura} side={THREE.DoubleSide}  depthWrite={false}  />
          </mesh>
        </group>
        );
      })}

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array(
                Array.from({ length: 420 }, (_, i) => {
                  const a = i * 12.9898;
                  const r = 7 + ((i * 19) % 28) * 0.35;
                  const z = -20 - ((i * 11) % 30);
                  return [Math.sin(a) * r, Math.cos(a * 0.7) * r * 0.42, z];
                }).flat()
              ),
              3,
            ]}
           />
        </bufferGeometry>
        <pointsMaterial size={0.035} color="#b9a8ff" transparent opacity={opacity * (0.48 + emotionalModel.particleDensity * 0.18)}  />
      </points>
    </group>
  );
}

function FocusWorld({
  phase,
  lastPhase,
  startedAt,
  now,
  selected,
  onOpenReplay,
  emotionalModel,
}: {
  phase: Phase;
  lastPhase: Phase;
  startedAt: number;
  now: number;
  selected: Star | null;
  onOpenReplay: () => void;
  emotionalModel: EmotionalModel;
}) {
  const reverseBridge = phase === "LIFEMAP" && lastPhase === "FOCUS";
  const bridgeT = reverseBridge ? clamp01((now - startedAt) / FOCUS_REVERSE_BRIDGE_MS) : 0;
  const bridgeOpacity = reverseBridge ? 1 - bridgeT : 1;

  if (!selected || (phase !== "FOCUS" && phase !== "REPLAY" && !reverseBridge)) return null;

  const replay = phase === "REPLAY";
  const p = selected.position;
  const profile = memoryVisualProfile(selected);
  const pulse = 1 + Math.sin(now * 0.0022 * emotionalModel.pulseRate) * 0.035 * profile.pulse;
  const coreScale =
    (replay ? 0.21 : 0.29) *
    pulse *
    (1 + emotionalModel.memoryWeight * 0.08);
  const auraScale = (1 + emotionalModel.auraIntensity * 0.42) * profile.aura;
  const fieldOpacity = replay
    ? 0.07 + emotionalModel.particleDensity * 0.18 + emotionalModel.memoryWeight * 0.045
    : 0.18 + emotionalModel.particleDensity * 0.24 + emotionalModel.auraIntensity * 0.08;
  const auraOpacity = replay
    ? 0.04 + emotionalModel.auraIntensity * 0.075 + emotionalModel.memoryWeight * 0.035
    : 0.09 + emotionalModel.auraIntensity * 0.13 + emotionalModel.memoryWeight * 0.055;

  return (
    <group position={[p[0], p[1] + 4.8, p[2] - 8.5]} scale={reverseBridge ? 1 - bridgeT * 0.08 : 1}>
      {/* TIER2_FOCUS_ARRIVAL_FIELD */}
      <group>
        {Array.from({ length: 56 }).map((_, i) => {
          const a = i * 2.399963;
          const band = i % 4;
          const r = 1.65 + band * 0.82 + (i % 7) * 0.045;
          const y = Math.sin(i * 0.91) * (0.42 + band * 0.11);
          const z = Math.cos(i * 0.37) * 0.46 - 0.95 - band * 0.08;
          return (
            <mesh key={i} position={[Math.cos(a) * r, y, Math.sin(a) * r + z]}>
              <sphereGeometry args={[0.018 + (i % 4) * 0.006, 10, 10]}  />
              <meshBasicMaterial color="#cdbfff" transparent opacity={bridgeOpacity * fieldOpacity * (0.64 + band * 0.08)}  depthWrite={false}  />
            </mesh>
          );
        })}
      </group>

      {/* TIER2_FOCUS_CONTEXT_RINGS */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.55, 1.68, 128]}  />
        <meshBasicMaterial color="#d7ccff" transparent opacity={bridgeOpacity * (replay ? 0.08 : 0.18)} side={THREE.DoubleSide}  depthWrite={false}  />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.45, 2.52, 128]}  />
        <meshBasicMaterial color="#7e58ff" transparent opacity={bridgeOpacity * (replay ? 0.045 : 0.105)} side={THREE.DoubleSide}  depthWrite={false}  />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.85, 2.92, 128]}  />
        <meshBasicMaterial color="#4d2bb4" transparent opacity={bridgeOpacity * (replay ? 0.035 : 0.075)} side={THREE.DoubleSide}  depthWrite={false}  />
      </mesh>

      {/* TIER2_FOCUS_MEMORY_CORE */}
      <mesh
        onClick={phase === "FOCUS" ? (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onOpenReplay();
        } : undefined}
      >
        <sphereGeometry args={[coreScale, 64, 64]}  />
        <meshStandardMaterial
          color="#c3a9ff"
          emissive="#7a46ff"
          emissiveIntensity={
    replay
      ? 1.35 + emotionalModel.memoryWeight * 0.75
      : 1.45 + emotionalModel.auraIntensity * 0.85
  }
          roughness={0.28}
         />
      </mesh>

      {phase !== "REPLAY" && (<mesh>
        <sphereGeometry args={[1.1 * auraScale, 48, 48]} />
        <meshBasicMaterial color="#9b75ff" transparent opacity={bridgeOpacity * auraOpacity} side={THREE.DoubleSide}  depthWrite={false}  />
      </mesh>)}

      {phase !== "REPLAY" && (<mesh>
        <sphereGeometry args={[1.75 * auraScale, 48, 48]} />
        <meshBasicMaterial color={selected.memoryType === "shadow" ? "#241433" : selected.memoryType === "recovery" ? "#6f58ff" : "#4d2bb4"} transparent opacity={bridgeOpacity * (replay ? 0.045 : 0.085) * profile.glow} side={THREE.BackSide} depthWrite={false}  />
      </mesh>)}

      {phase !== "REPLAY" && (<mesh>
        <sphereGeometry args={[3.9, 64, 64]}  />
        <meshBasicMaterial color="#16082f" transparent opacity={bridgeOpacity * (replay ? 0.07 : 0.045)} side={THREE.BackSide} depthWrite={false}  />
      </mesh>)}
    </group>
  );
}

function ReplayWorld({
  phase,
  selected,
  emotionalModel,
}: {
  phase: Phase;
  selected: Star | null;
  emotionalModel: EmotionalModel;
}) {
  if (phase !== "REPLAY" || !selected) return null;

  const p = selected.position;
  const profile = memoryVisualProfile(selected);
  const stillness = emotionalModel.replayStillness;
  const replayPulse =
    1 +
    Math.sin(Date.now() * 0.0011 * emotionalModel.pulseRate) *
      (0.012 + emotionalModel.particleDensity * 0.018) *
      (1 - stillness * 0.55);

  return (
    <group position={[p[0], p[1] + 4.8, p[2] - 8.5]} scale={replayPulse}>
      {/* TIER3_FOCUS_EDGE_FALLOFF */}
      <mesh>
        <sphereGeometry args={[7.5, 64, 64]}  />
        <meshBasicMaterial color="#0a0418" transparent opacity={0.025} side={THREE.BackSide} depthWrite={false}  />
      </mesh>
      {/* TIER2_REPLAY_ENCLOSURE */}
      

      

      

      

      {/* TIER2_REPLAY_DEPTH_PARTICLES */}
      {Array.from({ length: 210 }).map((_, i) => {
        const a = i * 2.399963;
        const shell = i % 5;
        const r = 0.9 + shell * 0.78 + (i % 13) * 0.032;
        const z = -0.55 - shell * 0.46 - (i % 19) * 0.035;
        const y = Math.sin(i * 0.73) * (1.1 + shell * 0.22);
        return (
          <mesh key={i} position={[Math.cos(a) * r, y, Math.sin(a) * r + z]}>
            <sphereGeometry args={[0.014 + (i % 4) * 0.005, 8, 8]}  />
            <meshBasicMaterial
              color="#ded4ff"
              transparent
              opacity={
                0.025 +
                shell * 0.008 +
                emotionalModel.memoryWeight * 0.035 +
                emotionalModel.particleDensity * 0.035
              }
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* TIER2_REPLAY_MEMORY_ANCHOR */}
      <mesh position={[0, -0.02, -0.82]}>
        <sphereGeometry args={[0.19, 40, 40]}  />
        <meshStandardMaterial color="#f2ecff" emissive="#a578ff" emissiveIntensity={(1.55 + emotionalModel.memoryWeight * 0.92) * profile.glow} roughness={0.18}  />
      </mesh>

      <mesh position={[0, -0.02, -0.82]}>
        <sphereGeometry args={[0.72, 48, 48]}  />
        <meshBasicMaterial
          color="#bca7ff"
          transparent
          opacity={0.035 + emotionalModel.auraIntensity * 0.045}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, -0.82]}>
        <ringGeometry args={[1.1, 1.18, 128]}  />
        <meshBasicMaterial
          color="#e5dcff"
          transparent
          opacity={0.035 + emotionalModel.memoryWeight * 0.055}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Atmosphere({ phase, emotionalModel }: { phase: Phase; emotionalModel: EmotionalModel }) {
  const memoryColor =
    emotionalModel.tone === "shadow" ? "#5f7cff" :
    emotionalModel.tone === "charged" ? "#ff6b8a" :
    emotionalModel.tone === "calm" ? "#68d8ff" :
    emotionalModel.tone === "bright" ? "#74f2c2" :
    emotionalModel.tone === "threshold" ? "#b56cff" :
    "#8a65ff";

  const fogNear =
    phase === "REPLAY"
      ? 1.35
      : phase === "FOCUS"
        ? 2.2
        : phase === "ASCENT"
          ? 2.5
          : 2.9;

  const fogFar =
    phase === "REPLAY"
      ? 13.5
      : phase === "FOCUS"
        ? 18
        : phase === "ASCENT"
          ? 22
          : 28;

  return (
    <>
      <color attach="background" args={[phase === "HOME" ? "#070111" : phase === "REPLAY" ? "#000105" : "#020711"]} />
      <fog attach="fog" args={[phase === "REPLAY" ? "#020008" : "#050214", fogNear, fogFar]} />
      <ambientLight
        intensity={
          phase === "REPLAY"
            ? 0.32 + emotionalModel.memoryWeight * 0.18
            : 0.48 + emotionalModel.auraIntensity * 0.18
        }
      />
      <pointLight
        position={[0, 8, 4]}
        intensity={
          phase === "REPLAY"
            ? Math.max(0.82, 1.65 - emotionalModel.fogWeight * 0.92 + emotionalModel.auraIntensity * 0.28)
            : 1.05 + emotionalModel.auraIntensity * 0.45
        }
        color={memoryColor}
      />
      <directionalLight position={[4, 8, 6]} intensity={0.45} color="#c9b9ff" />
    </>
  );
}


function resolveMeaningLine(memory: any, phase: string): string {
  const title = memory?.title ?? "this memory";
  const tone = memory?.tone ?? "neutral";
  const kind = memory?.kind ?? "ordinary";
  const weight = memory?.symbolicWeight ?? "medium";

  if (phase === "REPLAY") {
    return `Replay is holding ${title} as a ${weight} ${kind} memory.`;
  }

  if (phase === "FOCUS") {
    return `Focus is settling on ${title} with ${tone} signal weight.`;
  }

  if (phase === "LIFEMAP") {
    return "LifeMap is showing the broader pattern field.";
  }

  return "URAI is waiting at the origin point.";
}


function focusArrivalEase(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - x, 3);
}


function replayPresenceEase(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}


function resolveEmotionalState(memory: any, phase: string) {
  const tone = memory?.tone ?? "neutral";
  const kind = memory?.kind ?? "ordinary";
  const symbolicWeight = memory?.symbolicWeight ?? "medium";

  const auraColor =
    memory?.auraColor ??
    (tone === "hope" ? "#7dd3fc" :
     tone === "grief" ? "#a78bfa" :
     tone === "tension" ? "#f97316" :
     tone === "awe" ? "#facc15" :
     tone === "recovery" ? "#86efac" :
     "#cbd5e1");

  const baseIntensity =
    symbolicWeight === "threshold" ? 1 :
    symbolicWeight === "heavy" ? 0.82 :
    symbolicWeight === "medium" ? 0.62 :
    0.42;

  const phaseMultiplier =
    phase === "REPLAY" ? 1 :
    phase === "FOCUS" ? 0.82 :
    phase === "LIFEMAP" ? 0.45 :
    0.18;

  return {
    tone,
    kind,
    symbolicWeight,
    auraColor,
    auraIntensity: Math.max(0.08, Math.min(1, baseIntensity * phaseMultiplier)),
  };
}


function resolveTier3NarratorLine(memory: any, phase: string, emotionalState: any): string {
  const title = memory?.title ?? "this memory";
  const tone = emotionalState?.tone ?? "neutral";
  const weight = emotionalState?.symbolicWeight ?? "medium";

  if (phase === "REPLAY") {
    return `Replay is holding ${title}. Tone: ${tone}. Weight: ${weight}.`;
  }

  if (phase === "FOCUS") {
    return `Focus is settling around ${title}. The emotional field is ${tone}.`;
  }

  if (phase === "LIFEMAP") {
    return "The LifeMap is arranging memory signals into a visible pattern.";
  }

  return "URAI is resting at the origin.";
}

export default function SpatialScene() {
  const [tier4MeaningLine, setTier4MeaningLine] = useState("");
  const [tier4MeaningVisible, setTier4MeaningVisible] = useState(false);

  uraiRuntimeGuard();
  const now = useClock();

  const [phase, setPhase] = useState<Phase>("HOME");

  /* TIER3_SAFE_NARRATOR_TIMING_V1 */
  const [narratorReady, setNarratorReady] = useState(false);
  const narratorPhaseRef = useRef<Phase>("HOME");

  useEffect(() => {
    if (narratorPhaseRef.current !== phase) {
      narratorPhaseRef.current = phase;
      setNarratorReady(false);

      const delay =
        phase === "FOCUS" ? 420 :
        phase === "REPLAY" ? 720 :
        phase === "ASCENT" ? 240 :
        160;

      const timer = window.setTimeout(() => {
        setNarratorReady(true);
      }, delay);

      return () => window.clearTimeout(timer);
    }

    setNarratorReady(true);
  }, [phase]);
    const [uraiTransitionLocked, setUraiTransitionLocked] = useState(false);
  const [startedAt, setStartedAt] = useState(() => nowMs());
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [replayEnteredAt, setReplayEnteredAt] = useState<number>(0);
  const previousPhaseRef = useRef<Phase>("HOME");
  const [lastPhase, setLastPhase] = useState<Phase>("HOME");

  const stars = useMemo<Star[]>(() => [
    { id: "alpha", title: "Threshold Signal", memoryType: "threshold", narratorLine: "A threshold is forming here. The system is holding the moment before it becomes a pattern.", position: [-3.6, 1.1, -3.8], scale: 0.36, memoryWeight: 0.76, auraIntensity: 0.72, emotionalTone: "threshold" },
    { id: "beta", title: "Charged Memory", memoryType: "relationship", narratorLine: "This memory carries charge. URAI is tracking the emotional residue around the connection.", position: [0.0, 0.3, -5.2], scale: 0.42, memoryWeight: 0.64, auraIntensity: 0.66, emotionalTone: "charged" },
    { id: "gamma", title: "Bright Recall", memoryType: "clarity", narratorLine: "This point is lighter. The pattern is easier to see from here.", position: [3.8, 1.7, -4.8], scale: 0.32, memoryWeight: 0.52, auraIntensity: 0.58, emotionalTone: "bright" },
    { id: "delta", title: "Shadow Thread", memoryType: "shadow", narratorLine: "This thread is heavier. URAI is preserving the signal without forcing interpretation.", position: [-1.5, -1.4, -6.2], scale: 0.24, memoryWeight: 0.83, auraIntensity: 0.78, emotionalTone: "shadow" },
    { id: "epsilon", title: "Recovery Marker", memoryType: "recovery", narratorLine: "This is a recovery marker. The system is detecting return, not collapse.", position: [2.2, -0.8, -7.4], scale: 0.22, memoryWeight: 0.44, auraIntensity: 0.46, emotionalTone: "calm" },
  ], []);

  const selected = useMemo(() => {
    return stars.find((star) => star.id === selectedStarId) ?? null;
  }, [stars, selectedStarId]);

  const emotionalState = {
  tone: selected?.emotionalTone ?? "neutral",
  kind: selected?.memoryType ?? "ordinary",
  symbolicWeight:
    selected?.memoryType === "threshold" ? "threshold" :
    selected?.memoryWeight > 0.72 ? "heavy" :
    selected?.memoryWeight > 0.48 ? "medium" :
    "light",
  auraColor: "#9fb7ff",
  auraIntensity: Number(selected?.auraIntensity ?? 0.45),
  replayDensity: Number(selected?.auraIntensity ?? 0.55),
  breathRate:
    selected?.memoryType === "threshold" ? 4.8 :
    selected?.memoryType === "shadow" ? 5.6 :
    selected?.memoryType === "relationship" ? 6.2 :
    7.2,
};

  useEffect(() => {
    setLastPhase(previousPhaseRef.current);
    previousPhaseRef.current = phase;
  }, [phase]);

  /* TIER3_EMOTIONAL_MODEL */
  const memoryColor =
    selected?.emotionalTone === "shadow" ? "#5f7cff" :
    selected?.emotionalTone === "charged" ? "#ff6b8a" :
    selected?.emotionalTone === "calm" ? "#68d8ff" :
    selected?.emotionalTone === "bright" ? "#74f2c2" :
    selected?.emotionalTone === "threshold" ? "#b56cff" :
    "#8a65ff";

  const emotionalModel = useMemo(() => {
  return buildEmotionalModel(phase, selected);
}, [phase, selected]);

const patternInsight = useMemo(() => {
  return inferMemoryPattern(stars, selected);
}, [stars, selected]);

  /* TIER4_MEANING_TRIGGER_SCOPED_FINAL_LOOP_KILL */
  useEffect(() => {
    if (!selected || (phase !== "FOCUS" && phase !== "REPLAY")) {
      setTier4MeaningVisible((prev) => (prev ? false : prev));
      return;
    }

    const timer = window.setTimeout(() => {
      const line =
        phase === "REPLAY" || emotionalModel.memoryWeight >= 0.72
          ? resolveTier4DynamicMeaning(selected, phase, emotionalModel)
          : resolveMeaningLine(selected, phase);

      const whyLine = resolveTier4WhyThis(selected, phase, emotionalModel);
      const compactPatternLine =
        phase === "REPLAY"
          ? patternInsight.chainLine
          : patternInsight.systemInsight;

      const nextLine = [
        whyLine ? line + " " + whyLine : line,
        compactPatternLine,
      ].filter(Boolean).join(" ");

      setTier4MeaningLine((prev) => (prev === nextLine ? prev : nextLine));
      setTier4MeaningVisible((prev) => (prev ? prev : true));
    }, phase === "REPLAY" ? 900 : 520);

    const hideTimer = window.setTimeout(() => {
      setTier4MeaningVisible((prev) => (prev ? false : prev));
    }, phase === "REPLAY" ? 5200 : 3600);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hideTimer);
    };
  }, [
    phase,
    selected?.id,
    emotionalModel.memoryWeight,
    emotionalModel.replayStillness,
    emotionalModel.tone,
    patternInsight.dominantArc,
    patternInsight.systemInsight,
    patternInsight.chainLine,
  ]);

  /* TIER4_NARRATOR_HOOK_SAFE_SCOPE */
  const narratorLine = useSpatialNarrator({
    phase,
    emotionalState: {
      phase,
      activeMemoryId: selected?.id ?? null,
      tone:
        emotionalModel.tone === "shadow" ? "grief" :
        emotionalModel.tone === "bright" ? "hope" :
        emotionalModel.tone === "threshold" ? "tension" :
        emotionalModel.tone,
      symbolicWeight:
        selected?.memoryType === "threshold" ? "threshold" :
        emotionalModel.memoryWeight > 0.72 ? "heavy" :
        emotionalModel.memoryWeight > 0.48 ? "medium" :
        "light",
      auraColor: memoryColor,
      auraIntensity: emotionalModel.auraIntensity,
      breathRate: emotionalModel.pulseRate,
      replayDensity: emotionalModel.particleDensity,
      focusPresence: emotionalModel.memoryWeight,
    },
    activeMemory: selected
      ? {
          id: selected.id,
          title: selected.title,
          kind:
            selected.memoryType === "threshold" ? "threshold" :
            selected.memoryType === "relationship" ? "relationship" :
            selected.memoryType === "recovery" ? "recovery" :
            selected.memoryType === "shadow" ? "wound" :
            "ordinary",
          tone:
            selected.emotionalTone === "shadow" ? "grief" :
            selected.emotionalTone === "bright" ? "hope" :
            selected.emotionalTone === "threshold" ? "tension" :
            selected.emotionalTone,
          symbolicWeight:
            selected.memoryType === "threshold" ? "threshold" :
            selected.memoryWeight > 0.72 ? "heavy" :
            selected.memoryWeight > 0.48 ? "medium" :
            "light",
          auraColor: memoryColor,
          intensity: selected.memoryWeight,
          replayDensity: selected.auraIntensity,
          narratorSeed: selected.narratorLine,
        }
      : null,
  });

  /* TIER3_SAFE_NARRATOR_COPY_V1 */
  const narratorCopy = useMemo(() => {
    if (!narratorReady) return "";

    const memoryWeightLabel =
      emotionalModel.memoryWeight >= 0.78 ? "heavy" :
      emotionalModel.memoryWeight >= 0.52 ? "medium" :
      "light";

    const toneLabel =
      emotionalModel.tone === "shadow" ? "shadow pressure" :
      emotionalModel.tone === "threshold" ? "threshold tension" :
      emotionalModel.tone === "charged" ? "charged signal" :
      emotionalModel.tone === "bright" ? "bright signal" :
      emotionalModel.tone === "calm" ? "calm signal" :
      "neutral signal";

    const holdLabel =
      emotionalModel.replayStillness >= 0.72
        ? "The scene is being held with extra stillness."
        : "The scene remains active and moving.";

    const arcLabel = formatDominantArcLabel(patternInsight.dominantArc);
    const chainLabel = patternInsight.chainLine;

    if (phase === "HOME") {
      return "URAI Spatial is idle. The surface is stable. The life-map is waiting behind the sky.";
    }

    if (phase === "ASCENT") {
      return "Ascending. The surface is falling away while memory space comes into view.";
    }

    if (phase === "LIFEMAP") {
      return selected
        ? "Selected: " + selected.title + ". Signal weight: " + memoryWeightLabel + ". Tone: " + toneLabel + ". Dominant arc: " + arcLabel + ". " + chainLabel
        : "LifeMap open. Dominant arc: " + arcLabel + ". Choose a memory star to enter focus.";
    }

    if (phase === "FOCUS") {
      return selected
        ? "Focus locked: " + selected.title + ". This is a " + memoryWeightLabel + " memory carrying " + toneLabel + ". Dominant arc: " + arcLabel + ". " + chainLabel + " " + selected.narratorLine
        : "Focus requires a selected memory.";
    }

    if (phase === "REPLAY") {
      return selected
        ? "Replay active: " + selected.title + ". " + holdLabel + " " + chainLabel
        : "Replay blocked until a memory is selected.";
    }

    return "URAI Spatial active.";
  }, [
    phase,
    selected,
    narratorReady,
    emotionalModel.memoryWeight,
    emotionalModel.replayStillness,
    emotionalModel.tone,
    patternInsight.dominantArc,
    patternInsight.chainLine,
  ]);

  /* URAI_NARRATOR_VOICE_PRODUCTION_V2 */
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  /* URAI_DEMO_MODE_STATE_V1 */
  const [demoMode, setDemoMode] = useState(false);
  const demoStepRef = useRef(0);
  const lastSpokenRef = useRef("");
  const tier4MeaningLastKeyRef = useRef("");
  const tier4MeaningLastAtRef = useRef(0);
  /* URAI_VOICE_DIRECTION_REF_V1 */
  const voiceLastPhaseRef = useRef<Phase>("HOME");

  const speakNarrator = useCallback(() => {
    if (!narratorCopy.trim()) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(narratorCopy);
    utterance.rate = phase === "REPLAY" ? 0.82 : phase === "ASCENT" ? 0.92 : 0.88;
    utterance.pitch = phase === "REPLAY" ? 0.82 : phase === "FOCUS" ? 0.94 : 1.0;
    utterance.volume = 0.88;

    window.speechSynthesis.speak(utterance);
  }, [narratorCopy, phase]);

  useEffect(() => {
    if (!voiceEnabled) return;
    if (!narratorReady) return;
    if (!narratorCopy.trim()) return;

    const from = voiceLastPhaseRef.current;
    const forward = isForwardPhaseMove(from, phase);
    const firstHomeSpeak = from === phase && phase === "HOME" && lastSpokenRef.current === "";

    if (!forward && !firstHomeSpeak) return;

    const speakKey = phase + "::" + narratorCopy;
    if (lastSpokenRef.current === speakKey) return;

    const timer = window.setTimeout(() => {
      lastSpokenRef.current = speakKey;
      voiceLastPhaseRef.current = phase;
      speakNarrator();
    }, phase === "REPLAY" ? 520 : phase === "FOCUS" ? 320 : 140);

    return () => window.clearTimeout(timer);
  }, [voiceEnabled, narratorReady, narratorCopy, phase, speakNarrator]);


  /* URAI_EMPTY_STARS_SELECTION_FALLBACK */
  useEffect(() => {
    if (stars.length === 0 && selectedStarId) {
      console.error("[URAI_CANON_ILLEGAL] selectedStarId cleared because stars array is empty");
      setSelectedStarId(null);
      setReplayEnteredAt(0);
      setUraiTransitionLocked(false);
    }
  }, [stars.length, selectedStarId]);

  /* URAI_SELECTED_STAR_NULL_FALLBACK */
  useEffect(() => {
    if ((phase === "FOCUS" || phase === "REPLAY") && selectedStarId && !selected) {
      console.error("[URAI_CANON_ILLEGAL] selectedStarId missing from stars; returning to LIFEMAP");
      setSelectedStarId(null);
      setReplayEnteredAt(0);
      setUraiTransitionLocked(false);
      setStartedAt(nowMs());
      setPhase("LIFEMAP");
    }
  }, [phase, selected, selectedStarId]);

  /* URAI_TRANSITION_LOCK_RELEASE_SAFE */
  useEffect(() => {
    if (phase !== "ASCENT") {
      setUraiTransitionLocked(false);
    }
  }, [phase]);

  const setLegalPhase = useCallback((next: Phase) => {
    setPhase(next);
    setStartedAt(nowMs());
  }, []);

  const beginAscent = useCallback(() => {
    if (phase === "ASCENT") {
      return;
    }

    /* URAI_ASCENT_ENTRY_GUARD */
    if (phase !== "HOME" || uraiTransitionLocked) return;
    setUraiTransitionLocked(true);
    setPhase((prev) => {
      if (!assertLegal(prev, ["HOME"], "beginAscent")) return prev;
      setStartedAt(nowMs());
      setSelectedStarId(null);
      return "ASCENT";
    });
  }, [phase, uraiTransitionLocked]);

  useEffect(() => {
    if (phase !== "ASCENT") return;
    const timer = window.setTimeout(() => {
      setPhase((prev) => {
        if (prev !== "ASCENT") return prev;
        setStartedAt(nowMs());
        setUraiTransitionLocked(false);
        return "LIFEMAP";
      });
    }, ASCENT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const openFocus = useCallback((id: string) => {
    /* URAI_FOCUS_ENTRY_GUARD */
    if (phase !== "LIFEMAP" || uraiTransitionLocked) return;
    setUraiTransitionLocked(true);
    setPhase((prev) => {
      if (!assertLegal(prev, ["LIFEMAP"], "openFocus")) return prev;
      setSelectedStarId(id);
      setStartedAt(nowMs());
      setUraiTransitionLocked(false);
      return "FOCUS";
    });
  }, [phase, uraiTransitionLocked]);

  const openReplay = useCallback(() => {
    /* URAI_REPLAY_ENTRY_GUARD */
    if (phase !== "FOCUS" || uraiTransitionLocked) return;
    setUraiTransitionLocked(true);
    setPhase((prev) => {
      if (!assertLegal(prev, ["FOCUS"], "openReplay")) return prev;
      if (!selectedStarId || !selected) {
        console.error("[URAI_CANON_ILLEGAL] openReplay blocked without resolved selectedStar");
        setUraiTransitionLocked(false);
        return prev;
      }
      const t = nowMs();
      setReplayEnteredAt(t);
      setStartedAt(t);
      setUraiTransitionLocked(false);
      return "REPLAY";
    });
  }, [phase, uraiTransitionLocked, selectedStarId, selected]);

  const escapeBack = useCallback(() => {
    /* URAI_NO_ALERT_DURING_REPLAY */
    const suppressViolation = (phase === "REPLAY");
    /* URAI_ASCENT_ESC_IGNORE */
    if (phase === "ASCENT") return;
    if (uraiTransitionLocked && phase !== "REPLAY") return;
    setPhase((prev) => {
      const t = nowMs();

      if (prev === "REPLAY") {
        if (t - replayEnteredAt < REPLAY_DWELL_MS) {
          console.error("[URAI_CANON_BLOCKED_EXPECTED] replay dwell lock active");
          return prev;
        }
        setStartedAt(t);
        setUraiTransitionLocked(false);
      return "FOCUS";
      }

      if (prev === "FOCUS") {
        setStartedAt(t);
        return "LIFEMAP";
      }

      if (prev === "LIFEMAP") {
        setSelectedStarId(null);
        setStartedAt(t);
        setUraiTransitionLocked(false);
        return "HOME";
      }

      if (prev === "ASCENT") {
        return prev;
      }

      /* FINAL_PROOF_HOME_ESC_SILENT */
      return prev;
    });
  }, [phase, uraiTransitionLocked, replayEnteredAt]);

  
  /* URAI_DEMO_MODE_AUTORUN_V1 */
  useEffect(() => {
    if (!demoMode) return;

    const steps = [
      () => beginAscent(),
      () => openFocus("delta"),
      () => openReplay(),
      () => escapeBack(),
      () => escapeBack(),
      () => escapeBack(),
      () => {
        setDemoMode(false);
        demoStepRef.current = 0;
      },
    ];

    const delays = [900, 4700, 2400, 3000, 1900, 1900, 1400];

    const step = demoStepRef.current;
    const timer = window.setTimeout(() => {
      const run = steps[step];
      if (run) run();
      demoStepRef.current = step + 1;
    }, delays[step] ?? 1200);

    return () => window.clearTimeout(timer);
  }, [demoMode, phase, beginAscent, openFocus, openReplay, escapeBack]);

useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        escapeBack();
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [escapeBack]);

  const selectedPosition = selected
    ? ([selected.position[0], selected.position[1] + 4.8, selected.position[2] - 8.5] as [number, number, number])
    : null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#02060f",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* LAUNCH_DEMO_HINT_V1 */}
      {phase === "HOME" && !demoMode ? (
        <div
          style={{
            position: "absolute",
            top: 22,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "7px 10px",
            borderRadius: 999,
            border: "1px solid rgba(190,170,255,0.22)",
            background: "rgba(5,4,16,0.46)",
            color: "rgba(240,236,255,0.88)",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 10,
            letterSpacing: 0.08,
            pointerEvents: "none",
            backdropFilter: "blur(10px)",
            zIndex: 80
          }}
        >
          Click the orb to ascend · Choose a memory · Press ESC to unwind
        </div>
      ) : null}

      <Canvas camera={{ position: [0, 0.8, 12], fov: 40, near: 0.1, far: 260 }}>
        <Atmosphere phase={phase} emotionalModel={emotionalModel}  />

        <CameraRig
          phase={phase}
          startedAt={startedAt}
          selected={selectedPosition}
          now={now}
         />

        <HomeWorld phase={phase} now={now} startedAt={startedAt} onBeginAscent={beginAscent} emotionalModel={emotionalModel} />

        {/* TIER4_HOME_ASCENT_VISUAL_ENGINE_MOUNT_V1 */}
        <HomeVisualEngine visible={phase === "HOME" || phase === "ASCENT"}  />
        <AscentVisualEngine visible={phase === "ASCENT" || (phase === "LIFEMAP" && now - startedAt < ASCENT_LIFEMAP_HANDOFF_MS)} />

        {phase === "ASCENT" && (
          <group position={[0, 3.2, -6.8]}>
            {/* TIER2_ASCENT_BRIDGE_VEIL */}
            <mesh>
              <sphereGeometry args={[18, 64, 64]}  />
              <meshBasicMaterial color="#100722" transparent opacity={0.055} side={THREE.BackSide} depthWrite={false}  />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[5.4, 5.55, 160]}  />
              <meshBasicMaterial color="#7e58ff" transparent opacity={0.075} side={THREE.DoubleSide}  depthWrite={false}  />
            </mesh>
          </group>
        )}

        <LifeMapWorld
          phase={phase}
          startedAt={startedAt}
          now={now}
          stars={stars}
          onSelectStar={openFocus}
          emotionalModel={emotionalModel}
        />

        {/* TIER4_LIFEMAP_VISUAL_ENGINE_MOUNT_V1 */}
        <LifeMapVisualEngine visible={phase === "ASCENT" || phase === "LIFEMAP" || phase === "FOCUS" || phase === "REPLAY"} />

        <FocusWorld
          phase={phase}
          lastPhase={lastPhase}
          startedAt={startedAt}
          now={now}
          selected={selected}
          onOpenReplay={openReplay}
          emotionalModel={emotionalModel}
         />

        {/* TIER4_FOCUS_VISUAL_ENGINE_MOUNT_V1 */}
        <FocusVisualEngine visible={phase === "FOCUS"} />

        <ReplayWorld phase={phase} selected={selected} emotionalModel={emotionalModel}  />

        {/* TIER4_REPLAY_VISUAL_ENGINE_MOUNT_V1 */}
        <ReplayVisualEngine visible={phase === "REPLAY"} />

{phase === "REPLAY" && (
  <points>
    <bufferGeometry>
      <bufferAttribute
        attach="attributes-position"
        args={[
          new Float32Array(
            Array.from({ length: 300 }, (_, i) => {
              const seed = Math.sin(i * 999.123) * 43758.5453;
              const frac = seed - Math.floor(seed);
              const seed2 = Math.sin(i * 37.77) * 24634.6345;
              const frac2 = seed2 - Math.floor(seed2);
              const seed3 = Math.sin(i * 11.13) * 97531.1357;
              const frac3 = seed3 - Math.floor(seed3);
              const r = 2 + frac * 6;
              const a = frac2 * Math.PI * 2;
              const z = -frac3 * 6;
              return [Math.cos(a) * r, Math.sin(a) * r, z];
            }).flat()
          ),
          3
        ]}
       />
    </bufferGeometry>
    <pointsMaterial size={0.04} color="#bfa8ff" transparent opacity={0.4}  />
  </points>
)}
      </Canvas>
<div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "12%",
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          opacity: phase === "FOCUS" || phase === "REPLAY" || phase === "ASCENT" ? 0 : 0.42,
        }}
      >
        {/* TIER3_NARRATOR_CINEMATIC */}
        <div style={{
          maxWidth: 480,
          padding: "7px 10px",
          borderRadius: 14,
          background: "rgba(8,4,18,0.42)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(140,120,255,0.18)",
          color: "rgba(230,225,255,0.88)",
          fontSize: 10,
          letterSpacing: 0.06,
          textAlign: "center",
          lineHeight: 1.45,
        }}>
      {/* TIER4_MEANING_OVERLAY_V1 */}
      {tier4MeaningVisible && tier4MeaningLine && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: phase === "REPLAY" ? 48 : 96,
            transform: "translateX(-50%)",
            width: "min(460px, calc(100vw - 96px))",
            padding: "7px 10px",
            borderRadius: 18,
            background: "rgba(8, 6, 18, 0.24)",
            border: "1px solid rgba(210, 196, 255, 0.22)",
            color: "rgba(242, 237, 255, 0.94)",
            fontSize: 10,
            lineHeight: 1.45,
            letterSpacing: "0.01em",
            backdropFilter: "blur(14px)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.34)",
            pointerEvents: "none",
            zIndex: 45,
          }}
        >
          {tier4MeaningLine}
        </div>
      )}

          <NarratorOverlay line={narratorLine}
      />
          {/* URAI_NARRATOR_VOICE_CONTROLS_V1 */}
          <div style={{
            marginTop: 8,
            display: "flex",
            gap: 8,
            justifyContent: "center",
            pointerEvents: "auto"
          }}>
            <button
              type="button"
              onClick={() => setVoiceEnabled((v) => !v)}
              style={{
                border: "1px solid rgba(180,160,255,0.26)",
                background: voiceEnabled ? "rgba(125,90,255,0.24)" : "rgba(8,4,18,0.44)",
                color: "rgba(240,236,255,0.9)",
                borderRadius: 999,
                padding: "7px 10px",
                fontSize: 10,
                cursor: "pointer"
              }}
            >
              {voiceEnabled ? "Voice on" : "Voice off"}
            </button>

            <button
              type="button"
              onClick={() => {
                lastSpokenRef.current = "";
                speakNarrator();
              }}
              style={{
                border: "1px solid rgba(180,160,255,0.26)",
                background: "rgba(8,4,18,0.44)",
                color: "rgba(240,236,255,0.9)",
                borderRadius: 999,
                padding: "7px 10px",
                fontSize: 10,
                cursor: "pointer"
              }}
            >
              Speak
            </button>

            {/* URAI_DEMO_MODE_CONTROLS_V1 */}
            <button
              type="button"
              onClick={() => {
                if (phase !== "HOME") return;
                demoStepRef.current = 0;
                setDemoMode((v) => !v);
              }}
              style={{
                border: "1px solid rgba(180,160,255,0.26)",
                background: demoMode ? "rgba(125,90,255,0.28)" : "rgba(8,4,18,0.44)",
                color: "rgba(240,236,255,0.9)",
                borderRadius: 999,
                padding: "7px 10px",
                fontSize: 10,
                cursor: "pointer"
              }}
            >
              {demoMode ? "Demo running" : "Run demo"}
            </button>
          </div>
        </div>
      </div>
<Tier3Field phase={phase}  />
      <Tier3PresenceLayer phase={phase as any}  />

      {/* URAI_DEMO_MODE_BADGE_V1 */}
      {demoMode ? (
        <div
          style={{
            position: "absolute",
            top: 18,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "7px 10px",
            borderRadius: 999,
            border: "1px solid rgba(180,160,255,0.22)",
            background: "rgba(5,4,16,0.46)",
            color: "rgba(240,236,255,0.88)",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 10,
            letterSpacing: 0.08,
            pointerEvents: "none",
            backdropFilter: "blur(10px)"
          }}
        >
          URAI Spatial demo · {phase}
        </div>
      ) : null}

      {/* FINAL_PROOF_STATUS_BADGE_V1 */}
      {/* TIER5_PATTERN_INTELLIGENCE_BADGE */}
      <div
        style={{
          position: "absolute",
          right: 18,
          bottom: 58,
          maxWidth: 360,
          padding: "7px 10px",
          border: "1px solid rgba(180,160,255,0.22)",
          borderRadius: 10,
          background: "rgba(4,2,14,0.42)",
          color: "rgba(235,230,255,0.80)",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 10,
          lineHeight: 1.35,
          letterSpacing: 0.06,
          userSelect: "none",
          pointerEvents: "none",
          backdropFilter: "blur(10px)"
        }}
      >
        Pattern · {formatDominantArcLabel(patternInsight.dominantArc)}
        {selected ? " · Chain: " + (patternInsight.relatedTitles.join(" → ") || "isolated") : ""}
      </div>

      <div
        style={{
          position: "absolute",
          right: 18,
          bottom: 16,
          padding: "7px 10px",
          border: "1px solid rgba(180,160,255,0.24)",
          borderRadius: 10,
          background: "rgba(4,2,14,0.44)",
          color: "rgba(235,230,255,0.82)",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 10,
          letterSpacing: 0.08,
          userSelect: "none",
          pointerEvents: "none",
          backdropFilter: "blur(10px)"
        }}
      >
        Canon proof · Tier-1/2/3/4 live
      </div>

      <div
        style={{
          position: "absolute",
          left: 18,
          bottom: 16,
          padding: "7px 10px",
          border: "1px solid rgba(180,160,255,0.24)",
          borderRadius: 10,
          background: "rgba(4,2,14,0.44)",
          color: "rgba(235,230,255,0.82)",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 10,
          letterSpacing: 0.08,
          userSelect: "none",
        }}
      >
        URAI Spatial · {phase}
      </div>
      {/* TIER3_MEMORY_IDENTITY_OVERLAY */}
      <div style={{
        position: "absolute",
        left: 24,
        bottom: 24,
        maxWidth: 460,
        padding: "7px 10px",
        borderRadius: 18,
        border: "1px solid rgba(190,170,255,0.22)",
        background: "rgba(5, 7, 18, 0.54)",
        color: "rgba(244,241,255,0.92)",
        fontFamily: "Inter, system-ui, sans-serif",
        letterSpacing: "0.01em",
        backdropFilter: "blur(12px)",
        pointerEvents: "none",
        boxShadow: "0 18px 70px rgba(40,20,90,0.28)"
      }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.58, marginBottom: 6 }}>
          {phase} · Tier-3 narrator
        </div>
        <div style={{ fontSize: 10, lineHeight: 1.45 }}>
          {/* TIER3_SAFE_NARRATOR_VISIBILITY_V1 */ narratorReady ? narratorCopy : ""}
        </div>
        {selected ? (
          <div style={{ fontSize: 10, opacity: 0.66, marginTop: 8 }}>
            {selected.memoryType} · {selected.emotionalTone} · weight {selected.memoryWeight.toFixed(2)}
          </div>
        ) : null}
      </div>

    </div>
  );
}


/* URAI_FINAL_LOOP_KILL_AND_ASCENT_SMOOTH
   - Removed now-driven Tier-4 meaning state loop.
   - Restored uraiRuntimeGuard export contract.
   - Reduced Replay text dominance.
   - Smoothed ASCENT→LIFEMAP bridge.
   - Removed render-random Replay particles.
*/


/* URAI_HANDOFF_SMOOTH_UI_DECLUTTER
   Final cinematic polish:
   - Extends ASCENT→LIFEMAP handoff.
   - Uses smootherstep easing for arrival.
   - Softens final lifemap camera target.
   - Reduces narrator/meaning UI dominance during cinematic phases.
*/


/* URAI_FINAL_DECLUTTER_HANDOFF_SOFTENER
   - Extends ASCENT→LIFEMAP bridge to reduce last visible snap.
   - Softens LifeMap camera target.
   - Reduces Tier-3/Tier-4 text dominance.
   - Hides controls during ASCENT / FOCUS / REPLAY where possible.
   - No state, authority, replay logic, or narrator logic changed.
*/

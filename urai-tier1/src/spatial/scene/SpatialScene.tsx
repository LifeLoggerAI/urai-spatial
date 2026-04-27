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
import type { NarratorLine, NarratorMoment } from "@/spatial/narrator/types";
import { Tier3Field } from "@/spatial/components/Tier3Field";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useUraiXRManifest } from "@/spatial/hooks/useUraiXRManifest";
import { useUraiAgentLoop } from "@/spatial/hooks/useUraiAgentLoop";
import { ReplayVisualEngine } from "@/spatial/visual-engine/ReplayVisualEngine";
import { FocusVisualEngine } from "@/spatial/visual-engine/FocusVisualEngine";
import { LifeMapVisualEngine } from "@/spatial/visual-engine/LifeMapVisualEngine";
import { HomeVisualEngine } from "@/spatial/visual-engine/HomeVisualEngine";
import { AscentVisualEngine } from "@/spatial/visual-engine/AscentVisualEngine";
import { Tier3PresenceLayer } from "@/spatial/components/Tier3PresenceLayer";
import { useUraiPersistence } from "@/spatial/hooks/useUraiPersistence";
import type { UraiPersistenceSnapshot } from "@/lib/uraiPersistence/types";
import { useUraiAdaptiveLearning } from "@/spatial/hooks/useUraiAdaptiveLearning";
import type { UraiAdaptiveSignal } from "@/lib/uraiAdaptive/types";
import { useUraiSocialConstellation } from "@/spatial/hooks/useUraiSocialConstellation";
import type { UraiSocialConstellation } from "@/lib/uraiSocial/types";


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
const ASCENT_LIFEMAP_HANDOFF_MS = 2600;
const FOCUS_MS = 1500;
const FOCUS_ARRIVAL_SETTLE_MS = 1100;
const REPLAY_MS = 1600;
const REPLAY_PRESENCE_SETTLE_MS = 1400;
const REPLAY_DWELL_MS = 900;
/* URAI_TIER4_NARRATOR_PACING_CONSTANTS_V1 */
const URAI_NARRATOR_MIN_DWELL_MS = 1200;
const URAI_NARRATOR_REPLAY_WEIGHT_MS = 1800;

const FOCUS_REVERSE_BRIDGE_MS = 520;


/* URAI_ASCENT_LIFEMAP_HANDOFF_SMOOTHING_LOCK */
function uraiHandoffEase01(v: number) {
  const x = Math.max(0, Math.min(1, v));
  return x * x * (3 - 2 * x);
}

function uraiBlendVec3(a: any, b: any, t: number) {
  const k = uraiHandoffEase01(t);
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ] as const;
}

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

 /* URAI_TIER6_COMPANION_TYPES_V1 */
type CompanionMode = "idle" | "witness" | "guide" | "guardian" | "reflector";

type CompanionState = {
  mode: CompanionMode;
  presence: number;
  whisper: string;
  suggestedAction: "none" | "observe" | "slow_down" | "enter_focus" | "hold_replay";
  confidence: number;
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

/* URAI_TIER6_COMPANION_RESOLVER_V1 */
function resolveCompanionState(
  phase: Phase,
  selected: Star | null,
  emotionalModel: EmotionalModel,
  patternInsight: MemoryPatternInsight
): CompanionState {
  const heavy = emotionalModel.memoryWeight >= 0.72;
  const shadow = emotionalModel.tone === "shadow";
  const threshold = emotionalModel.tone === "threshold" || selected?.memoryType === "threshold";
  const recovery = selected?.memoryType === "recovery";

  const mode: CompanionMode =
    phase === "HOME" ? "idle" :
    phase === "ASCENT" ? "witness" :
    phase === "REPLAY" && (shadow || heavy) ? "guardian" :
    phase === "FOCUS" && threshold ? "guide" :
    phase === "LIFEMAP" ? "reflector" :
    "witness";

  const suggestedAction: CompanionState["suggestedAction"] =
    phase === "HOME" ? "observe" :
    phase === "ASCENT" ? "none" :
    phase === "LIFEMAP" && patternInsight.nextSuggestedFocusId ? "enter_focus" :
    phase === "FOCUS" && heavy ? "hold_replay" :
    phase === "REPLAY" && (shadow || threshold) ? "slow_down" :
    "none";

  const whisper =
    mode === "idle"
      ? "I am quiet until the map opens."
      : mode === "guardian"
        ? "I am holding the edge of this memory so it does not collapse into noise."
        : mode === "guide"
          ? "This point is behaving like a threshold. Move slowly."
          : mode === "reflector"
            ? "I can see a pattern forming between these signals."
            : recovery
              ? "This signal is not only pain. It includes return."
              : "I am tracking the field without steering it.";

  const phasePresence =
    phase === "HOME" ? 0.22 :
    phase === "ASCENT" ? 0.32 :
    phase === "LIFEMAP" ? 0.46 :
    phase === "FOCUS" ? 0.62 :
    phase === "REPLAY" ? 0.78 :
    0.3;

  return {
    mode,
    presence: clamp01(phasePresence + emotionalModel.auraIntensity * 0.18),
    whisper,
    suggestedAction,
    confidence: clamp01(0.44 + emotionalModel.memoryWeight * 0.36 + patternInsight.relatedMemoryIds.length * 0.08),
  };
}



/* URAI_TIER4_NARRATOR_LINE_OBJECT_ADAPTER_V1 */
function resolveTier4NarratorLineObject(star: Star | null, phase: Phase, emotionalModel: EmotionalModel): NarratorLine | null {
  const text =
    star && !["HOME", "ASCENT"].includes(phase as Phase)
      ? resolveTier4DynamicMeaning(star, phase, emotionalModel)
      : "";

  if (!text) return null;

  const narratorMoment: NarratorMoment =
    phase === "REPLAY" ? "replay_enter" :
    phase === "FOCUS" ? "focus_arrival" :
    "lifemap_arrival";

  const narratorTone =
    emotionalModel.tone === "threshold" ? "tension" :
    emotionalModel.tone === "shadow" ? "grief" :
    emotionalModel.tone === "bright" ? "hope" :
    emotionalModel.tone;

  return {
    id: `${phase}-${star?.id ?? "none"}-${star?.memoryType ?? "none"}`,
    moment: narratorMoment,
    text,
    tone: narratorTone,
    priority:
      phase === "REPLAY" ? 3 :
      phase === "FOCUS" ? 2 :
      1,
    delayMs:
      phase === "REPLAY" ? 900 :
      phase === "FOCUS" ? 450 :
      250,
    durationMs:
      phase === "REPLAY" ? 4200 :
      phase === "FOCUS" ? 3200 :
      2600,
  };
}

function resolveTier4DynamicMeaning(star: Star | null, phase: Phase, emotionalModel: EmotionalModel): string {
  /* URAI_TIER4_PHASE_NARRATOR_COPY_LOCK_V1 */
  if (!star) return "";

  const tone = emotionalModel.tone;
  const weight = emotionalModel.memoryWeight;

  if (phase === "LIFEMAP") {

    return "URAI is reading the wider field. " + star.title + " is visible as a " + star.memoryType + " signal inside the larger pattern.";
  }

  if (phase === "FOCUS") {
    const weightLine =
      weight >= 0.78
        ? "This memory is carrying high symbolic weight."
        : weight >= 0.52
          ? "This memory is carrying a readable emotional signal."
          : "This memory is present, but not dominating the field.";

    return star.title + " is being isolated from the LifeMap. " + weightLine + " Tone: " + tone + ".";
  }

  if (phase === "REPLAY") {
    if (star.memoryType === "threshold") {
      return star.narratorLine + " Replay is holding this as a threshold place, not a passing image.";
    }
    if (star.memoryType === "shadow") {
      return star.narratorLine + " Replay is slowing the field around the unresolved pressure.";
    }
    if (star.memoryType === "recovery") {
      return star.narratorLine + " Replay is marking the rebound and the return.";
    }
    if (star.memoryType === "relationship") {
      return star.narratorLine + " Replay is preserving the connection pattern around this memory.";
    }
    return star.narratorLine + " Replay is holding the scene long enough for the pattern to become visible.";
  }

  return "";
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
  /* URAI_TIER3_STABLE_AURA_FIELD_DENSITY_V1 */
  const phaseBase =
    phase === "REPLAY" ? 0.82 :
    phase === "FOCUS" ? 0.62 :
    phase === "LIFEMAP" ? 0.34 :
    phase === "ASCENT" ? 0.24 :
    0.16;

  const starWeight = clamp01(selected?.memoryWeight ?? 0.35);
  const starAura = clamp01(selected?.auraIntensity ?? 0.35);
  const weight = clamp01(phaseBase * 0.5 + starWeight * 0.5);

  const tone = selected?.emotionalTone ?? "neutral";

  const toneGain =
    tone === "threshold" ? 1.16 :
    tone === "shadow" ? 1.08 :
    tone === "charged" ? 1.12 :
    tone === "bright" ? 1.04 :
    tone === "calm" ? 0.92 :
    1;

  const replayGain = phase === "REPLAY" ? 1.24 : phase === "FOCUS" ? 1.06 : phase === "LIFEMAP" ? 0.72 : 0.42;

  return {
    memoryWeight: weight,
    auraIntensity: clamp01((0.24 + weight * 0.46 + starAura * 0.14) * replayGain * Math.min(toneGain, 1.08)),
    fogWeight: clamp01((0.18 + weight * 0.52) * (phase === "REPLAY" ? 1.08 : phase === "FOCUS" ? 0.76 : 0.42)),
    particleDensity: clamp01((0.20 + weight * 0.46 + starAura * 0.10) * (phase === "REPLAY" ? 1.04 : phase === "FOCUS" ? 0.80 : phase === "LIFEMAP" ? 0.56 : 0.30)),
    pulseRate:
      phase === "REPLAY" ? 0.68 + weight * 0.12 :
      phase === "FOCUS" ? 0.82 + weight * 0.14 :
      phase === "LIFEMAP" ? 0.52 + weight * 0.1 :
      0.42,
    replayStillness:
      phase === "REPLAY"
        ? clamp01(0.68 + weight * 0.20)
        : 0,
    tone,
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


  /* URAI_NO_VOID_RENDERING_LAW_V1 */
  const uraiNeverUnmountWorlds = true;

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

  /* URAI_ASCENT_FIX_V3_CAMERA_SCOPE */
  const ascentExitPosRef = useRef<THREE.Vector3 | null>(null);
  const ascentExitLookRef = useRef<THREE.Vector3 | null>(null);
  const prevPhaseRef = useRef<Phase | null>(null);
  const handoffRef = useRef(0);

  
  /* URAI_CAMERA_CONTINUITY_REFS_V1 */
  const uraiCameraContinuityRef = useRef({
    px: 0, py: 0, pz: 0,
    tx: 0, ty: 0, tz: 0,
    initialized: false,
    ascentToLifeMapBlend: 0,
    lastPhase: "",
    lx: 0, ly: 0, lz: 0,
  });
useFrame((_, delta) => {

    /* URAI_ASCENT_LIFEMAP_HANDOFF_SOFTENER_V1 */
    const uraiContinuity = uraiCameraContinuityRef.current;
    const uraiDt = typeof delta === "number" ? delta : 1 / 60;

    if (!uraiContinuity.initialized) {
      uraiContinuity.px = camera.position.x;
      uraiContinuity.py = camera.position.y;
      uraiContinuity.pz = camera.position.z;
      uraiContinuity.tx = 0;
      uraiContinuity.ty = 0;
      uraiContinuity.tz = 0;
      uraiContinuity.initialized = true;
    }

    const uraiWasAscent = uraiContinuity.lastPhase === "ASCENT";
    const uraiIsLifeMap = phase === "LIFEMAP";

    if (uraiWasAscent && uraiIsLifeMap) {
      uraiContinuity.ascentToLifeMapBlend = 0.001;
    }

    if (uraiContinuity.ascentToLifeMapBlend > 0 && uraiContinuity.ascentToLifeMapBlend < 1) {
      uraiContinuity.ascentToLifeMapBlend = uraiClamp01(
        uraiContinuity.ascentToLifeMapBlend + uraiDt * 1.85
      );

      camera.position.x = uraiDamp(camera.position.x, uraiContinuity.px, 18, uraiDt);
      camera.position.y = uraiDamp(camera.position.y, uraiContinuity.py, 18, uraiDt);
      camera.position.z = uraiDamp(camera.position.z, uraiContinuity.pz, 18, uraiDt);

      /* URAI_CAMERA_TARGET_INHERITANCE_LOCK_V1 */
      const uraiInheritedLookX = uraiContinuity.lx;
      const uraiInheritedLookY = uraiContinuity.ly;
      const uraiInheritedLookZ = uraiContinuity.lz;
      camera.lookAt(uraiInheritedLookX, uraiInheritedLookY, uraiInheritedLookZ);
    }



    const prev = prevPhaseRef.current;
    const justEnteredLifeMap = prev === "ASCENT" && phase === "LIFEMAP";

    if (phase === "ASCENT") {
      ascentExitPosRef.current = camera.position.clone();

      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);

      ascentExitLookRef.current = camera.position.clone().add(dir.multiplyScalar(10));
      handoffRef.current = 0;
    }

    if (justEnteredLifeMap && ascentExitPosRef.current && ascentExitLookRef.current) {
      camera.position.copy(ascentExitPosRef.current);
      camera.lookAt(ascentExitLookRef.current);
      handoffRef.current = 1;
    }

    prevPhaseRef.current = phase;

    const smoothedDelta = Math.min(delta, 0.032);

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
    const ascentClamped = clamp01(ascentRaw);
    const ascentSmooth = ascentClamped * ascentClamped * (3 - 2 * ascentClamped);
    const ascent = ease(ascentSmooth);

    const focus = ease(elapsed / FOCUS_MS);
    const replay = ease(elapsed / REPLAY_MS);

    const ascentEndPos = new THREE.Vector3(0, 0.9 + 12.4, 12 - 11.25);
    const ascentEndLook = new THREE.Vector3(0, 0.2 + 7.95, -8.65);

    let targetPos = new THREE.Vector3(0, 0.8, 12);
    let targetLook = new THREE.Vector3(0, 0.2, 0);

    if (phase === "HOME") {
      targetPos = new THREE.Vector3(0, 0.9, 12);
      targetLook = new THREE.Vector3(0, 0.2, 0);
    }

    if (phase === "ASCENT") {
      targetPos = new THREE.Vector3(
        0,
        0.9 + ascent * 12.4,
        12 - ascent * 11.25
      );
      targetLook = new THREE.Vector3(
        0,
        0.2 + ascent * 7.95,
        -ascent * 8.65
      );
    }

    if (phase === "LIFEMAP") {
      const handoffT = clamp01((now - startedAt) / ASCENT_LIFEMAP_HANDOFF_MS);
      const t = handoffT * handoffT * (3 - 2 * handoffT);

      const lifeMapPos = new THREE.Vector3(0, 10.72, 1.42);
      const lifeMapLook = new THREE.Vector3(0, 8.06, -8.22);

      targetPos = ascentEndPos.clone().lerp(lifeMapPos, t);
      targetLook = ascentEndLook.clone().lerp(lifeMapLook, t);
    }

    if (phase === "FOCUS" && selected) {
      const star = new THREE.Vector3(...selected);
      const focusRaw = clamp01((now - startedAt) / FOCUS_MS);
      const focusArrival = focusRaw < 0.82 ? ease(focusRaw / 0.82) : 1;
      const settleRaw = clamp01((now - startedAt - FOCUS_MS * 0.82) / FOCUS_ARRIVAL_SETTLE_MS);
      const settle = ease(settleRaw);

      const lifeMapAnchorPos = new THREE.Vector3(0, 10.72, 1.42);
      const lifeMapAnchorLook = new THREE.Vector3(0, 8.06, -8.22);

      const arrivalPos = new THREE.Vector3(star.x * 0.58, star.y + 1.52, star.z + 4.55);
      const settledPos = new THREE.Vector3(star.x * 0.52, star.y + 1.42, star.z + 4.78);
      const arrivalLook = new THREE.Vector3(star.x, star.y + 0.08, star.z);
      const settledLook = new THREE.Vector3(star.x, star.y + 0.04, star.z - 0.18);

      targetPos = lifeMapAnchorPos.clone().lerp(arrivalPos, focusArrival).lerp(settledPos, settle * 0.20);
      targetLook = lifeMapAnchorLook.clone().lerp(arrivalLook, focusArrival).lerp(settledLook, settle * 0.32);
    }

    if (phase === "REPLAY" && selected) {
      const star = new THREE.Vector3(...selected);
      const replayRaw = clamp01((now - startedAt) / REPLAY_MS);
      const replayEnter = ease(replayRaw);
      const presence = ease((now - startedAt) / REPLAY_PRESENCE_SETTLE_MS);

      const start = new THREE.Vector3(star.x * 0.52, star.y + 1.42, star.z + 4.78);
      const place = new THREE.Vector3(star.x * 0.76, star.y + 0.88, star.z + 2.42);
      const held = new THREE.Vector3(star.x * 0.72, star.y + 0.82, star.z + 2.58);

      targetPos = start.clone().lerp(place, replayEnter).lerp(held, presence * 0.22);
      targetLook = new THREE.Vector3(star.x, star.y + 0.03, star.z - 0.86);
    }

    pos.current.lerp(targetPos, 1 - Math.pow(phase === "ASCENT" || phase === "LIFEMAP" ? 0.00108 : 0.00085, smoothedDelta));
    look.current.lerp(targetLook, 1 - Math.pow(phase === "ASCENT" || phase === "LIFEMAP" ? 0.00112 : 0.0009, smoothedDelta));

    /* URAI_ELITE_CAMERA_MICRO_DRIFT_V1 */
    const microDrift =
      phase === "HOME" ? 0.006 :
      phase === "ASCENT" ? 0.012 :
      phase === "LIFEMAP" ? 0.008 :
      phase === "FOCUS" ? 0.005 :
      phase === "REPLAY" ? 0.003 :
      0;

    camera.position.copy(pos.current);
    camera.position.x += Math.sin(now * 0.00042) * microDrift;
    camera.position.y += Math.cos(now * 0.00037) * microDrift * 0.55;

    look.current.x = THREE.MathUtils.damp(look.current.x, targetLook.x, returnLookDamp, smoothedDelta);
    look.current.y = THREE.MathUtils.damp(look.current.y, targetLook.y, returnLookDamp, smoothedDelta);
    look.current.z = THREE.MathUtils.damp(look.current.z, targetLook.z, returnLookDamp, smoothedDelta);

    camera.lookAt(look.current);

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov =
        phase === "REPLAY" ? 29 :
        phase === "FOCUS" ? 34 :
        phase === "ASCENT" ? 39 :
        40;

      camera.fov += (targetFov - camera.fov) * (1 - Math.pow(0.001, smoothedDelta));
      camera.updateProjectionMatrix();

    
    /* URAI_MICRO_CAMERA_DRIFT_V1 */
    const uraiT = performance.now() / 1000;
    const uraiDriftStrength =
      phase === "HOME" ? 0.0035 :
      phase === "ASCENT" ? 0.0025 :
      phase === "LIFEMAP" ? 0.004 :
      phase === "FOCUS" ? 0.002 :
      phase === "REPLAY" ? 0.0015 :
      0;

    camera.position.x += Math.sin(uraiT * 0.23) * uraiDriftStrength;
    camera.position.y += Math.cos(uraiT * 0.19) * uraiDriftStrength * 0.45;

    /* URAI_CAMERA_CONTINUITY_CAPTURE_V1 */
    uraiContinuity.px = camera.position.x;
    uraiContinuity.py = camera.position.y;
    uraiContinuity.pz = camera.position.z;

    const uraiForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    uraiContinuity.lx = camera.position.x + uraiForward.x * 8;
    uraiContinuity.ly = camera.position.y + uraiForward.y * 8;
    uraiContinuity.lz = camera.position.z + uraiForward.z * 8;

    uraiContinuity.lastPhase = phase;
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
  patternInsight,
  activeStarId,
}: {
  phase: Phase;
  startedAt: number;
  now: number;
  stars: Star[];
  onSelectStar: (id: string) => void;
  emotionalModel: EmotionalModel;
  patternInsight: MemoryPatternInsight;
  activeStarId: string | null;
}) {
  const handoff =
    phase === "LIFEMAP"
      ? Math.min(1, (now - startedAt) / ASCENT_LIFEMAP_HANDOFF_MS)
      : 1;
  const ascentReveal = 1; // PASS1: always present, camera reveals
  const visible = phase === "ASCENT" || phase === "LIFEMAP" || phase === "FOCUS" || phase === "REPLAY";

  if (!visible) return null;

  /* URAI_TIER5_LIFEMAP_PATTERN_BINDING_V1 */
  const relatedIds = new Set(patternInsight.relatedMemoryIds);
  const suggestedId = patternInsight.nextSuggestedFocusId;
  const activeStar = activeStarId ? stars.find((star) => star.id === activeStarId) ?? null : null;
  const relatedStars = activeStar
    ? stars.filter((star) => relatedIds.has(star.id))
    : [];
  const patternLinePositions = new Float32Array(
    activeStar
      ? relatedStars.flatMap((star) => [
          activeStar.position[0],
          activeStar.position[1],
          activeStar.position[2],
          star.position[0],
          star.position[1],
          star.position[2],
        ])
      : []
  );

const opacity =
    phase === "ASCENT"
      ? 0.72
      : phase === "LIFEMAP"
        ? 1
        : phase === "FOCUS" ? 0.36
          : 0.16;


  return (
    <group
      /* TIER2_ASCENT_Z_ALIGNMENT_V1 */
      position={[
        0,
        (phase === "ASCENT" || phase === "LIFEMAP") ? (5.6 + (5.05 - 5.6) * handoff) : 5.05,
        (phase === "ASCENT" || phase === "LIFEMAP") ? (-12.3 + (-9.35 + 12.3) * handoff) : -9.35
      ]}
    >
      <mesh position={[0, 0, -18]}>
        <sphereGeometry args={[70, 64, 64]}  />
        <meshBasicMaterial color="#030812" side={THREE.BackSide} depthWrite={false}  />
      </mesh>

      {stars.map((star) => {
        const profile = memoryVisualProfile(star);
        /* URAI_TIER5_STAR_PATTERN_WEIGHTING_V1 */
        const isPatternRelated = relatedIds.has(star.id);
        const isSuggestedNext = suggestedId === star.id;
        const tier5PatternBoost = isSuggestedNext ? 1.22 : isPatternRelated ? 1.14 : 1;
        /* URAI_TIER3_STABLE_STARFIELD_BINDING_V1 */
        const starToneGain =
          star.emotionalTone === "threshold" ? 1.14 :
          star.emotionalTone === "shadow" ? 0.86 :
          star.emotionalTone === "charged" ? 1.08 :
          star.emotionalTone === "bright" ? 1.1 :
          star.emotionalTone === "calm" ? 0.94 :
          1;

        const starGlow =
          (((phase === "LIFEMAP" ? 1.34 : 0.5) * profile.glow * starToneGain * tier5PatternBoost)) +
          emotionalModel.auraIntensity * (0.32 + star.memoryWeight * 0.46);
const starAura =
          opacity *
          (0.08 + star.auraIntensity * 0.18 + emotionalModel.particleDensity * 0.08) *
          profile.aura *
          starToneGain *
          tier5PatternBoost;
        const starScale =
          star.scale *
          (1 + star.auraIntensity * 0.11 * profile.aura + emotionalModel.memoryWeight * 0.025);

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

          {/* URAI_TIER5_SUGGESTED_NEXT_RING_V1 */}
          {isSuggestedNext && phase === "LIFEMAP" && (
            <mesh rotation={[0, 0, 0]}>
              <ringGeometry args={[star.scale * 2.55, star.scale * 2.76, 96]} />
              <meshBasicMaterial
                color="#e7ddff"
                transparent
                opacity={0.20 + emotionalModel.memoryWeight * 0.12}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
        );
      })}

      {/* URAI_TIER5_CONSTELLATION_RELATION_LINES_V1 */}
      {phase === "LIFEMAP" && patternLinePositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[patternLinePositions, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#bca7ff"
            transparent
            opacity={0.22 + emotionalModel.memoryWeight * 0.16}
            depthWrite={false}
          />
        </lineSegments>
      )}

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
                  return [Math.sin(a) * r, Math.cos(a * 0.7) * r * 0.20, z];
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

/* URAI_FOCUS_REPLAY_PRESENCE_FIX */
const replayPresence = replay ? 1 : 0;

  const p = selected.position;
  const profile = memoryVisualProfile(selected);
  /* URAI_FOCUS_VISUAL_SETTLE_LOCK_V1 */
  const focusSettle = phase === "FOCUS" ? ease((now - startedAt) / FOCUS_ARRIVAL_SETTLE_MS) : 1;
  const pulse = 1 + Math.sin(now * 0.0016 * emotionalModel.pulseRate) * 0.012 * profile.pulse * focusSettle;
  const coreScale =
    (replay ? 0.21 : 0.29) *
    pulse *
    (1 + emotionalModel.memoryWeight * 0.055) *
    (phase === "FOCUS" ? 0.96 + focusSettle * 0.04 : 1);
  const auraScale = Math.min((1 + emotionalModel.auraIntensity * 0.22 * focusSettle) * profile.aura, phase === "REPLAY" ? 1.22 : 1.6);
  /* URAI_TIER3_STABLE_FOCUS_FIELD_BINDING_V1 */
  const fieldOpacity = replay
    ? 0.055 + emotionalModel.particleDensity * 0.13 + emotionalModel.memoryWeight * 0.035
    : 0.135 + emotionalModel.particleDensity * 0.18 + emotionalModel.auraIntensity * 0.055;
  const auraOpacity = replay
    ? 0.035 + emotionalModel.auraIntensity * 0.055 + emotionalModel.memoryWeight * 0.028
    : 0.075 + emotionalModel.auraIntensity * 0.105 + emotionalModel.memoryWeight * 0.038;

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
        <meshBasicMaterial color="#d7ccff" transparent opacity={(bridgeOpacity * (replay ? 0.08 : 0.18)) * (0.86 + replayPresence * 0.22)} side={THREE.DoubleSide}  depthWrite={false}  />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.45, 2.52, 128]}  />
        <meshBasicMaterial color="#7e58ff" transparent opacity={(bridgeOpacity * (replay ? 0.045 : 0.105)) * (0.86 + replayPresence * 0.22)} side={THREE.DoubleSide}  depthWrite={false}  />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.85, 2.92, 128]}  />
        <meshBasicMaterial color="#4d2bb4" transparent opacity={(bridgeOpacity * (replay ? 0.035 : 0.075)) * (0.86 + replayPresence * 0.22)} side={THREE.DoubleSide}  depthWrite={false}  />
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
        <meshBasicMaterial color={selected.memoryType === "shadow" ? "#241433" : selected.memoryType === "recovery" ? "#6f58ff" : "#4d2bb4"} transparent opacity={(bridgeOpacity * (replay ? 0.045 : 0.085) * profile.glow) * (0.86 + replayPresence * 0.22)} side={THREE.BackSide} depthWrite={false}  />
      </mesh>)}

      {phase !== "REPLAY" && (<mesh>
        <sphereGeometry args={[3.9, 64, 64]}  />
        <meshBasicMaterial color="#16082f" transparent opacity={(bridgeOpacity * (replay ? 0.07 : 0.045)) * (0.86 + replayPresence * 0.22)} side={THREE.BackSide} depthWrite={false}  />
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
/* URAI_REPLAY_ENCLOSURE_LOCAL_FALLBACK_V1 */

  if (phase !== "REPLAY" || !selected) return null;

  const p = selected.position;
  const profile = memoryVisualProfile(selected);
  const stillness = emotionalModel.replayStillness;
  /* URAI_REPLAY_ENCLOSURE_WEIGHT_LOCK_V1 */
  
  return (
    <group position={[p[0], p[1] + 4.8, p[2] - 8.5]} scale={1}>
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

/* URAI_TIER6_COMPANION_VISUAL_V1 */
function CompanionVisual({
  phase,
  now,
  selected,
  companionState,
}: {
  phase: Phase;
  now: number;
  selected: Star | null;
  companionState: CompanionState;
}) {
  if (companionState.presence <= 0.05) return null;

  const selectedPos = selected?.position ?? [0, 0, 0];
  const phaseY =
    phase === "HOME" ? 1.0 :
    phase === "ASCENT" ? 4.4 :
    phase === "LIFEMAP" ? 6.4 :
    phase === "FOCUS" ? selectedPos[1] + 5.8 :
    phase === "REPLAY" ? selectedPos[1] + 5.6 :
    1.0;

  const phaseZ =
    phase === "HOME" ? 2.8 :
    phase === "ASCENT" ? -2.4 :
    phase === "LIFEMAP" ? -8.2 :
    phase === "FOCUS" ? selectedPos[2] - 6.8 :
    phase === "REPLAY" ? selectedPos[2] - 7.2 :
    2.8;

  const phaseX =
    phase === "FOCUS" || phase === "REPLAY"
      ? selectedPos[0] + 1.15
      : 1.8;

  const pulse = 1 + Math.sin(now * 0.0014) * 0.035;
  const scale = (0.18 + companionState.presence * 0.16) * pulse;

  return (
    <group position={[phaseX, phaseY, phaseZ]}>
      <mesh>
        <sphereGeometry args={[scale, 32, 32]} />
        <meshBasicMaterial
          color={
            companionState.mode === "guardian" ? "#d8ccff" :
            companionState.mode === "guide" ? "#c5a6ff" :
            companionState.mode === "reflector" ? "#9fc7ff" :
            "#bda8ff"
          }
          transparent
          opacity={0.20 + companionState.presence * 0.28}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[scale * 2.8, 32, 32]} />
        <meshBasicMaterial
          color="#8060ff"
          transparent
          opacity={0.035 + companionState.presence * 0.045}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* URAI_TIER9_SOCIAL_VISUAL_V1 */
function SocialConstellationVisual({
  phase,
  socialConstellation,
}: {
  phase: Phase;
  socialConstellation: UraiSocialConstellation;
}) {
  if (phase !== "LIFEMAP") return null;

  const nodeById = new Map(socialConstellation.nodes.map((node) => [node.id, node]));
  const edgePositions = new Float32Array(
    socialConstellation.edges.flatMap((edge) => {
      const from = nodeById.get(edge.fromId);
      const to = nodeById.get(edge.toId);
      if (!from || !to) return [];
      return [
        from.position[0],
        from.position[1] + 7.6,
        from.position[2] - 3.8,
        to.position[0],
        to.position[1] + 7.6,
        to.position[2] - 3.8,
      ];
    })
  );

  return (
    <group>
      {edgePositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#86b7ff" transparent opacity={0.18} depthWrite={false} />
        </lineSegments>
      )}

      {socialConstellation.nodes.map((node) => {
        const isSuggested = node.id === socialConstellation.suggestedSocialFocusId;
        const scale = 0.09 + node.weight * 0.13;
        const opacity = 0.18 + node.trustSignal * 0.24;

        return (
          <group key={node.id} position={[node.position[0], node.position[1] + 7.6, node.position[2] - 3.8]}>
            <mesh>
              <sphereGeometry args={[scale, 24, 24]} />
              <meshBasicMaterial
                color={
                  node.role === "ghost" ? "#7f8aa8" :
                  node.role === "challenger" ? "#ff92ac" :
                  node.role === "anchor" ? "#9fffd0" :
                  node.role === "mirror" ? "#9fc7ff" :
                  "#ffffff"
                }
                transparent
                opacity={opacity}
                depthWrite={false}
              />
            </mesh>

            {isSuggested && (
              <mesh>
                <ringGeometry args={[scale * 2.4, scale * 2.75, 64]} />
                <meshBasicMaterial
                  color="#dbeafe"
                  transparent
                  opacity={0.22}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
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
      <color
        attach="background"
        args={[
          phase === "HOME" ? "#070111" :
          phase === "ASCENT" ? "#030818" :
          phase === "LIFEMAP" ? "#020814" :
          phase === "FOCUS" ? "#030512" :
          phase === "REPLAY" ? "#000105" :
          "#020711"
        ]}
      />
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
            ? Math.max(0.82, 1.65 - emotionalModel.fogWeight * 0.92 + emotionalModel.auraIntensity * 0.20)
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


/* URAI_VISUAL_UNBREAKABLE_PASS_01 */
function uraiClamp01(v) {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

function uraiDamp(current, target, lambda, dt) {
  const t = 1 - Math.exp(-Math.max(0.0001, lambda) * Math.max(0.0001, dt));
  return current + (target - current) * t;
}

function uraiSoftPhaseWeight(active, strength = 1) {
  return active ? strength : 0;
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

  /* URAI_TIER4_NARRATOR_INTEGRITY_LOCK_V1 */
  const tier4NarratorKeyRef = useRef<string>("");
  const tier4NarratorTimerRef = useRef<number | null>(null);
  const [tier4NarratorLine, setTier4NarratorLine] = useState<NarratorLine | null>(null);

  /* URAI_TIER3_INTERPOLATION_SCOPE_FIX_V1 */
  const uraiTier3SmoothRef = useRef({
    auraIntensity: 0,
    particleDensity: 0,
    focusPresence: 0,
    replayDensity: 0,
    breathRate: 0,
    glow: 0,
  });
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

  /* URAI_TIER4_NARRATOR_DEBOUNCE_EFFECT_V1 */
  useEffect(() => {
    const line = resolveTier4NarratorLineObject(selected, phase, emotionalModel);
    const key = line ? line.id + ":" + line.moment + ":" + phase : "none:" + phase;

    if (tier4NarratorKeyRef.current === key) return;
    tier4NarratorKeyRef.current = key;

    if (tier4NarratorTimerRef.current !== null) {
      window.clearTimeout(tier4NarratorTimerRef.current);
      tier4NarratorTimerRef.current = null;
    }

    if (!line) {
      setTier4NarratorLine(null);
      return;
    }

    tier4NarratorTimerRef.current = window.setTimeout(() => {
      setTier4NarratorLine(line);
      tier4NarratorTimerRef.current = null;
    }, Math.max(0, line.delayMs ?? 0));

    return () => {
      if (tier4NarratorTimerRef.current !== null) {
        window.clearTimeout(tier4NarratorTimerRef.current);
        tier4NarratorTimerRef.current = null;
      }
    };
  }, [phase, selected?.id, emotionalModel.memoryWeight, emotionalModel.auraIntensity, emotionalModel.tone]);
}, [phase, selected]);

const patternInsight = useMemo(() => {
  return inferMemoryPattern(stars, selected);
}, [stars, selected]);

  /* URAI_TIER6_COMPANION_STATE_BINDING_V1 */
  const companionState = useMemo(() => {
    return resolveCompanionState(phase, selected, emotionalModel, patternInsight);
  }, [phase, selected, emotionalModel, patternInsight]);

  /* URAI_TIER9_SOCIAL_STATE_BINDING_V1 */
  const socialConstellation = useUraiSocialConstellation(now);

  /* URAI_TIER8_ADAPTIVE_SIGNAL_V1 */
  const tier8Signal = useMemo<UraiAdaptiveSignal>(() => {
    return {
      phase,
      selectedMemoryType: selected?.memoryType ?? null,
      selectedTone: selected?.emotionalTone ?? null,
      dominantArc: patternInsight.dominantArc,
      companionMode: companionState.mode,
      companionAction: companionState.suggestedAction,
      memoryWeight: emotionalModel.memoryWeight,
      auraIntensity: emotionalModel.auraIntensity,
      timestamp: nowMs(),
    };
  }, [
    phase,
    selected,
    patternInsight.dominantArc,
    companionState.mode,
    companionState.suggestedAction,
    emotionalModel.memoryWeight,
    emotionalModel.auraIntensity,
  ]);

  /* URAI_TIER8_ADAPTIVE_LEARNING_HOOK_V1 */
  const adaptiveOutput = useUraiAdaptiveLearning({
    signal: tier8Signal,
    enabled: true,
    debounceMs: 1100,
  });

  /* URAI_TIER7_PERSISTENCE_SNAPSHOT_V1 */
  const tier7Snapshot = useMemo<UraiPersistenceSnapshot>(() => {
    const t = nowMs();

    return {
      version: 1,
      session: {
        sessionId: "local-demo-session",
        phase,
        selectedStarId,
        lastPhase,
        replayEnteredAt,
        updatedAt: t,
      },
      memories: stars.map((star) => ({
        id: star.id,
        title: star.title,
        memoryType: star.memoryType,
        emotionalTone: star.emotionalTone,
        memoryWeight: star.memoryWeight,
        auraIntensity: star.auraIntensity,
        position: star.position,
        updatedAt: t,
      })),
      pattern: {
        dominantArc: patternInsight.dominantArc,
        relatedMemoryIds: patternInsight.relatedMemoryIds,
        relatedTitles: patternInsight.relatedTitles,
        nextSuggestedFocusId: patternInsight.nextSuggestedFocusId,
        chainLine: patternInsight.chainLine,
        systemInsight: patternInsight.systemInsight,
        updatedAt: t,
      },
      /* URAI_TIER9_PERSISTENCE_BINDING_V1 */
      companion: {
        mode: companionState.mode,
        presence: clamp01(companionState.presence * adaptiveOutput.companionPresenceMultiplier),
        suggestedAction: companionState.suggestedAction,
        confidence: companionState.confidence,
        whisper: companionState.whisper,
        updatedAt: t,
      },
    };
  }, [
    phase,
    selectedStarId,
    lastPhase,
    replayEnteredAt,
    stars,
    patternInsight,
    companionState,
  ]);

  /* URAI_TIER7_LOCAL_PERSISTENCE_HOOK_V1 */
  useUraiPersistence({
    snapshot: tier7Snapshot,
    enabled: true,
    debounceMs: 500,
  });

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
    }, phase === "REPLAY" ? 1250 : phase === "FOCUS" ? 760 : 520);

    const hideTimer = window.setTimeout(() => {
      setTier4MeaningVisible((prev) => (prev ? false : prev));
    }, phase === "REPLAY" ? 6400 : phase === "FOCUS" ? 4400 : 3600);

    
  /* URAI_SAFE_TIER3_LOCK_V2 */
  const uraiSafeClamp = (v: number, min = 0, max = 1) =>
    Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

  const uraiSelectedAny = selected as any;

  const uraiMemoryWeight =
    Number(
      uraiSelectedAny?.memoryWeight ??
      uraiSelectedAny?.intensity ??
      uraiSelectedAny?.weight ??
      0.55
    ) || 0.55;

  const uraiEmotionalPhaseGain =
    phase === "REPLAY" ? 1 :
    phase === "FOCUS" ? 0.82 :
    phase === "LIFEMAP" ? 0.62 :
    phase === "ASCENT" ? 0.38 :
    0.18;

  const uraiTier3RawState = {
    phase,
    activeMemoryId: uraiSelectedAny?.id ?? selectedStarId ?? null,
    tone: uraiSelectedAny?.tone ?? uraiSelectedAny?.emotionalTone ?? "neutral",
    symbolicWeight: uraiSelectedAny?.symbolicWeight ?? "medium",
    auraColor: uraiSelectedAny?.auraColor ?? uraiSelectedAny?.color ?? "#9fb7ff",
    auraIntensity: uraiSafeClamp(uraiMemoryWeight * uraiEmotionalPhaseGain, 0.08, 1),
    replayDensity: uraiSafeClamp(
      phase === "REPLAY" ? 0.72 + uraiMemoryWeight * 0.20 :
      phase === "FOCUS" ? 0.38 + uraiMemoryWeight * 0.22 :
      0.12 + uraiMemoryWeight * 0.12,
      0,
      1
    ),
    breathPulse: 1,
  };

  const uraiTier3Smooth = uraiTier3SmoothRef.current;
  uraiTier3Smooth.auraIntensity = uraiDamp(uraiTier3Smooth.auraIntensity, uraiTier3RawState.auraIntensity ?? 0, 7.5, 1 / 60);
  uraiTier3Smooth.particleDensity = uraiDamp(uraiTier3Smooth.particleDensity, (uraiTier3RawState as any).particleDensity ?? 0, 7.5, 1 / 60);
  uraiTier3Smooth.focusPresence = uraiDamp(uraiTier3Smooth.focusPresence, (uraiTier3RawState as any).focusPresence ?? 0, 7.5, 1 / 60);
  uraiTier3Smooth.replayDensity = uraiDamp(uraiTier3Smooth.replayDensity, uraiTier3RawState.replayDensity ?? 0, 7.5, 1 / 60);
  uraiTier3Smooth.breathRate = uraiDamp(uraiTier3Smooth.breathRate, (uraiTier3RawState as any).breathRate ?? ((uraiTier3RawState as any).breathPulse ?? 0), 7.5, 1 / 60);
  uraiTier3Smooth.glow = uraiDamp(uraiTier3Smooth.glow, (uraiTier3RawState as any).glow ?? ((uraiTier3RawState as any).auraIntensity ?? 0), 7.5, 1 / 60);

  const uraiTier3EmotionalState = {
    ...uraiTier3RawState,
    auraIntensity: uraiTier3Smooth.auraIntensity,
    particleDensity: uraiTier3Smooth.particleDensity,
    focusPresence: uraiTier3Smooth.focusPresence,
    replayDensity: uraiTier3Smooth.replayDensity,
    breathRate: uraiTier3Smooth.breathRate,
    glow: uraiTier3Smooth.glow,
  };

return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hideTimer);
    };
  }, [
    phase,
    selectedStarId,
    emotionalModel.memoryWeight,
    emotionalModel.replayStillness,
    emotionalModel.tone,
    patternInsight.dominantArc,
    patternInsight.systemInsight,
    patternInsight.chainLine,
    companionState.suggestedAction,
    companionState.whisper,
    socialConstellation.systemInsight,
  ]);

  /* TIER4_NARRATOR_HOOK_SAFE_SCOPE */
  const narratorLine = useSpatialNarrator({
    phase,
    emotionalState: {
      phase,
      activeMemoryId: selectedStarId ?? null,
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

    /* URAI_TIER5_NARRATOR_NEXT_PATH_BINDING_V1 */
    const nextSuggestedTitle =
      patternInsight.nextSuggestedFocusId
        ? stars.find((star) => star.id === patternInsight.nextSuggestedFocusId)?.title ?? ""
        : "";
    const nextPathLine = nextSuggestedTitle
      ? " Suggested next signal: " + nextSuggestedTitle + "."
      : "";

    /* URAI_TIER6_COMPANION_NARRATOR_BINDING_V1 */
    const companionLine =
      companionState.suggestedAction !== "none"
        ? " Companion: " + companionState.whisper
        : "";

    /* URAI_TIER8_NARRATOR_ADAPTIVE_LINE_V1 */
    const adaptiveLine =
      adaptiveOutput.profile.totalSignals >= 3
        ? " " + adaptiveOutput.adaptiveLine
        : "";

    /* URAI_TIER9_NARRATOR_SOCIAL_BINDING_V1 */
    const socialLine =
      phase === "LIFEMAP"
        ? " Social field: " + socialConstellation.systemInsight
        : "";

    if (phase === "HOME") {
      return "URAI Spatial is idle. The surface is stable. The life-map is waiting behind the sky.";
    }

    if (phase === "ASCENT") {
      return "Ascending. The surface is falling away while memory space comes into view.";
    }

    if (phase === "LIFEMAP") {
      return selected
        ? "Selected: " + selected.title + ". Signal weight: " + memoryWeightLabel + ". Tone: " + toneLabel + ". Dominant arc: " + arcLabel + ". " + chainLabel
        : "LifeMap open. Dominant arc: " + arcLabel + "." + nextPathLine + companionLine + adaptiveLine + socialLine + " Choose a memory star to enter focus.";
    }

    if (phase === "FOCUS") {
      return selected
        ? "Focus locked: " + selected.title + ". This is a " + memoryWeightLabel + " memory carrying " + toneLabel + ". Dominant arc: " + arcLabel + ". " + chainLabel + nextPathLine + companionLine + adaptiveLine + socialLine + companionLine + " " + selected.narratorLine
        : "Focus requires a selected memory.";
    }

    if (phase === "REPLAY") {
      return selected
        ? "Replay active: " + selected.title + ". " + holdLabel + " " + chainLabel + nextPathLine + companionLine + adaptiveLine + socialLine + companionLine
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

  /* URAI_TIER4_STABILIZED_NARRATOR_COPY_V1 */
  const stabilizedNarratorCopy = useMemo(() => {
    if (!narratorReady) return "";
    if (phase === "ASCENT") return "";
    if (phase === "HOME") return narratorCopy;
    if ((phase === "FOCUS" || phase === "REPLAY") && !selected) return "";
    return narratorCopy;
  }, [narratorReady, narratorCopy, phase, selected]);

  /* URAI_NARRATOR_VOICE_PRODUCTION_V2 */
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  /* URAI_TIER11_XR_MANIFEST_BINDING_V3 */
  const xrLayer = useUraiXRManifest({
    phase,
    selectedMemoryId: selected?.id ?? null,
    selectedMemoryTitle: selected?.title ?? null,
    selectedMemoryPosition: selected?.position ?? null,
  });

  const exportTier11XRManifest = useCallback(() => {
    if (typeof window === "undefined") return;
    const blob = new Blob([JSON.stringify(xrLayer.manifest, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "urai-xr-manifest-" + Date.now() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }, [xrLayer.manifest]);

  /* URAI_TIER12_AGENT_LOOP_BINDING_V2 */
  const agentLoop = useUraiAgentLoop({
    phase,
    selectedMemoryId: selected?.id ?? null,
    memoryWeight: emotionalModel.memoryWeight,
    dominantArc: patternInsight.dominantArc,
    nextSuggestedFocusId: patternInsight.nextSuggestedFocusId,
    companionAction: companionState.suggestedAction,
    companionWhisper: companionState.whisper,
    xrReady: xrLayer.mode === "xr_ready",
  });
  /* URAI_DEMO_MODE_STATE_V1 */
  const [demoMode, setDemoMode] = useState(false);
  /* URAI_FINAL_UI_DECLUTTER_STATE_V1 */
  const [launchPolishMode, setLaunchPolishMode] = useState(true);
  const demoStepRef = useRef(0);
  const lastSpokenRef = useRef("");
  const tier4MeaningLastKeyRef = useRef("");
  const tier4MeaningLastAtRef = useRef(0);
  /* URAI_VOICE_DIRECTION_REF_V1 */
  const voiceLastPhaseRef = useRef<Phase>("HOME");

  /* URAI_ELITE_AUDIO_LAYER_V1 */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const AudioCtx =
      (window as any).AudioContext ||
      (window as any).webkitAudioContext;

    if (!AudioCtx) return;

    let ctx: AudioContext | null = null;
    let osc: OscillatorNode | null = null;
    let gain: GainNode | null = null;

    const start = () => {
      try {
        ctx = new AudioCtx();
        osc = ctx.createOscillator();
        gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.value =
          phase === "REPLAY" ? 96 :
          phase === "FOCUS" ? 128 :
          phase === "LIFEMAP" ? 156 :
          phase === "ASCENT" ? 184 :
          112;

        gain.gain.value =
          phase === "HOME" ? 0 :
          phase === "ASCENT" ? 0.007 :
          phase === "LIFEMAP" ? 0.006 :
          phase === "FOCUS" ? 0.005 :
          phase === "REPLAY" ? 0.009 :
          0;

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
      } catch {
        // no-op
      }
    };

    const timer = window.setTimeout(start, 80);

    return () => {
      window.clearTimeout(timer);
      try {
        osc?.stop();
        osc?.disconnect();
        gain?.disconnect();
        ctx?.close();
      } catch {
        // no-op
      }
    };
  }, [phase]);

  const speakNarrator = useCallback(() => {
    if (!stabilizedNarratorCopy.trim()) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(stabilizedNarratorCopy);
    /* URAI_TIER8_VOICE_TEMPO_BINDING_V1 */
    utterance.rate = (phase === "REPLAY" ? 0.82 : phase === "ASCENT" ? 0.92 : 0.88) / adaptiveOutput.narratorTempoMultiplier;
    utterance.pitch = phase === "REPLAY" ? 0.82 : phase === "FOCUS" ? 0.94 : 1.0;
    utterance.volume = 0.88;

    window.speechSynthesis.speak(utterance);
  }, [stabilizedNarratorCopy, phase, adaptiveOutput.narratorTempoMultiplier]);

  useEffect(() => {
    if (!voiceEnabled) return;
    if (!narratorReady) return;
    if (!stabilizedNarratorCopy.trim()) return;

    const from = voiceLastPhaseRef.current;
    const forward = isForwardPhaseMove(from, phase);
    const firstHomeSpeak = from === phase && phase === "HOME" && lastSpokenRef.current === "";

    if (!forward && !firstHomeSpeak) return;

    const speakKey = phase + "::" + stabilizedNarratorCopy;
    if (lastSpokenRef.current === speakKey) return;

    const timer = window.setTimeout(() => {
      lastSpokenRef.current = speakKey;
      voiceLastPhaseRef.current = phase;
      speakNarrator();
    }, phase === "REPLAY" ? 520 : phase === "FOCUS" ? 320 : 140);

    return () => window.clearTimeout(timer);
  }, [voiceEnabled, narratorReady, stabilizedNarratorCopy, phase, speakNarrator]);


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

  /* URAI_FINAL_UI_DECLUTTER_V1 */
  const cinematicActive =
    demoMode ||
    phase === "ASCENT" ||
    phase === "FOCUS" ||
    phase === "REPLAY";

  const cinematicUiStyle: React.CSSProperties = {
    opacity: cinematicActive ? 0 : 1,
    pointerEvents: cinematicActive ? "none" : "auto",
    transition: "opacity 420ms ease",
  };

  const cinematicSoftUiStyle: React.CSSProperties = {
    opacity: cinematicActive ? 0.28 : 1,
    transition: "opacity 420ms ease",
  };

  const selectedPosition = selected
    ? ([selected.position[0], selected.position[1] + 4.8, selected.position[2] - 8.5] as [number, number, number])
    : null;

  return (
    <div
      /* URAI_FINAL_UI_DECLUTTER_CLASS_V1 */
      className={launchPolishMode ? "urai-launch-polish" : undefined}
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
      {phase === "HOME" && !demoMode && !cinematicActive ? (
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

      {phase === "ASCENT" && (
        <div
          /* URAI_ELITE_ASCENT_MOTION_BLUR_V1 */
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 6,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 50% 42%, rgba(190,170,255,0.045), rgba(40,20,90,0.025) 38%, rgba(0,0,0,0) 72%)",
            backdropFilter: "blur(0.8px)",
            opacity: 0.42,
            transition: "opacity 260ms ease",
          }}
        />
      )}

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
        <AscentVisualEngine visible={phase === "ASCENT" || (phase === "LIFEMAP" && 0 < ASCENT_LIFEMAP_HANDOFF_MS)} />

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
        patternInsight={patternInsight}
        activeStarId={selectedStarId}
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

      {/* URAI_TIER11_XR_UI_V3 */}
        <button
          type="button"
          onClick={xrLayer.cycleMode}
          style={{
            position: "fixed",
            left: 18,
            bottom: 100,
            zIndex: 40,
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(8,6,18,0.42)",
            color: "rgba(255,255,255,0.72)",
            fontSize: 12,
            letterSpacing: "0.04em",
          }}
        >
          XR mode: {xrLayer.mode}
        </button>

        <button
          type="button"
          onClick={exportTier11XRManifest}
          style={{
            position: "fixed",
            left: 18,
            bottom: 140,
            zIndex: 40,
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(8,6,18,0.42)",
            color: "rgba(255,255,255,0.72)",
            fontSize: 12,
            letterSpacing: "0.04em",
          }}
        >
          Export XR manifest
        </button>

      {/* URAI_TIER12_AGENT_UI_V2 */}
        <div
          style={{
            position: "fixed",
            right: 18,
            top: 18,
            zIndex: 45,
            maxWidth: 360,
            padding: "10px 12px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(8,6,18,0.42)",
            color: "rgba(255,255,255,0.72)",
            fontSize: 12,
            lineHeight: 1.35,
            letterSpacing: "0.02em",
            backdropFilter: "blur(16px)",
            pointerEvents: "none",
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.88)", marginBottom: 4 }}>
            Agent Loop · {agentLoop.plan.intent}
          </div>
          <div>{agentLoop.plan.reason}</div>
        </div>

      {/* URAI_FINAL_UI_DECLUTTER_STYLE_V1 */}
      <style jsx global>{`
        .urai-launch-polish button {
          opacity: 0.58;
          transform: scale(0.94);
          backdrop-filter: blur(16px);
          transition: opacity 180ms ease, transform 180ms ease;
        }

        .urai-launch-polish button:hover {
          opacity: 0.92;
          transform: scale(1);
        }

        .urai-launch-polish [data-debug],
        .urai-launch-polish .debug,
        .urai-launch-polish .dev-debug,
        .urai-launch-polish pre {
          display: none !important;
        }

        .urai-launch-polish .narrator,
        .urai-launch-polish [data-narrator],
        .urai-launch-polish [class*="Narrator"] {
          max-width: 760px;
          opacity: 0.88;
          text-shadow: 0 10px 40px rgba(0,0,0,0.48);
        }

        .urai-launch-polish canvas {
          outline: none;
        }
      `}</style>
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
            bottom: phase === "REPLAY" ? 34 : 88,
            transform: "translateX(-50%)",
            width: "min(460px, calc(100vw - 96px))",
            padding: "7px 10px",
            borderRadius: 18,
            background: "rgba(8, 6, 18, 0.18)",
            border: "1px solid rgba(210, 196, 255, 0.10)",
            color: "rgba(242, 237, 255, 0.68)",
            fontSize: 10,
            lineHeight: 1.45,
            letterSpacing: "0.01em",
            backdropFilter: "blur(14px)",
            boxShadow: "0 10px 38px rgba(0,0,0,0.18)",
            pointerEvents: "none",
            zIndex: 35,
          }}
        >
          {tier4MeaningLine}
        </div>
      )}

          <div style={cinematicSoftUiStyle}><NarratorOverlay line={tier4NarratorLine} /></div>
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

        /* URAI_FINAL_UI_DECLUTTER_TOGGLE_V1 */
        <button
          type="button"
          onClick={() => setLaunchPolishMode((v) => !v)}
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 40,
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(8,6,18,0.42)",
            color: "rgba(255,255,255,0.72)",
            fontSize: 12,
            letterSpacing: "0.04em",
          }}
        >
          {launchPolishMode ? "Launch polish on" : "Launch polish off"}
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


/* URAI_FINAL_PRESENTATION_CLEANUP_LOCK
   Final presentation cleanup:
   - softens Tier-4 text dominance
   - reduces replay UI feel
   - preserves engine, state, camera, replay, and narrator logic
*/


/* URAI_FINAL_ASCENT_LIFEMAP_NO_SNAP_LOCK
   Final handoff correction:
   - keeps LifeMap closer to Ascent end target
   - lengthens transition bridge
   - prevents full target snap on first LIFEMAP frame
   - moves starfield target less aggressively
   - does not touch state, narrator, replay, or authority
*/

"use client";
import SpatialCuratedDeckVaultBootstrap from "@/spatial/curation/SpatialCuratedDeckVaultBootstrap";
import SpatialStoryBundleVaultBootstrap from "@/spatial/vault/SpatialStoryBundleVaultBootstrap";
import SpatialSeasonalArcBootstrap from "@/spatial/seasonal/SpatialSeasonalArcBootstrap";
import SpatialArcBootstrap from "@/spatial/arcs/SpatialArcBootstrap";
import SpatialLensBootstrap from "@/spatial/lenses/SpatialLensBootstrap";
import SpatialCompareBootstrap from "@/spatial/compare/SpatialCompareBootstrap";
import SpatialAccountBootstrap from "@/spatial/account/SpatialAccountBootstrap";
import SpatialReleaseBootstrap from "@/spatial/release/SpatialReleaseBootstrap";
import SpatialSettingsBootstrap from "@/spatial/settings/SpatialSettingsBootstrap";
import SpatialAnalyticsBridge from "@/spatial/telemetry/SpatialAnalyticsBridge";
import SpatialPersistenceBridge from "@/spatial/persistence/SpatialPersistenceBridge";
import XrLocomotionRuntime from "@/spatial/xr/XrLocomotionRuntime";
import UnityRuntimePayloadBridge from "@/spatial/unity/UnityRuntimePayloadBridge";
import ArPlaneMarker from "@/spatial/xr/ArPlaneMarker";
import ArHitTestBridge from "@/spatial/xr/ArHitTestBridge";

import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { toCanonicalSelectedStar } from "../lib/toCanonicalSelectedStar";
import { SpatialStar } from "../data/stars";
import { SceneMode, useSceneStore } from "../state/sceneStore";
import CinematicReplayOverlay from "@/spatial/cinematic/CinematicReplayOverlay";
import LifeMapIntelligenceOverlay from "@/spatial/intelligence/LifeMapIntelligenceOverlay";
import XRBridgeOverlay from "@/spatial/xr/XRBridgeOverlay";
import ImmersiveContractOverlay from "@/spatial/immersive/ImmersiveContractOverlay";
import SceneExportOverlay from "@/spatial/export/SceneExportOverlay";
import WebXREntryOverlay from "@/spatial/webxr/WebXREntryOverlay";
import XRCameraRigOverlay from "@/spatial/xr-runtime/XRCameraRigOverlay";
import ARPlacementOverlay from "@/spatial/ar/ARPlacementOverlay";
import UnityAdapterOverlay from "@/spatial/unity/UnityAdapterOverlay";
import XRInputOverlay from "@/spatial/input/XRInputOverlay";
import ImmersiveReplayTraversalOverlay from "@/spatial/traversal/ImmersiveReplayTraversalOverlay";
import MemoryImportOverlay from "@/spatial/data-import/MemoryImportOverlay";
import ExternalIngestOverlay from "@/spatial/ingest/ExternalIngestOverlay";
import BatchImportAuditOverlay from "@/spatial/validation/BatchImportAuditOverlay";
import MergePreflightOverlay from "@/spatial/merge/MergePreflightOverlay";
import PersistenceSyncOverlay from "@/spatial/persistence/PersistenceSyncOverlay";
import DatasetVersioningOverlay from "@/spatial/versioning/DatasetVersioningOverlay";
import ChapterSynthesisOverlay from "@/spatial/chapter/ChapterSynthesisOverlay";
import CausalInsightOverlay from "@/spatial/causal/CausalInsightOverlay";
import StoryArcOverlay from "@/spatial/storyarc/StoryArcOverlay";
import EraCompareOverlay from "@/spatial/era/EraCompareOverlay";
import SeasonalCycleOverlay from "@/spatial/seasonal/SeasonalCycleOverlay";
import NarratorOrchestrationOverlay from "@/spatial/narrator/NarratorOrchestrationOverlay";
import WebXRRendererHandoffOverlay from "@/spatial/xr-renderer/WebXRRendererHandoffOverlay";
import { useXrSessionStore } from "../state/xrSessionStore";

const shellButtonStyle: CSSProperties = {
  appearance: "none",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 14,
  background: "rgba(10,14,28,0.66)",
  color: "rgba(245,248,255,0.96)",
  padding: "12px 16px",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  backdropFilter: "blur(16px)",
  boxShadow: "0 14px 40px rgba(0,0,0,0.28)",
};

const secondaryButtonStyle: CSSProperties = {
  ...shellButtonStyle,
  background: "rgba(255,255,255,0.06)",
};

const ghostButtonStyle: CSSProperties = {
  ...shellButtonStyle,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "none",
};

const topChromeStyle: CSSProperties = {
  position: "absolute",
  top: 18,
  left: 18,
  right: 18,
  zIndex: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  pointerEvents: "none",
};

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 38,
  borderRadius: 999,
  padding: "0 14px",
  background: "rgba(10,14,28,0.52)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "rgba(244,247,255,0.95)",
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  backdropFilter: "blur(16px)",
  boxShadow: "0 14px 40px rgba(0,0,0,0.22)",
};

const panelStyle: CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(255,255,255,0.12)",
  background:
    "linear-gradient(180deg, rgba(13,18,34,0.78) 0%, rgba(7,10,18,0.86) 100%)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 24px 80px rgba(0,0,0,0.32)",
  color: "rgba(244,247,255,0.96)",
};

const captionStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(214,223,255,0.7)",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(28px, 3vw, 44px)",
  lineHeight: 1.02,
  letterSpacing: "-0.03em",
  fontWeight: 700,
};

const subtleTextStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.6,
  color: "rgba(225,233,255,0.78)",
};

const dividerStyle: CSSProperties = {
  width: "100%",
  height: 1,
  background: "linear-gradient(90deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03))",
};

function modeLabel(mode: SceneMode) {
  switch (mode) {
    case "home":
      return "Home";
    case "sky":
      return "Sky";
    case "lifemap":
      return "LifeMap";
    case "focus":
      return "Focus";
    case "replay":
      return "Replay";
    default:
      return mode;
  }
}

function Atmosphere() {
  return (
    <>
      <fog attach="fog" args={["#04060b", 20, 78]} />
      <color attach="background" args={["#04060b"]} />
    </>
  );
}

function FloorPlane() {
  const mode = useSceneStore((s) => s.mode);

  if (mode === "lifemap") return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8, 0]}>
      <circleGeometry args={[90, 96]} />
      <meshBasicMaterial
        color="#09101f"
        transparent
        opacity={mode === "sky" ? 0.035 : 0.09}
        depthWrite={false}
      />
    </mesh>
  );
}
function CameraRig() {
  const { camera } = useThree();
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const cameraTarget = useRef(new THREE.Vector3(0, 4, 28));
  const lookTarget = useRef(new THREE.Vector3(0, 2, 0));

  useFrame((_, delta) => {
    const cp = cameraTarget.current;
    const lp = lookTarget.current;

    if (mode === "home") {
      cp.set(0, 5.8, 30);
      lp.set(0, 2, 0);
    } else if (mode === "lifemap") {
      cp.set(0, 6.4, 12.5);
      lp.set(0, 1.8, -22);
    } else if (selectedStar) {
      const [x, y, z] = selectedStar.position;
      if (mode === "focus") {
        cp.set(x * 0.16, y + 2.9, z + 8.2);
        lp.set(x, y, z);
      } else {
        cp.set(x * 0.1, y + 1.9, z + 6.2);
        lp.set(x, y, z);
      }
    }

    const speed = mode === "lifemap" ? 2.2 : 3.2;
      const t = 1 - Math.exp(-delta * speed);
    camera.position.lerp(cp, t);
    camera.lookAt(lp);
  });

  return null;
}

function StarNode({
  star,
  isSelected,
  dimmed,
  onSelect,
}: {
  star: SpatialStar;
  isSelected: boolean;
  dimmed: boolean;
  onSelect: (star: SpatialStar) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const mode = useSceneStore((s) => s.mode);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 1.45 + star.order * 0.5) * 0.06 * star.glow;
    const targetScale = isSelected
      ? pulse * (mode === "focus" ? 2.05 : 1.75)
      : dimmed
      ? pulse * 0.82
      : pulse;

    if (meshRef.current) {
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      );
    }

    if (haloRef.current) {
      const haloScale = isSelected
        ? mode === "focus" ? 2.8 + Math.sin(t * 1.25) * 0.12 : 2.15 + Math.sin(t * 1.25) * 0.08
        : mode === "replay"
        ? 1.55
        : 1.25;
      haloRef.current.scale.lerp(
        new THREE.Vector3(haloScale, haloScale, haloScale),
        0.12
      );
    }
  });

  return (
    <group position={star.position}>
      <mesh
        ref={meshRef}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          onSelect(star);
        }}
      >
        <sphereGeometry args={[mode === "lifemap" ? star.size * 0.36 : star.size * 0.22, 18, 18]} />
        <meshStandardMaterial
          color={star.color}
          emissive={star.color}
          emissiveIntensity={isSelected ? (mode === "focus" ? 4.4 : 3.2) : dimmed ? 0.5 : mode === "lifemap" ? star.intensity * 2.2 : star.intensity * 1.4}
          roughness={0.2}
          metalness={0.05}
          transparent
          opacity={dimmed ? 0.32 : mode === "lifemap" ? 0.98 : 0.98}
        />
      </mesh>

      <mesh ref={haloRef}>
        <sphereGeometry args={[mode === "lifemap" ? star.size * 0.58 : star.size * 0.38, 18, 18]} />
        <meshBasicMaterial
          color={star.color}
          transparent
          opacity={isSelected ? (mode === "focus" ? 0.32 : 0.22) : dimmed ? 0.03 : mode === "lifemap" ? 0.10 : 0.06}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function MemorySphere() {
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const mode = useSceneStore((s) => s.mode);
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const base = mode === "replay" ? 1.5 : 1.18;
    const wobble = 1 + Math.sin(t * 0.92) * 0.04;
    ref.current.scale.lerp(
      new THREE.Vector3(base * wobble, base * wobble, base * wobble),
      0.08
    );
    ref.current.rotation.y += 0.004;
    ref.current.rotation.x += 0.0015;
  });

  if (!selectedStar) return null;

  return (
    <group position={selectedStar.position}>
      <mesh ref={ref}>
        <sphereGeometry args={[selectedStar.size * 0.72, 32, 32]} />
        <meshPhysicalMaterial
          color={selectedStar.color}
          emissive={selectedStar.color}
          emissiveIntensity={mode === "replay" ? 0.65 : mode === "focus" ? 0.52 : 0.35}
          transparent
          opacity={mode === "replay" ? 0.18 : mode === "focus" ? 0.14 : 0.09}
          roughness={0.08}
          metalness={0}
          transmission={0.82}
          thickness={1.25}
          ior={1.18}
        />
      </mesh>
    </group>
  );
}

function StarField() {
  const stars = useSceneStore((s) => s.stars);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);
  const mode = useSceneStore((s) => s.mode);
  const selectStar = useSceneStore((s) => s.selectStar);
  const clearFocus = useSceneStore((s) => s.clearFocus);

          const ambientCount = mode === "lifemap" ? 460 : mode === "sky" ? 70 : 28;

  return (
    <group>
      {Array.from({ length: ambientCount }).map((_, i) => {
        const angle = i * 2.399963229728653;
                                        const radius = mode === "lifemap" ? 6 + (i % 17) * 1.75 + Math.sin(i * 0.77) * 1.1 : mode === "sky" ? 18 + (i % 15) * 3.8 + Math.sin(i * 0.77) * 2.2 : 26 + (i % 13) * 5.2 + Math.sin(i * 0.77) * 2.6;
        const x = Math.cos(angle) * radius;
                                        const y = mode === "lifemap" ? -2.5 + (i % 29) * 0.44 + Math.sin(i * 1.13) * 0.95 : mode === "sky" ? -7 + (i % 23) * 0.72 + Math.sin(i * 1.13) * 1.4 : -10 + (i % 19) * 0.9 + Math.sin(i * 1.13) * 1.6;
                                        const z = mode === "lifemap" ? -12 - (i % 23) * 2.9 - Math.cos(i * 0.41) * 1.8 : mode === "sky" ? -22 - (i % 21) * 4.8 - Math.cos(i * 0.41) * 3.0 : -36 - (i % 17) * 6.0 - Math.cos(i * 0.41) * 3.6;
        const size =
          mode === "lifemap"
            ? 0.020 + (i % 5) * 0.006
            : mode === "sky"
            ? 0.028 + (i % 4) * 0.009
            : 0.007 + (i % 3) * 0.003;
        const opacity =
          mode === "lifemap"
            ? 0.09 + (i % 7) * 0.018
            : mode === "sky"
            ? 0.1 + (i % 5) * 0.03
            : 0.018 + (i % 4) * 0.007;
        const color = i % 9 === 0 ? "#dbe7ff" : i % 6 === 0 ? "#8fb5ff" : "#ffffff";

        return (
          <mesh key={`ambient-${i}`} position={[x, y, z]} renderOrder={-1}>
            <sphereGeometry args={[size, 10, 10]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {stars.map((star) => {
        const isSelected = star.id === selectedStarId;
        const dimmed = !!selectedStarId && !isSelected;

        return (
          <StarNode
            key={star.id}
            star={star}
            isSelected={isSelected}
            dimmed={mode === "replay" ? !isSelected : dimmed}
            onSelect={(node) => selectStar(toCanonicalSelectedStar(node))}
          />
        );
      })}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -7.95, 0]}
        onClick={() => {
          if (mode === "focus") clearFocus();
        }}
      >
        <circleGeometry args={[90, 64]} />
        <meshBasicMaterial transparent opacity={0.001} />
      </mesh>
    </group>
  );
}
function ReplayConstellation() {
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const mode = useSceneStore((s) => s.mode);
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current || !selectedStar || mode !== "replay") return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.18;
    ref.current.rotation.z = Math.sin(t * 0.42) * 0.08;
  });

  if (!selectedStar || mode !== "replay") return null;

  return (
    <group ref={ref} position={selectedStar.position}>
      {Array.from({ length: 9 }).map((_, i) => {
        const angle = (i / 9) * Math.PI * 2;
        const radius = 1.5 + (i % 3) * 0.42;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle * 1.35) * 0.45,
              Math.sin(angle) * radius,
            ]}
          >
            <sphereGeometry args={[0.04 + (i % 3) * 0.015, 12, 12]} />
            <meshBasicMaterial color={selectedStar.color} transparent opacity={0.65} />
          </mesh>
        );
      })}
    </group>
  );
}

function ProgressBar() {
  const mode = useSceneStore((s) => s.mode);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (mode !== "replay") {
      setProgress(0);
      return;
    }

    let frame = 0;
    let raf = 0;

    const tick = () => {
      frame += 1;
      setProgress((p) => {
        const next = Math.min(1, p + 0.0055);
        return next;
      });

      if (frame < 200) {
        raf = window.requestAnimationFrame(tick);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [mode]);

  return (
    <div
      style={{
        width: "100%",
        height: 6,
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(progress * 100, 6)}%`,
          height: "100%",
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.35), rgba(255,255,255,0.9))",
          transition: "width 140ms linear",
        }}
      />
    </div>
  );
}

function OverlayChrome() {
  const mode = useSceneStore((s) => s.mode);
  const setMode = useSceneStore((s) => s.setMode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const clearFocus = useSceneStore((s) => s.clearFocus);
  const enterReplay = useSceneStore((s) => s.enterReplay);
  const exitReplay = useSceneStore((s) => s.exitReplay);

  const focusMeta = useMemo(() => {
    if (!selectedStar) return null;
    return `${selectedStar.chapter} · ${selectedStar.timeband} · ${selectedStar.label}`;
  }, [selectedStar]);

  return (
    <>
      <div style={topChromeStyle}>
        <div style={chipStyle}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.86)" }} />
          URAI Spatial
        </div>

        <div style={{ ...chipStyle, pointerEvents: "auto" }}>{modeLabel(mode)}</div>
      </div>

      {mode === "home" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "grid",
            placeItems: "center",
            padding: 24,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              ...panelStyle,
              width: "min(780px, calc(100vw - 32px))",
              padding: "34px 32px 30px",
              pointerEvents: "auto",
            }}
          >
            <div style={{ display: "grid", gap: 18 }}>
              <div style={captionStyle}>Tier 1 / Canonical Shell</div>
              <h1 style={titleStyle}>Home → Sky → LifeMap → Focus → Replay</h1>
              <p style={{ ...subtleTextStyle, maxWidth: 640 }}>
                The spatial shell is live. This phase turns replay from a mode switch into an actual
                memory-dive scene with camera intent, focus depth, and a readable presentation layer.
              </p>

              <div style={dividerStyle} />

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <button style={shellButtonStyle} onClick={() => setMode("sky")}>
                  Enter LifeMap
                </button>
                <button style={secondaryButtonStyle} onClick={() => setMode("focus")} disabled={!selectedStar}>
                  Resume Focus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "sky" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              padding: 24,
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(7,10,18,0.58)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 20px 80px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                opacity: 0.72,
              }}
            >
              Transitional Layer
            </div>
            <h1 style={titleStyle}>Sky</h1>
            <p
              style={{
                margin: 0,
                maxWidth: 520,
                textAlign: "center",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.78)",
              }}
            >
              This is the minimal sky contract between Home and LifeMap.
            </p>
            <button
              type="button"
              onClick={() => setMode("lifemap")}
              style={shellButtonStyle}
            >
              Enter LifeMap
            </button>
          </div>
        </div>
      )}

      {mode === "lifemap" && (
        <div
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: 18,
            zIndex: 20,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              ...panelStyle,
              width: "min(760px, calc(100vw - 32px))",
              padding: "18px 20px",
              pointerEvents: "auto",
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div style={captionStyle}>LifeMap</div>
              <p style={subtleTextStyle}>
                Select a star to enter focus. From focus, enter replay to dive the selected memory node.
              </p>
            </div>
          </div>
        </div>
      )}

      {mode === "focus" && selectedStar && (
        <div
          style={{
            position: "absolute",
            right: 18,
            bottom: 18,
            zIndex: 24,
            width: "min(420px, calc(100vw - 32px))",
            pointerEvents: "auto",
          }}
        >
          <div style={{ ...panelStyle, padding: 24 }}>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={captionStyle}>Focus</div>
              <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.05 }}>{selectedStar.title}</h2>
              <div style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(220,228,255,0.72)" }}>
                {focusMeta}
              </div>
              <p style={subtleTextStyle}>{selectedStar.description}</p>

              <div style={dividerStyle} />

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <button style={shellButtonStyle} onClick={enterReplay}>
                  Enter Replay
                </button>
                <button style={secondaryButtonStyle} onClick={clearFocus}>
                  Clear Focus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "replay" && selectedStar && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 26,
            display: "grid",
            placeItems: "center",
            padding: 18,
            pointerEvents: "none",
            background:
              "radial-gradient(700px 360px at 50% 56%, rgba(255,255,255,0.06), transparent 60%)",
          }}
        >
          <div
            style={{
              ...panelStyle,
              width: "min(720px, calc(100vw - 32px))",
              padding: "26px 24px 24px",
              pointerEvents: "auto",
            }}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div style={captionStyle}>Replay / Memory Dive</div>
              <h2 style={{ margin: 0, fontSize: "clamp(32px, 4vw, 54px)", lineHeight: 0.98 }}>
                {selectedStar.title}
              </h2>
              <div style={{ fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(220,228,255,0.76)" }}>
                {selectedStar.signature}
              </div>

              <ProgressBar />

              <p style={{ ...subtleTextStyle, fontSize: 15 }}>
                {selectedStar.description}
              </p>

              <div style={dividerStyle} />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <div style={{ ...panelStyle, padding: 14, borderRadius: 18 }}>
                  <div style={captionStyle}>Chapter</div>
                  <div style={{ marginTop: 8, fontSize: 16 }}>{selectedStar.chapter}</div>
                </div>
                <div style={{ ...panelStyle, padding: 14, borderRadius: 18 }}>
                  <div style={captionStyle}>Timeband</div>
                  <div style={{ marginTop: 8, fontSize: 16 }}>{selectedStar.timeband}</div>
                </div>
                <div style={{ ...panelStyle, padding: 14, borderRadius: 18 }}>
                  <div style={captionStyle}>Label</div>
                  <div style={{ marginTop: 8, fontSize: 16 }}>{selectedStar.label}</div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <button style={shellButtonStyle} onClick={exitReplay}>
                  Exit Replay
                </button>
                <button
                  style={ghostButtonStyle}
                  onClick={() => {
                    exitReplay();
                    clearFocus();
                  }}
                >
                  Back to LifeMap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SpatialScene() {
  const immersiveEnabled = false;
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const setMode = useSceneStore((s) => s.setMode);
  const clearFocus = useSceneStore((s) => s.clearFocus);
  const exitReplay = useSceneStore((s) => s.exitReplay);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (mode === "replay") {
        exitReplay();
        return;
      }

      if (mode === "focus") {
        clearFocus();
        return;
      }

      if (mode === "lifemap") {
        setMode("home");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, clearFocus, exitReplay, setMode]);

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100svh",
          height: "100svh",
        overflow: "hidden",
        background:
          "radial-gradient(1200px 700px at 50% -10%, rgba(91,115,191,0.16), transparent 56%), linear-gradient(180deg, #0a1020 0%, #04060b 48%, #020307 100%)",
      }}
    >
      <SpatialSettingsBootstrap />
      <SpatialReleaseBootstrap />
      <SpatialAccountBootstrap />
      <SpatialCompareBootstrap />
      <SpatialLensBootstrap />
      <SpatialArcBootstrap />
      <SpatialSeasonalArcBootstrap />
      <SpatialStoryBundleVaultBootstrap />
      <SpatialCuratedDeckVaultBootstrap />
      <Canvas
        camera={{ position: [0, 6, 30], fov: 42, near: 0.1, far: 200 }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => {
          if (mode === "focus") clearFocus();
        }}
      >
        <Atmosphere />
        <ambientLight intensity={0.95} />
        <directionalLight position={[8, 12, 10]} intensity={1.1} color="#dbe4ff" />
        <pointLight position={[0, 6, 10]} intensity={selectedStar ? 10 : 6} color="#ffffff" />
        <pointLight position={[0, -2, -8]} intensity={4} color="#6f86ff" />
        {immersiveEnabled && (
          <>
            <ArHitTestBridge />
            <UnityRuntimePayloadBridge />
            <SpatialPersistenceBridge />
            <SpatialAnalyticsBridge />
            <XrLocomotionRuntime />
          </>
        )}
        <CameraRig />
        <FloorPlane />
        <StarField />
        <MemorySphere />
        <ReplayConstellation />
        <ArPlaneMarker />
      </Canvas>
        <WebXRRendererHandoffOverlay />
        <NarratorOrchestrationOverlay />
        <SeasonalCycleOverlay />
        <EraCompareOverlay />
        <StoryArcOverlay />
        <CausalInsightOverlay />
        <ChapterSynthesisOverlay />
        <DatasetVersioningOverlay />
        <PersistenceSyncOverlay />
        <MergePreflightOverlay />
        <BatchImportAuditOverlay />
        <ExternalIngestOverlay />
        <MemoryImportOverlay />
        <ImmersiveReplayTraversalOverlay />
        <XRInputOverlay />
        <UnityAdapterOverlay />
        <ARPlacementOverlay />
        <XRCameraRigOverlay />
        <WebXREntryOverlay />
        <SceneExportOverlay />
        <ImmersiveContractOverlay />
        <XRBridgeOverlay />
        <LifeMapIntelligenceOverlay />
        <CinematicReplayOverlay />

      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background:
            mode === "replay"
              ? "linear-gradient(180deg, rgba(1,2,6,0.28) 0%, rgba(2,3,8,0.08) 30%, rgba(1,2,6,0.44) 100%)"
              : "linear-gradient(180deg, rgba(1,2,6,0.14) 0%, rgba(2,3,8,0.04) 28%, rgba(1,2,6,0.22) 100%)",
        }}
      />

      <OverlayChrome />
    </main>
  );
}

function XrSessionBridge() {
  const gl = useThree((s) => s.gl as any);
  const setPresenting = useXrSessionStore((s) => s.setPresenting);
  const setHasHeadsetPose = useXrSessionStore((s) => s.setHasHeadsetPose);

  useEffect(() => {
    const xr = gl?.xr;
    if (!xr) return;

    const sync = () => {
      const presenting = !!xr.isPresenting;
      setPresenting(presenting);
      setHasHeadsetPose(presenting);
    };

    sync();

    const onStart = () => sync();
    const onEnd = () => {
      setPresenting(false);
      setHasHeadsetPose(false);
    };

    xr.addEventListener?.("sessionstart", onStart);
    xr.addEventListener?.("sessionend", onEnd);

    return () => {
      xr.removeEventListener?.("sessionstart", onStart);
      xr.removeEventListener?.("sessionend", onEnd);
    };
  }, [gl, setHasHeadsetPose, setPresenting]);

  return null;
}
// __URAI_XR_SESSION_BRIDGE__


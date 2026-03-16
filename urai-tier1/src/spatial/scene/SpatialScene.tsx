"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import Starfield from "@/spatial/scene/Starfield";
import CameraRig from "@/spatial/components/CameraRig";
import { useSceneStore } from "@/spatial/state/sceneStore";
import MemorySphere from "@/spatial/scene/MemorySphere";

function HudButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: active ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.18)",
        background: active ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)",
        color: "white",
        cursor: "pointer",
        fontSize: 13,
        letterSpacing: "0.02em",
        backdropFilter: "blur(8px)",
      }}
    >
      {label}
    </button>
  );
}

function FocusPanel() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  if (mode !== "focus" || !selectedStar) return null;

  const signature =
    selectedStar.color === "#ffd27a"
      ? "Solar Memory"
      : selectedStar.color === "#9ad1ff"
        ? "Blue Echo"
        : selectedStar.color === "#ff9ac6"
          ? "Rose Thread"
          : selectedStar.color === "#b7ffb0"
            ? "Verdant Pulse"
            : "White Signal";

  return (
    <div
      style={{
        position: "absolute",
        top: 18,
        right: 18,
        zIndex: 120,
        width: 300,
        padding: 16,
        borderRadius: 16,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.14)",
        backdropFilter: "blur(12px)",
        color: "white",
        fontFamily: "Arial, sans-serif",
        pointerEvents: "auto",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 11, opacity: 0.68, textTransform: "uppercase", letterSpacing: "0.14em" }}>
        Focused Memory
      </div>

      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            background: selectedStar.color,
            display: "inline-block",
            boxShadow: `0 0 16px ${selectedStar.color}`,
            flex: "0 0 auto",
          }}
        />
        <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.1 }}>{signature}</div>
      </div>

      <div style={{ marginTop: 10, fontSize: 13, opacity: 0.76, lineHeight: 1.5 }}>
        Selected node <span style={{ opacity: 0.92 }}>{selectedStar.id}</span> is active in focus view.
        This is the current Tier 1 memory target.
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "92px 1fr",
          rowGap: 8,
          columnGap: 8,
          fontSize: 13,
        }}
      >
        <div style={{ opacity: 0.65 }}>Signature</div>
        <div>{signature}</div>

        <div style={{ opacity: 0.65 }}>Intensity</div>
        <div>{selectedStar.size.toFixed(2)}</div>

        <div style={{ opacity: 0.65 }}>Color</div>
        <div>{selectedStar.color}</div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.68 }}>
        Press Esc or click empty space to exit focus
      </div>
    </div>
  );
}

export default function SpatialScene() {
  const { mode, setMode, selectedStar, setSelectedStar } = useSceneStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedStar(null);
        setMode("lifemap");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setMode, setSelectedStar]);

  const exitFocus = () => {
    setSelectedStar(null);
    setMode("lifemap");
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background:
          mode === "lifemap"
            ? "radial-gradient(circle at center, #050816 0%, #010104 55%, #000000 100%)"
            : mode === "focus"
              ? "radial-gradient(circle at center, #0a1020 0%, #02050b 50%, #000000 100%)"
              : "radial-gradient(circle at center, #08111f 0%, #03060c 42%, #000000 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {mode === "focus" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 40,
            pointerEvents: "auto",
          }}
          onPointerDown={() => exitFocus()}
        />
      ) : null}

      <Canvas
        style={{ position: "relative", zIndex: 10 }}
        camera={{ position: [0, 120, 240], fov: 60 }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.72} />
          <pointLight position={[0, 40, 40]} intensity={1.15} />
          <pointLight position={[0, -30, -60]} intensity={0.25} />
          <CameraRig />
          <Starfield />
          <MemorySphere />
        </Suspense>
      </Canvas>

      <div
        style={{
          position: "absolute",
          top: 18,
          left: 18,
          zIndex: 120,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          fontFamily: "Arial, sans-serif",
          color: "white",
          pointerEvents: "auto",
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(10px)",
            width: "fit-content",
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.72, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            URAI Tier 1
          </div>
          <div style={{ marginTop: 4, fontSize: 22, fontWeight: 600 }}>
            {mode === "home" ? "Home" : mode === "lifemap" ? "LifeMap" : "Focus"}
          </div>
          {selectedStar ? (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.72 }}>
              Selected: {selectedStar.id}
            </div>
          ) : (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.72 }}>
              {mode === "lifemap" ? "Click any star" : "Enter LifeMap to select"}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <HudButton
            label="Home"
            active={mode === "home"}
            onClick={() => {
              setSelectedStar(null);
              setMode("home");
            }}
          />
          <HudButton
            label="LifeMap"
            active={mode === "lifemap"}
            onClick={() => {
              setSelectedStar(null);
              setMode("lifemap");
            }}
          />
          <HudButton
            label="Clear Focus"
            active={mode === "focus"}
            onClick={() => {
              setSelectedStar(null);
              setMode("lifemap");
            }}
          />
        </div>
      </div>

      <FocusPanel />
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const SpatialScene = dynamic(
  () => import("@/spatial/scene/SpatialScene"),
  { ssr: false }
);

export default function DemoPage() {
  const [showIntro, setShowIntro] = useState(true);
  const [recordingMode, setRecordingMode] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  /* URAI_DEMO_COMPLETE_STATE_V1 */
  const [demoComplete, setDemoComplete] = useState(false);
  const hasRunRef = useRef(false);

  const clickSceneButton = (label: string) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const button = buttons.find((b) => b.textContent?.trim().toLowerCase() === label.toLowerCase());
    button?.click();
  };

  const startCinematicDemo = () => {
    setShowIntro(false);
    setRecordingMode(true);
    setDemoComplete(false);
    setCountdown(3);
    hasRunRef.current = false;
  };

  useEffect(() => {
    if (!recordingMode || countdown === null) return;

    if (countdown <= 0) {
      const t = window.setTimeout(() => {
        if (hasRunRef.current) return;
        hasRunRef.current = true;

        clickSceneButton("Voice off");
        /* URAI_DEMO_AUTO_ENABLE_VOICE_V1 */
        window.setTimeout(() => clickSceneButton("Voice off"), 250);
        window.setTimeout(() => clickSceneButton("Run demo"), 850);
        window.setTimeout(() => {
          setRecordingMode(false);
          setDemoComplete(true);
        }, 17000);
      }, 350);

      return () => window.clearTimeout(t);
    }

    const timer = window.setTimeout(() => {
      setCountdown((v) => (v === null ? null : v - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [recordingMode, countdown]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <SpatialScene />

      {/* URAI_DEMO_HIDE_BRAND_RECORDING_V1 */}
      {!recordingMode && (
        <div style={brand}>
          URAI Spatial · Cinematic Demo
        </div>
      )}

      {!recordingMode && (
        <div style={controls}>
          <button onClick={() => window.location.reload()} style={btn}>
            Reset
          </button>

          <button onClick={() => setShowIntro(v => !v)} style={btn}>
            {showIntro ? "Hide intro" : "Show intro"}
          </button>

          <button onClick={startCinematicDemo} style={primaryBtn}>
            Start cinematic demo
          </button>
        </div>
      )}

      {recordingMode && (
        <div style={recordingBadge}>
          REC MODE · {countdown && countdown > 0 ? `Starting in ${countdown}` : "Running"}
        </div>
      )}

      {/* URAI_DEMO_COMPLETE_OVERLAY_V1 */}
      {demoComplete && (
        <div style={completeOverlay}>
          <div style={completeCard}>
            <div style={eyebrow}>Demo complete</div>
            <h2 style={{ margin: "6px 0 10px" }}>URAI Spatial proof captured.</h2>
            <p style={copy}>
              The full runtime completed forward traversal, replay, voice narration, and reverse unwind.
            </p>
            <button onClick={() => setDemoComplete(false)} style={{ ...primaryBtn, marginTop: 14 }}>
              Continue
            </button>
          </div>
        </div>
      )}

      {showIntro && (
        <div style={introBackdrop}>
          <div style={introCard}>
            <div style={eyebrow}>URAI Spatial Runtime</div>
            <h1 style={{ margin: "4px 0 12px", fontSize: 28 }}>
              A cinematic life-state engine.
            </h1>
            <p style={copy}>
              URAI Spatial turns memory, emotion, and personal context into a navigable runtime.
              The flow is deterministic: Home → Ascent → LifeMap → Focus → Replay, with exact reverse unwind.
            </p>

            <div style={scriptBox}>
              Recording path: voice on, auto-run forward, replay, then unwind home.
            </div>

            <button onClick={startCinematicDemo} style={{ ...primaryBtn, marginTop: 18 }}>
              Start cinematic demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const brand: React.CSSProperties = {
  position: "absolute",
  top: 20,
  left: "50%",
  transform: "translateX(-50%)",
  padding: "10px 16px",
  borderRadius: 999,
  background: "rgba(5,4,16,0.5)",
  border: "1px solid rgba(180,160,255,0.2)",
  backdropFilter: "blur(10px)",
  fontSize: 12,
  letterSpacing: 0.1,
};

const controls: React.CSSProperties = {
  position: "absolute",
  bottom: 20,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: 10,
};

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(180,160,255,0.25)",
  background: "rgba(8,4,18,0.5)",
  color: "white",
  cursor: "pointer",
  fontSize: 12,
};

const primaryBtn: React.CSSProperties = {
  ...btn,
  background: "rgba(125,90,255,0.28)",
};

const introBackdrop: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "radial-gradient(circle at 50% 35%, rgba(90,60,180,0.28), rgba(0,0,0,0.68))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const introCard: React.CSSProperties = {
  maxWidth: 640,
  textAlign: "center",
  background: "rgba(10,8,22,0.88)",
  border: "1px solid rgba(180,160,255,0.22)",
  borderRadius: 20,
  padding: 28,
  boxShadow: "0 30px 120px rgba(0,0,0,0.4)",
  backdropFilter: "blur(14px)",
};

const eyebrow: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 0.16,
  textTransform: "uppercase",
  opacity: 0.68,
};

const copy: React.CSSProperties = {
  opacity: 0.86,
  fontSize: 14,
  lineHeight: 1.65,
};

const scriptBox: React.CSSProperties = {
  marginTop: 18,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(180,160,255,0.16)",
  background: "rgba(255,255,255,0.04)",
  fontSize: 12,
  opacity: 0.78,
};

const recordingBadge: React.CSSProperties = {
  position: "absolute",
  top: 68,
  left: "50%",
  transform: "translateX(-50%)",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(120,20,30,0.35)",
  border: "1px solid rgba(255,130,150,0.25)",
  color: "rgba(255,235,240,0.92)",
  fontSize: 11,
  letterSpacing: 0.12,
  backdropFilter: "blur(10px)",
};


const completeOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "radial-gradient(circle at 50% 38%, rgba(80,60,160,0.18), rgba(0,0,0,0.58))",
  pointerEvents: "auto",
};

const completeCard: React.CSSProperties = {
  maxWidth: 440,
  textAlign: "center",
  padding: 24,
  borderRadius: 20,
  background: "rgba(10,8,22,0.86)",
  border: "1px solid rgba(180,160,255,0.22)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 28px 100px rgba(0,0,0,0.42)",
};

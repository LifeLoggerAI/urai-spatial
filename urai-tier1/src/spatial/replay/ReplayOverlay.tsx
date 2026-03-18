"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSceneStore } from "../state/sceneStore";
import { REPLAY_STEP_MS } from "./replayConstants";
import { buildReplaySteps, getReplayGlow, getReplayMeta } from "./replayModel";

const shellStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 70,
  pointerEvents: "none",
};

const replayPillWrapStyle: React.CSSProperties = {
  position: "fixed",
  right: 24,
  bottom: 24,
  display: "flex",
  gap: 12,
  alignItems: "center",
  pointerEvents: "none",
};

const pillButtonStyle: React.CSSProperties = {
  pointerEvents: "auto",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(8,10,16,0.70)",
  color: "#ffffff",
  borderRadius: 999,
  padding: "10px 16px",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: "0 14px 40px rgba(0,0,0,0.30)",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background:
    "radial-gradient(circle at 50% 28%, rgba(110,140,255,0.10), rgba(2,4,10,0) 32%), rgba(2,4,10,0.78)",
  display: "grid",
  placeItems: "center",
  pointerEvents: "auto",
  padding: 24,
};

const panelStyle: React.CSSProperties = {
  width: "min(820px, calc(100vw - 32px))",
  borderRadius: 28,
  border: "1px solid rgba(255,255,255,0.10)",
  background:
    "linear-gradient(180deg, rgba(14,18,28,0.90) 0%, rgba(8,10,16,0.88) 100%)",
  color: "#ffffff",
  boxShadow: "0 24px 90px rgba(0,0,0,0.46)",
  overflow: "hidden",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

const headerStyle: React.CSSProperties = {
  padding: "24px 26px 16px 26px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.54)",
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 14,
};

const chipStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 10,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.76)",
  background: "rgba(255,255,255,0.02)",
};

const progressWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  marginTop: 18,
};

const bodyStyle: React.CSSProperties = {
  padding: 26,
  display: "grid",
  gap: 18,
};

const frameStyle: React.CSSProperties = {
  minHeight: 300,
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.08)",
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  padding: 28,
  overflow: "hidden",
  position: "relative",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
};

const frameGlowStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  opacity: 0.9,
};

const stepWrapStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: 620,
};

const controlsHintStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  color: "rgba(255,255,255,0.54)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "0 26px 26px 26px",
  flexWrap: "wrap",
};

const transportStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { quiet?: boolean }
) {
  const { quiet, style, ...rest } = props;
  return (
    <button
      {...rest}
      style={{
        ...pillButtonStyle,
        ...(quiet
          ? {
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.90)",
            }
          : {}),
        ...style,
      }}
    />
  );
}

function clampIndex(value: number, max: number) {
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
}

export function ReplayOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const enterReplay = useSceneStore((s) => s.enterReplay);
  const exitReplay = useSceneStore((s) => s.exitReplay);
  const clearFocus = useSceneStore((s) => s.clearFocus);

  const steps = useMemo(() => buildReplaySteps(selectedStar), [selectedStar]);
  const glow = useMemo(() => getReplayGlow(selectedStar), [selectedStar]);
  const meta = useMemo(() => getReplayMeta(selectedStar), [selectedStar]);

  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    setStepIndex(0);
    setPlaying(true);
  }, [selectedStar?.id, mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode === "replay") {
        exitReplay();
        return;
      }

      if ((e.key === "r" || e.key === "R") && mode === "focus" && selectedStar) {
        enterReplay();
        return;
      }

      if (mode !== "replay") return;

      if (e.key === " ") {
        e.preventDefault();
        setPlaying((v) => !v);
        return;
      }

      if (e.key === "ArrowRight") {
        setPlaying(false);
        setStepIndex((v) => clampIndex(v + 1, Math.max(steps.length - 1, 0)));
        return;
      }

      if (e.key === "ArrowLeft") {
        setPlaying(false);
        setStepIndex((v) => clampIndex(v - 1, Math.max(steps.length - 1, 0)));
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, selectedStar, enterReplay, exitReplay, steps.length]);

  useEffect(() => {
    if (mode !== "replay" || !playing || steps.length <= 1) return;
    const timer = window.setInterval(() => {
      setStepIndex((v) => (v >= steps.length - 1 ? 0 : v + 1));
    }, REPLAY_STEP_MS + 150);
    return () => window.clearInterval(timer);
  }, [mode, playing, steps.length]);

  if (!selectedStar) return null;

  if (mode === "focus") {
    return (
      <div style={shellStyle}>
        <div style={replayPillWrapStyle}>
          <Button
            aria-label="Replay selected star"
            onClick={() => enterReplay()}
            title="Replay selected star"
          >
            Replay
          </Button>
        </div>
      </div>
    );
  }

  if (mode !== "replay") return null;

  const step = steps[stepIndex] ?? steps[0];

  return (
    <div style={shellStyle}>
      <div style={overlayStyle} onClick={() => exitReplay()}>
        <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
          <div style={headerStyle}>
            <div style={eyebrowStyle}>Replay Sequence</div>

            <div style={metaRowStyle}>
              {meta.map((item) => (
                <div key={item} style={chipStyle}>
                  {item}
                </div>
              ))}
              <div style={chipStyle}>{playing ? "Playing" : "Paused"}</div>
            </div>

            <div style={progressWrapStyle}>
              {steps.map((s, idx) => (
                <div
                  key={s.id}
                  style={{
                    height: 5,
                    borderRadius: 999,
                    background: idx <= stepIndex ? glow : "rgba(255,255,255,0.10)",
                    opacity: idx === stepIndex ? 1 : 0.45,
                    boxShadow: idx === stepIndex ? `0 0 22px ${glow}` : "none",
                    transition: "all 180ms ease",
                  }}
                />
              ))}
            </div>
          </div>

          <div style={bodyStyle}>
            <div style={frameStyle}>
              <div
                style={{
                  ...frameGlowStyle,
                  background: `radial-gradient(circle at 50% 32%, ${glow}36, rgba(0,0,0,0) 42%)`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))",
                }}
              />
              <div style={stepWrapStyle}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.52)",
                    marginBottom: 14,
                  }}
                >
                  {step?.eyebrow}
                </div>

                <div
                  style={{
                    fontSize: 42,
                    lineHeight: 1.02,
                    marginBottom: 14,
                    color: glow,
                    textShadow: `0 0 34px ${glow}44`,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {step?.title}
                </div>

                <div
                  style={{
                    fontSize: 16,
                    lineHeight: 1.75,
                    color: "rgba(255,255,255,0.82)",
                    margin: "0 auto",
                    maxWidth: 560,
                  }}
                >
                  {step?.body}
                </div>
              </div>
            </div>

            <div style={controlsHintStyle}>
              <span>R from focus opens replay</span>
              <span>•</span>
              <span>Space pause/play</span>
              <span>•</span>
              <span>← → step</span>
              <span>•</span>
              <span>Esc back to focus</span>
            </div>
          </div>

          <div style={footerStyle}>
            <div style={transportStyle}>
              <Button
                quiet
                onClick={() => {
                  setPlaying(false);
                  setStepIndex((v) => clampIndex(v - 1, steps.length - 1));
                }}
              >
                Prev
              </Button>

              <Button quiet onClick={() => setPlaying((v) => !v)}>
                {playing ? "Pause" : "Play"}
              </Button>

              <Button
                quiet
                onClick={() => {
                  setPlaying(false);
                  setStepIndex((v) => clampIndex(v + 1, steps.length - 1));
                }}
              >
                Next
              </Button>
            </div>

            <div style={transportStyle}>
              <Button quiet onClick={() => clearFocus()}>
                Exit to LifeMap
              </Button>
              <Button onClick={() => exitReplay()}>Back to LifeMap</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import type { CSSProperties } from "react";
import type { CompanionExpression } from "./CompanionEmotionEngine";

export type CompanionOrbProps = {
  expression: CompanionExpression;
  active?: boolean;
  muted?: boolean;
  onClick?: () => void;
};

export default function CompanionOrb({ expression, active = true, muted = true, onClick }: CompanionOrbProps) {
  const glowPx = 18 + expression.glowStrength * 42;
  const alpha = Math.max(0.18, Math.min(0.72, expression.glowStrength));

  const style = {
    "--urai-companion-breath": `${expression.breathSeconds}s`,
    "--urai-companion-glow": `0 0 ${glowPx}px rgba(125, 211, 252, ${alpha})`,
    "--urai-companion-scale": expression.pulseScale,
    "--urai-companion-tilt": `${expression.tiltDegrees}deg`,
  } as CSSProperties;

  return (
    <button
      type="button"
      aria-label={muted ? "Companion is silent. Tap to hear when enabled." : "Tap companion"}
      data-active={active ? "true" : "false"}
      data-tone={expression.tone}
      onClick={onClick}
      style={style}
      className="urai-companion-orb"
    >
      <span className="urai-companion-orb__core" />
      <span className="urai-companion-orb__halo" />
      <span className="urai-companion-orb__status">{muted ? "silent" : expression.tone}</span>
    </button>
  );
}

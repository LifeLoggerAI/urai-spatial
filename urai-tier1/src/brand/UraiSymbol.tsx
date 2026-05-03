"use client";

import React from "react";
import {
  URAI_BRAND_REGISTRY,
  type UraiProductKey,
  type UraiSymbolModifier,
  type UraiSymbolState,
} from "./urai-brand.registry";

type Props = {
  product?: UraiProductKey;
  state?: UraiSymbolState;
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

export function UraiSymbol({
  product = "uraiCore",
  state = "idle",
  size = 160,
  showWordmark = true,
  className = "",
}: Props) {
  const brand = URAI_BRAND_REGISTRY[product];

  return (
    <div
      className={`urai-symbol urai-symbol--${state} ${className}`}
      style={{ width: size, ["--urai-accent" as string]: brand.accent }}
      data-product={product}
      data-state={state}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-label={brand.name} role="img">
        <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="2" className="urai-symbol__outer-ring" />
        <circle cx="50" cy="50" r="8" fill={brand.accent} className="urai-symbol__core-node" />
        <ProductModifier modifier={brand.symbolModifier} accent={brand.accent} />
      </svg>

      {showWordmark && (
        <div className="urai-symbol__wordmark">
          <strong>URAI</strong>
          {brand.name !== "URAI" && <span>{brand.name.replace("URAI ", "")}</span>}
        </div>
      )}
    </div>
  );
}

function ProductModifier({ modifier, accent }: { modifier: UraiSymbolModifier; accent: string }) {
  switch (modifier) {
    case "precision-line-scan":
      return (
        <g className="modifier modifier--labs">
          <line x1="28" y1="72" x2="72" y2="28" stroke={accent} strokeWidth="2" />
          <line x1="36" y1="78" x2="78" y2="36" stroke={accent} strokeWidth="1" opacity="0.5" />
        </g>
      );
    case "soft-human-halo":
      return (
        <g className="modifier modifier--foundation">
          <circle cx="50" cy="50" r="24" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.45" />
          <circle cx="50" cy="50" r="30" fill="none" stroke={accent} strokeWidth="1" opacity="0.25" />
        </g>
      );
    case "creative-wave":
      return <path className="modifier modifier--studio" d="M24 52 C36 38, 46 66, 58 50 S76 42, 82 54" fill="none" stroke={accent} strokeWidth="2" opacity="0.75" />;
    case "modular-block-assembly":
      return (
        <g className="modifier modifier--asset-factory" fill={accent} opacity="0.75">
          <rect x="30" y="30" width="6" height="6" rx="1" />
          <rect x="64" y="30" width="6" height="6" rx="1" />
          <rect x="30" y="64" width="6" height="6" rx="1" />
          <rect x="64" y="64" width="6" height="6" rx="1" />
        </g>
      );
    case "data-lattice-pulse":
      return (
        <g className="modifier modifier--analytics" fill={accent} opacity="0.7">
          {[38, 50, 62].map((x) => [38, 50, 62].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />))}
        </g>
      );
    case "layer-stack-shift":
      return (
        <g className="modifier modifier--content" stroke={accent} strokeWidth="1.6" opacity="0.75">
          <line x1="34" y1="38" x2="66" y2="38" />
          <line x1="30" y1="50" x2="70" y2="50" />
          <line x1="34" y1="62" x2="66" y2="62" />
        </g>
      );
    case "node-message-transfer":
      return (
        <g className="modifier modifier--communications" stroke={accent} fill={accent} opacity="0.75">
          <line x1="32" y1="50" x2="68" y2="50" strokeWidth="1.4" />
          <circle cx="32" cy="50" r="3" />
          <circle cx="68" cy="50" r="3" />
          <circle cx="50" cy="32" r="2.5" />
        </g>
      );
    case "broadcast-expansion":
      return (
        <g className="modifier modifier--marketing" fill="none" stroke={accent} opacity="0.65">
          <path d="M58 42 A12 12 0 0 1 58 58" strokeWidth="1.5" />
          <path d="M64 36 A20 20 0 0 1 64 64" strokeWidth="1.3" />
          <path d="M70 30 A28 28 0 0 1 70 70" strokeWidth="1" />
        </g>
      );
    case "route-path-flow":
      return <path className="modifier modifier--jobs" d="M26 66 C38 48, 48 74, 62 48 C68 38, 72 34, 78 30" fill="none" stroke={accent} strokeWidth="2" opacity="0.75" />;
    case "protective-boundary":
      return <path className="modifier modifier--privacy" d="M50 28 L68 36 V50 C68 62, 60 70, 50 74 C40 70, 32 62, 32 50 V36 Z" fill="none" stroke={accent} strokeWidth="1.8" opacity="0.75" />;
    case "stable-frame-breathe":
      return <rect className="modifier modifier--investors" x="28" y="28" width="44" height="44" rx="8" fill="none" stroke={accent} strokeWidth="1.6" opacity="0.7" />;
    case "depth-field-parallax":
      return (
        <g className="modifier modifier--spatial" fill="none" stroke={accent} opacity="0.75">
          <ellipse cx="50" cy="50" rx="30" ry="14" strokeWidth="1.5" />
          <ellipse cx="50" cy="50" rx="20" ry="8" strokeWidth="1" opacity="0.5" />
        </g>
      );
    case "clean-pulse":
    default:
      return null;
  }
}

import type { CSSProperties } from "react";

type Props = {
  phaseLabel: string;
  starCount: number;
  memoryTitle: string;
  source: string;
  canReplay: boolean;
  canBack: boolean;
  isBusy: boolean;
  onOpen: () => void;
  onBack: () => void;
  onReplay: () => void;
};

export default function SpatialHUD({
  phaseLabel,
  starCount,
  memoryTitle,
  source,
  canReplay,
  canBack,
  isBusy,
  onOpen,
  onBack,
  onReplay,
}: Props) {
  const isHome = phaseLabel === "HOME";
  const isLifeMap = phaseLabel === "LIFEMAP";
  const primaryLabel = isBusy ? "Opening..." : isHome ? "Open LifeMap" : "Center LifeMap";
  const primaryAriaLabel = isHome ? "Open LifeMap" : "Center LifeMap";
  const sourceLabel = source === "seed" ? "Demo constellation" : source;
  const helperText = canBack ? "ESC to return" : "Tap a star to open a memory";

  return (
    <div style={root}>
      <div style={panelTopLeft}>
        <div style={eyebrow}>URAI Spatial OS</div>
        <div style={phaseText}>{phaseLabel}</div>
      </div>

      <div style={panelTopRight}>
        <div style={statusText}>{starCount} memory stars</div>
        <div style={statusText}>Memory: {memoryTitle}</div>
        <div style={statusText}>{sourceLabel}</div>
      </div>

      <div style={panelBottom}>
        <button
          aria-label={primaryAriaLabel}
          style={{
            ...btn,
            opacity: isBusy ? 0.6 : 1,
          }}
          disabled={isBusy}
          onClick={onOpen}
        >
          {primaryLabel}
        </button>

        {canBack ? (
          <button aria-label="Go Back" style={btn} onClick={onBack}>
            Back / Escape
          </button>
        ) : null}

        {canReplay ? (
          <button aria-label="Enter Replay" style={btn} onClick={onReplay}>
            Enter Replay
          </button>
        ) : null}

        <span style={hintText}>
          {isLifeMap && !canBack ? "Tap a star to open a memory" : helperText}
        </span>
      </div>
    </div>
  );
}

const root: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 20,
};

const glass: CSSProperties = {
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  background: "rgba(8,12,28,.52)",
  border: "1px solid rgba(170,190,255,.22)",
  boxShadow: "0 18px 60px rgba(0,0,0,.36)",
  borderRadius: 20,
  pointerEvents: "auto",
};

const panelTopLeft: CSSProperties = {
  ...glass,
  position: "absolute",
  left: 16,
  top: 16,
  padding: "10px 12px",
  minWidth: 170,
};

const panelTopRight: CSSProperties = {
  ...glass,
  position: "absolute",
  right: 16,
  top: 16,
  padding: "10px 12px",
  minWidth: 170,
};

const panelBottom: CSSProperties = {
  ...glass,
  position: "absolute",
  left: 16,
  bottom: 16,
  padding: "10px 12px",
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

const eyebrow: CSSProperties = {
  fontSize: 11,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "#b9e7ff",
};

const phaseText: CSSProperties = {
  fontSize: 13,
  color: "#eaf2ff",
  marginTop: 4,
};

const statusText: CSSProperties = {
  fontSize: 12,
};

const hintText: CSSProperties = {
  fontSize: 11,
  opacity: 0.82,
};

const btn: CSSProperties = {
  border: "1px solid rgba(190,210,255,.28)",
  background: "linear-gradient(135deg, rgba(120,150,255,.24), rgba(120,210,255,.12))",
  color: "#eef4ff",
  borderRadius: 999,
  padding: "9px 14px",
  fontWeight: 600,
  cursor: "pointer",
};
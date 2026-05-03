"use client";

import React from "react";
const __URAI_DEBUG_SHELL__ = process.env.NEXT_PUBLIC_URAI_DEBUG_SPATIAL === "true"


type FocusShellOverlayProps = {
  visible?: boolean;
  node?: any;
  memory?: any;
  title?: string;
  chapter?: string;
  emotion?: string;
  onEnterReplay?: () => void;
  onClearFocus?: () => void;
  onReturnHome?: () => void;
  onClose?: () => void;
};

export default function FocusShellOverlay(props: FocusShellOverlayProps) {
  if (!__URAI_DEBUG_SHELL__) return null
  if (!props.visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        bottom: 24,
        zIndex: 50,
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: "14px 16px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(7,10,18,0.88)",
        color: "#f2f7ff",
        backdropFilter: "blur(10px)",
        boxShadow: "0 12px 50px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginRight: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.65 }}>FOCUS ACTIVE</div>
        {props.title ? <div style={{ fontSize: 16 }}>{props.title}</div> : null}
        {props.chapter ? <div style={{ fontSize: 12, opacity: 0.75 }}>{props.chapter}</div> : null}
        {props.emotion ? <div style={{ fontSize: 12, opacity: 0.75 }}>{props.emotion}</div> : null}
      </div>

      {props.onEnterReplay ? (
        <button
          onClick={props.onEnterReplay}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.06)",
            color: "#f2f7ff",
            cursor: "pointer",
          }}
        >
          Enter Replay
        </button>
      ) : null}

      {props.onClearFocus ? (
        <button
          onClick={props.onClearFocus}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.04)",
            color: "#f2f7ff",
            cursor: "pointer",
          }}
        >
          Clear Focus
        </button>
      ) : null}

      {props.onReturnHome ? (
        <button
          onClick={props.onReturnHome}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.04)",
            color: "#f2f7ff",
            cursor: "pointer",
          }}
        >
          Return Home
        </button>
      ) : null}

      {props.onClose ? (
        <button
          onClick={props.onClose}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.04)",
            color: "#f2f7ff",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      ) : null}
    </div>
  );
}

"use client";

import React from "react";

type ReplayShellOverlayProps = {
  visible?: boolean;
  node?: any;
  memory?: any;
  title?: string;
  chapter?: string;
  emotion?: string;
  onExitReplay?: () => void;
  onReturnToMap?: () => void;
  onReturnHome?: () => void;
  onClose?: () => void;
};

export default function ReplayShellOverlay(props: ReplayShellOverlayProps) {
  if (!props.visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        top: 24,
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
        <div style={{ fontSize: 12, opacity: 0.65 }}>REPLAY ACTIVE</div>
        {props.title ? <div style={{ fontSize: 16 }}>{props.title}</div> : null}
        {props.chapter ? <div style={{ fontSize: 12, opacity: 0.75 }}>{props.chapter}</div> : null}
        {props.emotion ? <div style={{ fontSize: 12, opacity: 0.75 }}>{props.emotion}</div> : null}
      </div>

      {props.onExitReplay ? (
        <button
          onClick={props.onExitReplay}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.06)",
            color: "#f2f7ff",
            cursor: "pointer",
          }}
        >
          Exit Replay
        </button>
      ) : null}

      {props.onReturnToMap ? (
        <button
          onClick={props.onReturnToMap}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.04)",
            color: "#f2f7ff",
            cursor: "pointer",
          }}
        >
          Return To Map
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

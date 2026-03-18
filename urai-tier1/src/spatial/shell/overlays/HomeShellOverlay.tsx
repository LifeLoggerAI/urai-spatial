"use client";

import React from "react";
import { ActionButton } from "../ActionButton";
import type { Tier1ShellOverlayProps } from "../Tier1ShellOverlayProps";

export default function HomeShellOverlay(props: Tier1ShellOverlayProps) {
  const {
    mode,
    uiLocked,
    showMapWorld,
    selectedId,
    selected,
    transitioning,
    enterLifeMap,
    returnHome,
    enterReplay,
    clearFocus,
    exitReplay,
    pillLabel,
  } = props;

  if (mode !== "home") return null;

  return (
        <section
          style={{
            position: "absolute",
            left: "50%",
            top: "46%",
            transform: "translate(-50%, -50%)",
            width: "min(560px, calc(100vw - 64px))",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(7,11,24,0.78)",
            boxShadow: "0 18px 56px rgba(0,0,0,0.40)",
            padding: 26,
            backdropFilter: "blur(16px)",
            zIndex: 20,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(204,216,245,0.62)",
              marginBottom: 10,
            }}
          >
            Tier 1 / Canonical Shell
          </div>
          <div
            style={{
              fontSize: 34,
              lineHeight: 1.04,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              marginBottom: 12,
            }}
          >
            Home → Sky → LifeMap → Focus → Replay
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.65,
              color: "rgba(220,228,245,0.78)",
              maxWidth: 480,
              marginBottom: 18,
            }}
          >
            This page is the deterministic Tier 1 lock shell: one world, one selected memory,
            one clear camera story, and zero modal-state drift.
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <ActionButton disabled={uiLocked} label="ENTER LIFEMAP" onClick={enterLifeMap} />
          </div>
        </section>

  );
}

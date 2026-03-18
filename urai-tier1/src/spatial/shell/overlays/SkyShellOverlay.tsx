"use client";

import React from "react";
import type { Tier1ShellOverlayProps } from "../Tier1ShellOverlayProps";

export default function SkyShellOverlay(props: Tier1ShellOverlayProps) {
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

  if (mode !== "sky") return null;

  return (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 16,
              pointerEvents: "none",
              background:
                "radial-gradient(circle at 50% 34%, rgba(152,184,255,0.08), transparent 20%), linear-gradient(180deg, rgba(3,6,16,0.02) 0%, rgba(3,6,16,0.18) 35%, rgba(3,6,16,0.06) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "-12%",
              top: "50%",
              width: "44%",
              height: 2,
              zIndex: 18,
              pointerEvents: "none",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.00) 0%, rgba(214,226,255,0.82) 55%, rgba(255,255,255,0.00) 100%)",
              boxShadow: "0 0 26px rgba(170,196,255,0.32)",
              transform: "translateY(-50%)",
              animation: "sky-streak-a 950ms ease-out 1",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "-16%",
              top: "50%",
              width: "52%",
              height: 1,
              zIndex: 18,
              pointerEvents: "none",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.00) 0%, rgba(214,226,255,0.68) 50%, rgba(255,255,255,0.00) 100%)",
              boxShadow: "0 0 18px rgba(170,196,255,0.20)",
              transform: "translateY(-50%)",
              animation: "sky-streak-b 950ms ease-out 1",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 164,
              height: 164,
              borderRadius: "50%",
              zIndex: 17,
              pointerEvents: "none",
              transform: "translate(-50%, -50%)",
              border: "1px solid rgba(206,222,255,0.08)",
              background:
                "radial-gradient(circle, rgba(220,230,255,0.10) 0%, rgba(116,136,196,0.06) 55%, rgba(18,26,48,0.00) 100%)",
              boxShadow: "0 0 44px rgba(150,176,255,0.10)",
              animation: "sky-core 950ms ease-out 1",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 22,
              transform: "translateX(-50%)",
              zIndex: 19,
              pointerEvents: "none",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(7,11,24,0.44)",
              padding: "7px 10px",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(226,236,255,0.74)",
              backdropFilter: "blur(10px)",
            }}
          >
            Transit
          </div>
        </>

  );
}

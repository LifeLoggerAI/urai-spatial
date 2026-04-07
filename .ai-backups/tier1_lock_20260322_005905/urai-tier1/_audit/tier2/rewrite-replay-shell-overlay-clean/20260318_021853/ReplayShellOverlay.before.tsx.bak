"use client";

import React from "react";
import { ReplayDatum } from "../ReplayDatum";
import { ActionButton } from "../ActionButton";
import type { Tier1ShellOverlayProps } from "../Tier1ShellOverlayProps";

export default function ReplayShellOverlay(props: Tier1ShellOverlayProps) {
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

  if (mode !== "replay") return null;

  return (
    <>
        <section
          style={{
            position: "absolute",
            left: 18,
            top: "50%",
            transform: "translateY(-50%)",
            width: "min(420px, calc(100vw - 36px))",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(7,11,24,0.80)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.42)",
            padding: 22,
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
            Replay / Memory Dive
          </div>
          <div
            style={{
              fontSize: 38,
              lineHeight: 0.98,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              marginBottom: 14,
            }}
          >
            {selected.title}
          </div>

          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.10)",
              marginBottom: 14,
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <ReplayDatum label="Origin" value={selected.tags[0]} />
            <ReplayDatum label="Vector" value={selected.tags[1]} />
            <ReplayDatum label="Thread" value={selected.tags[2]} />
          </div>

          <div
            style={{
              fontSize: 13,
              lineHeight: 1.65,
              color: "rgba(220,228,245,0.78)",
              marginBottom: 16,
            }}
          >
            Canonical replay holds the same selected memory identity across focus and replay, with a
            stronger entered-memory composition and deterministic exit path.
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <ActionButton disabled={uiLocked} label="EXIT REPLAY" onClick={exitReplay} />
          </div>
        </section>

      <style jsx global>{`
        @keyframes breathe {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(0.985);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.025);
          }
        }

        @keyframes node-pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            transform: translate(-50%, -50%) scale(1.42);
          }
        }

        @keyframes sky-streak-a {
          0% {
            transform: translate(-18%, -50%) scaleX(0.72);
            opacity: 0.12;
          }
          100% {
            transform: translate(22%, -50%) scaleX(1.12);
            opacity: 1;
          }
        }

        @keyframes sky-streak-b {
          0% {
            transform: translate(18%, -50%) scaleX(0.82);
            opacity: 0.10;
          }
          100% {
            transform: translate(-14%, -50%) scaleX(1.08);
            opacity: 0.84;
          }
        }

        @keyframes sky-core {
          0% {
            transform: translate(-50%, -50%) scale(0.72);
            opacity: 0.10;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.18);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

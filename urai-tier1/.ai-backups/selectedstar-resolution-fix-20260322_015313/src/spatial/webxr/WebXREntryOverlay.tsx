"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveWebXREntryStateById } from "@/spatial/webxr/resolveWebXREntryState";

type SupportState = "checking" | "supported" | "unsupported";

export default function WebXREntryOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const state = useMemo(
    () => resolveWebXREntryStateById(selectedStarId || undefined, mode),
    [selectedStarId, mode]
  );

  const [support, setSupport] = useState<SupportState>("checking");
  const [sessionState, setSessionState] = useState<"idle" | "starting" | "active" | "error">("idle");
  const sessionRef = useRef<XRSession | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkSupport() {
      if (!state) {
        setSupport("unsupported");
        return;
      }

      if (typeof navigator === "undefined" || !navigator.xr?.isSessionSupported) {
        setSupport("unsupported");
        return;
      }

      try {
        const ok = await navigator.xr.isSessionSupported(state.targetMode);
        if (!cancelled) setSupport(ok ? "supported" : "unsupported");
      } catch {
        if (!cancelled) setSupport("unsupported");
      }
    }

    void checkSupport();

    return () => {
      cancelled = true;
    };
  }, [state]);

  async function handleEnterXR() {
    if (!state || !navigator.xr?.requestSession) return;

    try {
      setSessionState("starting");
      const session = await navigator.xr.requestSession(state.targetMode, {
        optionalFeatures: state.features,
      });
      sessionRef.current = session;
      setSessionState("active");

      const endHandler = () => {
        sessionRef.current = null;
        setSessionState("idle");
      };

      session.addEventListener("end", endHandler);
    } catch {
      setSessionState("error");
    }
  }

  async function handleExitXR() {
    try {
      if (sessionRef.current) {
        await sessionRef.current.end();
      }
      sessionRef.current = null;
      setSessionState("idle");
    } catch {
      setSessionState("error");
    }
  }

  if (!selectedStarId || !state) return null;

  const statusLabel =
    support === "checking"
      ? "checking"
      : support === "supported"
      ? sessionState === "active"
        ? "active"
        : "ready"
      : "unsupported";

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        top: 24,
        width: "min(400px, calc(100vw - 32px))",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.82), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 32,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          opacity: 0.66,
          marginBottom: 8,
        }}
      >
        WebXR Scene Entry
      </div>

      <div
        style={{
          fontSize: 20,
          lineHeight: 1.08,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {state.title}
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.05)",
          fontSize: 11,
          lineHeight: 1,
          marginBottom: 12,
          opacity: 0.86,
        }}
      >
        <span>{state.modeLabel}</span>
        <span>{statusLabel}</span>
        <span>{state.readiness}</span>
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          opacity: 0.86,
          marginBottom: 12,
        }}
      >
        {state.summary}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14,
          pointerEvents: "none",
        }}
      >
        {state.features.map((feature) => (
          <span
            key={feature}
            style={{
              fontSize: 11,
              lineHeight: 1,
              padding: "7px 9px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              opacity: 0.84,
            }}
          >
            {feature}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={handleEnterXR}
          disabled={support !== "supported" || sessionState === "active" || sessionState === "starting"}
          style={{
            appearance: "none",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.94)",
            padding: "10px 12px",
            fontSize: 12,
            lineHeight: 1,
            cursor: support === "supported" ? "pointer" : "not-allowed",
            opacity: support === "supported" ? 1 : 0.5,
          }}
        >
          Enter {state.modeLabel}
        </button>

        <button
          type="button"
          onClick={handleExitXR}
          disabled={sessionState !== "active"}
          style={{
            appearance: "none",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.90)",
            padding: "10px 12px",
            fontSize: 12,
            lineHeight: 1,
            cursor: sessionState === "active" ? "pointer" : "not-allowed",
            opacity: sessionState === "active" ? 1 : 0.5,
          }}
        >
          Exit XR
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

type SpeechCue = {
  text: string;
  tone: "calm" | "focused" | "supportive" | "threshold" | "energizing";
  shouldRequestVoice: boolean;
  reason: string;
};

type NarratorDetail = {
  cue?: string;
  archetype?: string;
  intensity?: number;
  speech?: SpeechCue;
};

type VoicePresenceState = {
  enabled: boolean;
  lastSpeech: SpeechCue | null;
  visibleText: string;
  tone: SpeechCue["tone"] | "calm";
  listening: boolean;
};

function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function speak(cue: SpeechCue) {
  if (!canSpeak()) return false;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cue.text);
  utterance.rate = cue.tone === "threshold" ? 0.86 : cue.tone === "energizing" ? 1.02 : 0.92;
  utterance.pitch = cue.tone === "supportive" ? 0.94 : cue.tone === "energizing" ? 1.04 : 1;
  utterance.volume = 0.78;
  window.speechSynthesis.speak(utterance);
  return true;
}

export default function EnvironmentVoicePresence() {
  const [state, setState] = useState<VoicePresenceState>({
    enabled: false,
    lastSpeech: null,
    visibleText: "The environment is listening quietly.",
    tone: "calm",
    listening: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onNarrator = (event: Event) => {
      const detail = (event as CustomEvent<NarratorDetail>).detail;
      const speech = detail?.speech;
      if (!speech) return;

      setState((current) => ({
        ...current,
        lastSpeech: speech,
        visibleText: speech.text,
        tone: speech.tone,
        listening: false,
      }));

      window.dispatchEvent(
        new CustomEvent("urai:voice-presence", {
          detail: {
            status: "ready",
            speech,
            autoplayBlocked: !state.enabled,
          },
        })
      );
    };

    window.addEventListener("urai:narrator", onNarrator);
    return () => window.removeEventListener("urai:narrator", onNarrator);
  }, [state.enabled]);

  const toneLabel = useMemo(() => {
    switch (state.tone) {
      case "focused":
        return "Focused";
      case "supportive":
        return "Supportive";
      case "threshold":
        return "Threshold";
      case "energizing":
        return "Energizing";
      default:
        return "Calm";
    }
  }, [state.tone]);

  const activateVoice = () => {
    setState((current) => ({ ...current, enabled: true }));
    if (state.lastSpeech?.shouldRequestVoice) speak(state.lastSpeech);
  };

  return (
    <aside
      aria-label="URAI environment voice presence"
      data-tone={state.tone}
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 20,
        maxWidth: 320,
        borderRadius: 18,
        padding: "14px 16px",
        background: "rgba(5, 10, 22, 0.72)",
        color: "#f8fbff",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 16px 44px rgba(0,0,0,0.28)",
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: 0.14, textTransform: "uppercase", opacity: 0.7 }}>
        Environment Presence - {toneLabel}
      </div>
      <p style={{ margin: "8px 0 12px", fontSize: 14, lineHeight: 1.45 }}>{state.visibleText}</p>
      <button
        type="button"
        onClick={activateVoice}
        style={{
          border: 0,
          borderRadius: 999,
          padding: "8px 12px",
          background: "rgba(255,255,255,0.92)",
          color: "#07111f",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        {state.enabled ? "Replay voice" : "Enable voice"}
      </button>
    </aside>
  );
}

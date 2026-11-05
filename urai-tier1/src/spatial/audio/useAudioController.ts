"use client";

import { clientApiUrl } from "@/lib/clientApiUrl";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  AmbientTrack,
  NarratorAudioLine,
  SpatialAudioCue,
  SpatialAudioPhase,
  VoiceEngine,
} from "./audioTypes";

const DEFAULT_ENGINE: VoiceEngine = "elevenlabs";

const PHASE_TO_AMBIENT: Record<SpatialAudioPhase, AmbientTrack> = {
  HOME: "home",
  GROUND: "ground",
  ASCENT: "lifemap",
  LIFEMAP: "lifemap",
  FOCUS: "focus",
  REPLAY: "replay",
};

const AMBIENT_SRC: Record<AmbientTrack, string> = {
  home: "/assets/urai/generated/audio/home-ambient-v1.opus",
  ground: "/assets/urai/generated/audio/ground-ambient-v1.opus",
  lifemap: "/assets/urai/generated/audio/life-map-ambient-v1.opus",
  focus: "/assets/urai/generated/audio/focus-ambient-v1.opus",
  replay: "/assets/urai/generated/audio/replay-ambient-v1.opus",
};

const CUE_SRC: Record<SpatialAudioCue, string> = {
  transition: "/assets/urai/generated/audio/portal-transition-v1.opus",
  "orb-confirm": "/assets/urai/generated/audio/orb-confirm-v1.opus",
  error: "/assets/urai/generated/audio/ui-error-v1.opus",
};

function hasWindow() {
  return typeof window !== "undefined";
}

export function useAudioController() {
  const activeEngineRef = useRef<VoiceEngine>(DEFAULT_ENGINE);
  const isSpeakingRef = useRef(false);
  const currentClipIdRef = useRef<string | undefined>(undefined);
  const lastPlayedIdRef = useRef<string | undefined>(undefined);

  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const ambientARef = useRef<HTMLAudioElement | null>(null);
  const ambientBRef = useRef<HTMLAudioElement | null>(null);
  const cueAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAmbientRef = useRef<"A" | "B">("A");
  const ambientTrackRef = useRef<AmbientTrack | null>(null);
  const ambientAttemptRef = useRef(0);
  const fadeRafRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopVoice = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
      voiceAudioRef.current.src = "";
      voiceAudioRef.current = null;
    }
    isSpeakingRef.current = false;
    currentClipIdRef.current = undefined;
    if (hasWindow()) window.dispatchEvent(new CustomEvent("urai-audio-stop-all"));
  }, []);

  const stopAmbient = useCallback(() => {
    ambientAttemptRef.current += 1;
    if (fadeRafRef.current) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
    for (const audio of [ambientARef.current, ambientBRef.current]) {
      if (!audio) continue;
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
      audio.volume = 0;
    }
    ambientTrackRef.current = null;
  }, []);

  const stopCue = useCallback(() => {
    if (!cueAudioRef.current) return;
    cueAudioRef.current.pause();
    cueAudioRef.current.currentTime = 0;
    cueAudioRef.current.src = "";
    cueAudioRef.current = null;
  }, []);

  const stopAllAudio = useCallback(() => {
    stopVoice();
    stopAmbient();
    stopCue();
  }, [stopAmbient, stopCue, stopVoice]);

  const duckAmbient = useCallback((ducked: boolean) => {
    const target = ducked ? 0.18 : 0.56;
    const a = ambientARef.current;
    const b = ambientBRef.current;
    const active = activeAmbientRef.current === "A" ? a : b;
    if (active) active.volume = target;
  }, []);

  const ensureAmbient = useCallback(() => {
    if (!hasWindow()) return;
    if (!ambientARef.current) {
      ambientARef.current = new Audio();
      ambientARef.current.loop = true;
      ambientARef.current.preload = "auto";
      ambientARef.current.volume = 0;
    }
    if (!ambientBRef.current) {
      ambientBRef.current = new Audio();
      ambientBRef.current.loop = true;
      ambientBRef.current.preload = "auto";
      ambientBRef.current.volume = 0;
    }
  }, []);

  const setAmbientPhase = useCallback(
    (phase: SpatialAudioPhase, intensity = 1) => {
      if (!hasWindow()) return;
      ensureAmbient();
      const nextTrack = PHASE_TO_AMBIENT[phase];
      if (ambientTrackRef.current === nextTrack) return;
      const nextSrc = AMBIENT_SRC[nextTrack];
      const current = activeAmbientRef.current === "A" ? ambientARef.current : ambientBRef.current;
      const nextKey = activeAmbientRef.current === "A" ? "B" : "A";
      const next = nextKey === "A" ? ambientARef.current : ambientBRef.current;
      if (!next) return;
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
      next.src = nextSrc;
      next.loop = true;
      next.volume = 0;
      // Track the requested destination while its crossfade is in progress. A
      // quick return must replace that fade, and repeated requests must not
      // restart it before the previous track has finished fading out.
      ambientTrackRef.current = nextTrack;
      const attempt = ++ambientAttemptRef.current;
      void next.play().catch(() => {
        // Release only this attempt so the same route can retry after a
        // playback denial. A retired rejection must not stop a newer track.
        if (ambientAttemptRef.current === attempt) stopAmbient();
      });
      const started = performance.now();
      const duration = phase === "REPLAY" ? 2000 : phase === "FOCUS" ? 1600 : 1300;
      const target = isSpeakingRef.current ? 0.18 : Math.min(0.62, 0.28 + intensity * 0.34);
      const tick = () => {
        const t = Math.min(1, (performance.now() - started) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        next.volume = target * eased;
        if (current) current.volume = Math.max(0, current.volume * (1 - eased));
        if (t < 1) {
          fadeRafRef.current = requestAnimationFrame(tick);
          return;
        }
        if (current) {
          current.pause();
          current.currentTime = 0;
          current.src = "";
          current.volume = 0;
        }
        activeAmbientRef.current = nextKey;
        ambientTrackRef.current = nextTrack;
        fadeRafRef.current = null;
      };
      fadeRafRef.current = requestAnimationFrame(tick);
    },
    [ensureAmbient, stopAmbient],
  );

  const playCue = useCallback((cue: SpatialAudioCue) => {
    if (!hasWindow()) return;
    stopCue();
    const audio = new Audio(CUE_SRC[cue]);
    audio.preload = "auto";
    audio.volume = cue === "error" ? 0.42 : 0.5;
    cueAudioRef.current = audio;
    audio.onended = () => {
      if (cueAudioRef.current === audio) cueAudioRef.current = null;
    };
    void audio.play().catch(() => {
      if (cueAudioRef.current === audio) cueAudioRef.current = null;
    });
  }, [stopCue]);

  const playGoogle = useCallback(async (line: NarratorAudioLine, signal: AbortSignal) => {
    if (!hasWindow()) return;
    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.rate = 0.92;
    utterance.pitch = 0.92;
    utterance.volume = 1;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        utterance.onend = null;
        utterance.onerror = null;
        if (error !== undefined) reject(error);
        else resolve();
      };
      const onAbort = () => {
        // Retire callbacks before cancel(), which may synchronously emit an
        // error on some browsers. A completed utterance must never retain a
        // listener that can cancel a later speech owner.
        finish(new DOMException("aborted", "AbortError"));
        window.speechSynthesis.cancel();
      };
      // This utterance has not been dispatched yet. A prior cancellation
      // must reject locally without stopping another speech owner's output.
      if (signal.aborted) { finish(new DOMException("aborted", "AbortError")); return; }
      signal.addEventListener("abort", onAbort, { once: true });
      utterance.onend = () => finish();
      utterance.onerror = () => finish(new Error("google speech synthesis failed"));
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch (error) { finish(error); }
    });
  }, []);

  const playElevenLabs = useCallback(async (line: NarratorAudioLine, signal: AbortSignal) => {
    if (!hasWindow()) return;
    const res = await fetch(clientApiUrl("/api/voice/elevenlabs"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: line.id, text: line.text, tone: line.tone, voiceHint: line.voiceHint }),
      signal,
    });
    if (!res.ok) throw new Error("elevenlabs request failed");
    const blob = await res.blob();
    // A response body can finish after Stop, unmount or a newer narration.
    // Never turn that retired response into a live media element.
    signal.throwIfAborted();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    voiceAudioRef.current = audio;
    audio.volume = 1;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.src = "";
        URL.revokeObjectURL(url);
        if (voiceAudioRef.current === audio) voiceAudioRef.current = null;
        if (error !== undefined) reject(error);
        else resolve();
      };
      const onAbort = () => finish(new DOMException("aborted", "AbortError"));
      signal.addEventListener("abort", onAbort, { once: true });
      audio.onended = () => finish();
      audio.onerror = () => finish(new Error("elevenlabs audio failed"));
      if (signal.aborted) { onAbort(); return; }
      audio.play().catch((error: unknown) => finish(error ?? new Error("elevenlabs audio failed")));
    });
  }, []);

  const speak = useCallback(async (line: NarratorAudioLine) => {
    if (!hasWindow() || !line?.id || !line?.text || lastPlayedIdRef.current === line.id) return;
    stopVoice();
    const controller = new AbortController();
    abortRef.current = controller;
    isSpeakingRef.current = true;
    currentClipIdRef.current = line.id;
    lastPlayedIdRef.current = line.id;
    duckAmbient(true);
    try {
      if (activeEngineRef.current === "elevenlabs") await playElevenLabs(line, controller.signal);
      else if (activeEngineRef.current === "google") await playGoogle(line, controller.signal);
    } catch {
      if (!controller.signal.aborted && activeEngineRef.current === "elevenlabs") {
        try { await playGoogle(line, controller.signal); } catch { /* silent accessible fallback */ }
      }
    } finally {
      if (!controller.signal.aborted) {
        isSpeakingRef.current = false;
        currentClipIdRef.current = undefined;
        duckAmbient(false);
      }
    }
  }, [duckAmbient, playElevenLabs, playGoogle, stopVoice]);

  const setVoiceEngine = useCallback((engine: VoiceEngine) => { activeEngineRef.current = engine; }, []);

  useEffect(() => () => {
    stopAllAudio();
    if (hasWindow()) window.speechSynthesis?.cancel();
  }, [stopAllAudio]);

  return useMemo(() => ({
    speak,
    stopAllAudio,
    stopAmbient,
    playCue,
    setAmbientPhase,
    setVoiceEngine,
    getAudioState: () => ({ activeEngine: activeEngineRef.current, isSpeaking: isSpeakingRef.current, currentClipId: currentClipIdRef.current }),
  }), [playCue, setAmbientPhase, setVoiceEngine, speak, stopAllAudio, stopAmbient]);
}

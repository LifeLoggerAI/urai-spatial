"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { resolveReadyAmbientAudioPath } from "./ambientAudioManifest";
import type {
  NarratorAudioLine,
  SpatialAudioPhase,
  VoiceEngine,
} from "./audioTypes";

const DEFAULT_ENGINE: VoiceEngine = "elevenlabs";

const PHASE_TO_AMBIENT = {
  HOME: "home",
  ASCENT: "ascent",
  LIFEMAP: "lifemap",
  FOCUS: "focus",
  REPLAY: "replay",
} as const;

function log(_msg: string) {
}

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
  const activeAmbientRef = useRef<"A" | "B">("A");
  const ambientTrackRef = useRef<(typeof PHASE_TO_AMBIENT)[SpatialAudioPhase] | null>(null);
  const fadeRafRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopAllAudio = useCallback(() => {
    log("STOP_ALL");

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

    if (hasWindow()) {
      window.dispatchEvent(new CustomEvent("urai-audio-stop-all"));
    }
  }, []);

  const stopAmbient = useCallback(() => {
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
      ambientARef.current.volume = 0;
    }

    if (!ambientBRef.current) {
      ambientBRef.current = new Audio();
      ambientBRef.current.loop = true;
      ambientBRef.current.volume = 0;
    }
  }, []);

  const setAmbientPhase = useCallback(
    (phase: SpatialAudioPhase, intensity = 1) => {
      if (!hasWindow()) return;

      const nextTrack = PHASE_TO_AMBIENT[phase];
      const nextSrc = resolveReadyAmbientAudioPath(nextTrack);

      if (!nextSrc) {
        stopAmbient();
        window.dispatchEvent(new CustomEvent("urai-audio-ambient-unavailable", {
          detail: { phase, track: nextTrack, fallback: "silence" },
        }));
        return;
      }

      if (ambientTrackRef.current === nextTrack) return;
      ensureAmbient();

      const current = activeAmbientRef.current === "A" ? ambientARef.current : ambientBRef.current;
      const nextKey = activeAmbientRef.current === "A" ? "B" : "A";
      const next = nextKey === "A" ? ambientARef.current : ambientBRef.current;

      if (!next) return;

      if (fadeRafRef.current) {
        cancelAnimationFrame(fadeRafRef.current);
        fadeRafRef.current = null;
      }

      next.src = nextSrc;
      next.loop = true;
      next.volume = 0;
      next.play().catch(() => {
        stopAmbient();
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
        } else {
          if (current) {
            current.pause();
            current.currentTime = 0;
            current.src = "";
            current.volume = 0;
          }
          activeAmbientRef.current = nextKey;
          ambientTrackRef.current = nextTrack;
          fadeRafRef.current = null;
        }
      };

      fadeRafRef.current = requestAnimationFrame(tick);
    },
    [ensureAmbient, stopAmbient],
  );

  const playGoogle = useCallback(async (line: NarratorAudioLine, signal: AbortSignal) => {
    if (!hasWindow()) return;

    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.rate = 0.92;
    utterance.pitch = 0.92;
    utterance.volume = 1;

    await new Promise<void>((resolve, reject) => {
      signal.addEventListener("abort", () => {
        window.speechSynthesis.cancel();
        reject(new DOMException("aborted", "AbortError"));
      });

      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error("google speech synthesis failed"));

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const playElevenLabs = useCallback(async (line: NarratorAudioLine, signal: AbortSignal) => {
    if (!hasWindow()) return;

    const res = await fetch("/api/voice/elevenlabs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: line.id,
        text: line.text,
        tone: line.tone,
        voiceHint: line.voiceHint,
      }),
      signal,
    });

    if (!res.ok) throw new Error("elevenlabs request failed");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    voiceAudioRef.current = audio;
    audio.volume = 1;

    await new Promise<void>((resolve, reject) => {
      signal.addEventListener("abort", () => {
        audio.pause();
        audio.src = "";
        URL.revokeObjectURL(url);
        reject(new DOMException("aborted", "AbortError"));
      });

      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("elevenlabs audio failed"));
      };

      audio.play().catch(reject);
    });
  }, []);

  const speak = useCallback(
    async (line: NarratorAudioLine) => {
      if (!hasWindow()) return;
      if (!line?.id || !line?.text) return;

      if (lastPlayedIdRef.current === line.id) {
        return;
      }

      stopAllAudio();

      const controller = new AbortController();
      abortRef.current = controller;

      isSpeakingRef.current = true;
      currentClipIdRef.current = line.id;
      lastPlayedIdRef.current = line.id;

      duckAmbient(true);

      try {
        if (activeEngineRef.current === "elevenlabs") {
          await playElevenLabs(line, controller.signal);
        } else if (activeEngineRef.current === "google") {
          await playGoogle(line, controller.signal);
        }
      } catch {
        if (!controller.signal.aborted && activeEngineRef.current === "elevenlabs") {
          try {
            await playGoogle(line, controller.signal);
          } catch {
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          isSpeakingRef.current = false;
          currentClipIdRef.current = undefined;
          duckAmbient(false);
        }
      }
    },
    [duckAmbient, playElevenLabs, playGoogle, stopAllAudio],
  );

  const setVoiceEngine = useCallback((engine: VoiceEngine) => {
    activeEngineRef.current = engine;
  }, []);

  useEffect(() => {
    return () => {
      stopAllAudio();
      stopAmbient();
      if (hasWindow()) window.speechSynthesis?.cancel();
    };
  }, [stopAllAudio, stopAmbient]);

  return useMemo(
    () => ({
      speak,
      stopAllAudio,
      setAmbientPhase,
      setVoiceEngine,
      getAudioState: () => ({
        activeEngine: activeEngineRef.current,
        isSpeaking: isSpeakingRef.current,
        currentClipId: currentClipIdRef.current,
        ambientTrack: ambientTrackRef.current,
      }),
    }),
    [setAmbientPhase, speak, stopAllAudio, setVoiceEngine],
  );
}

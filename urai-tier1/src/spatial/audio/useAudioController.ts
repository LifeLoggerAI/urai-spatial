"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  AmbientTrack,
  NarratorAudioLine,
  SpatialAudioCue,
  SpatialAudioPhase,
  VoiceEngine,
} from "./audioTypes";
import { createMirrorSonicIdentity, type MirrorSonicIdentity } from "./mirrorSonicIdentity";

const DEFAULT_ENGINE: VoiceEngine = "elevenlabs";
type FileAmbientTrack = Exclude<AmbientTrack, "mirror">;

const PHASE_TO_AMBIENT: Record<SpatialAudioPhase, AmbientTrack> = {
  HOME: "home",
  GROUND: "ground",
  ASCENT: "lifemap",
  LIFEMAP: "lifemap",
  FOCUS: "focus",
  REPLAY: "replay",
  MIRROR: "mirror",
};

const AMBIENT_SRC: Record<FileAmbientTrack, string> = {
  home: "/assets/urai/generated/audio/home-ambient-v1.opus",
  ground: "/assets/urai/generated/audio/ground-ambient-v1.opus",
  lifemap: "/assets/urai/generated/audio/life-map-ambient-v1.opus",
  focus: "/assets/urai/generated/audio/focus-ambient-v1.opus",
  replay: "/assets/urai/generated/audio/replay-ambient-v1.opus",
};

const CUE_SRC: Partial<Record<SpatialAudioCue, string>> = {
  transition: "/assets/urai/generated/audio/portal-transition-v1.opus",
  "orb-confirm": "/assets/urai/generated/audio/orb-confirm-v1.opus",
  confirm: "/assets/urai/generated/audio/orb-confirm-v1.opus",
  permission: "/assets/urai/generated/audio/orb-confirm-v1.opus",
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
  const ambientLayersRef = useRef(new Map<FileAmbientTrack, HTMLAudioElement>());
  const cueAudioRef = useRef<HTMLAudioElement | null>(null);
  const mirrorIdentityRef = useRef<MirrorSonicIdentity | null>(null);

  const ambientTrackRef = useRef<AmbientTrack | null>(null);
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
    if (fadeRafRef.current) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
    for (const audio of ambientLayersRef.current.values()) {
      if (!audio) continue;
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
      audio.volume = 0;
    }
    ambientLayersRef.current.clear();
    mirrorIdentityRef.current?.stop(0.35);
    mirrorIdentityRef.current = null;
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
    const track = ambientTrackRef.current;
    if (!track) return;
    if (track === "mirror") {
      mirrorIdentityRef.current?.setLevel(ducked ? 0.045 : 0.12, 0.32);
      return;
    }
    const target = ducked ? 0.18 : 0.56;
    const active = ambientLayersRef.current.get(track);
    if (active) active.volume = target;
  }, []);

  const setAmbientPhase = useCallback(
    (phase: SpatialAudioPhase, intensity = 1) => {
      if (!hasWindow()) return;
      const nextTrack = PHASE_TO_AMBIENT[phase];
      if (ambientTrackRef.current === nextTrack) return;
      if (fadeRafRef.current !== null) cancelAnimationFrame(fadeRafRef.current);

      if (nextTrack === "mirror") {
        const starts = new Map([...ambientLayersRef.current].map(([track, audio]) => [track, audio.volume]));
        const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
          stopAmbient();
          return;
        }
        mirrorIdentityRef.current?.stop(0.2);
        const context = new AudioContextCtor();
        const identity = createMirrorSonicIdentity(context);
        mirrorIdentityRef.current = identity;
        ambientTrackRef.current = "mirror";
        void context.resume().catch(() => undefined);
        identity.setLevel(isSpeakingRef.current ? 0.045 : Math.min(0.14, 0.08 + intensity * 0.04), 1.8);
        const started = performance.now();
        const duration = 1800;
        const tick = () => {
          const t = Math.min(1, (performance.now() - started) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          for (const [track, audio] of ambientLayersRef.current) {
            const start = starts.get(track) ?? 0;
            audio.volume = Math.max(0, start * (1 - eased));
            if (t === 1) {
              audio.pause();
              audio.currentTime = 0;
              audio.src = "";
              ambientLayersRef.current.delete(track);
            }
          }
          if (t < 1) fadeRafRef.current = requestAnimationFrame(tick);
          else fadeRafRef.current = null;
        };
        fadeRafRef.current = requestAnimationFrame(tick);
        return;
      }

      const retiringMirror = mirrorIdentityRef.current;
      if (retiringMirror) {
        retiringMirror.setLevel(0, 1.3);
        window.setTimeout(() => retiringMirror.stop(0.1), 1320);
        mirrorIdentityRef.current = null;
      }

      const layers = ambientLayersRef.current;
      let next = layers.get(nextTrack);
      if (!next) {
        next = new Audio(AMBIENT_SRC[nextTrack]);
        next.loop = true;
        next.preload = "auto";
        next.volume = 0;
        layers.set(nextTrack, next);
      }
      const incoming = next;
      const starts = new Map([...layers].map(([track, audio]) => [track, audio.volume]));
      ambientTrackRef.current = nextTrack;
      void incoming.play().catch(() => {
        if (ambientTrackRef.current === nextTrack) ambientTrackRef.current = null;
      });
      const started = performance.now();
      const duration = phase === "REPLAY" ? 2000 : phase === "FOCUS" ? 1600 : 1300;
      const tick = () => {
        const t = Math.min(1, (performance.now() - started) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const target = isSpeakingRef.current ? 0.18 : Math.min(0.62, 0.28 + intensity * 0.34);
        for (const [track, audio] of layers) {
          const start = starts.get(track) ?? 0;
          audio.volume = Math.max(0, Math.min(1, start + ((track === nextTrack ? target : 0) - start) * eased));
        }
        if (t < 1) {
          fadeRafRef.current = requestAnimationFrame(tick);
          return;
        }
        for (const [track, audio] of layers) {
          if (track === nextTrack) continue;
          audio.pause();
          audio.currentTime = 0;
          audio.src = "";
          layers.delete(track);
        }
        fadeRafRef.current = null;
      };
      fadeRafRef.current = requestAnimationFrame(tick);
    },
    [stopAmbient],
  );

  const playCue = useCallback((cue: SpatialAudioCue) => {
    if (!hasWindow()) return;
    stopCue();
    const src = CUE_SRC[cue];
    if (!src) return;
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = cue === "error" ? 0.42 : cue === "permission" ? 0.28 : 0.5;
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
      body: JSON.stringify({ id: line.id, text: line.text, tone: line.tone, voiceHint: line.voiceHint }),
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
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error("elevenlabs audio failed")); };
      audio.play().catch(reject);
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

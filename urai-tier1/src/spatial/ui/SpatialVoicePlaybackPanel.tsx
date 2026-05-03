"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSpatialAccountStore } from "@/spatial/account/spatialAccountStore";
import { useSpatialCompareStore } from "@/spatial/compare/spatialCompareStore";
import { useSpatialLensStore } from "@/spatial/lenses/spatialLensStore";
import { buildSpatialNarratorExport } from "@/spatial/narrator/buildSpatialNarratorExport";
import { useSpatialVoicePlaybackStore } from "@/spatial/narrator/spatialVoicePlaybackStore";
import { readSpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceIO";

export default function SpatialVoicePlaybackPanel() {
  const activeAccountId = useSpatialAccountStore((s) => s.activeAccountId);
  const profiles = useSpatialAccountStore((s) => s.profiles);

  const activeLensId = useSpatialLensStore((s) => s.activeLensId);
  const lenses = useSpatialLensStore((s) => s.lenses);

  const compareSets = useSpatialCompareStore((s) => s.sets);

  const status = useSpatialVoicePlaybackStore((s) => s.status);
  const voiceURI = useSpatialVoicePlaybackStore((s) => s.voiceURI);
  const rate = useSpatialVoicePlaybackStore((s) => s.rate);
  const pitch = useSpatialVoicePlaybackStore((s) => s.pitch);
  const volume = useSpatialVoicePlaybackStore((s) => s.volume);
  const availableVoiceCount = useSpatialVoicePlaybackStore((s) => s.availableVoiceCount);
  const lastError = useSpatialVoicePlaybackStore((s) => s.lastError);

  const setStatus = useSpatialVoicePlaybackStore((s) => s.setStatus);
  const setVoiceURI = useSpatialVoicePlaybackStore((s) => s.setVoiceURI);
  const setRate = useSpatialVoicePlaybackStore((s) => s.setRate);
  const setPitch = useSpatialVoicePlaybackStore((s) => s.setPitch);
  const setVolume = useSpatialVoicePlaybackStore((s) => s.setVolume);
  const setAvailableVoiceCount = useSpatialVoicePlaybackStore((s) => s.setAvailableVoiceCount);
  const setLastError = useSpatialVoicePlaybackStore((s) => s.setLastError);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const snapshot = useMemo(() => readSpatialPersistenceSnapshot(), [
    activeAccountId,
    activeLensId,
    compareSets.length,
  ]);

  const activeProfile = useMemo(
    () => profiles.find((item) => item.id === activeAccountId) ?? null,
    [profiles, activeAccountId],
  );

  const activeLens = useMemo(
    () => lenses.find((item) => item.id === activeLensId) ?? null,
    [lenses, activeLensId],
  );

  const activeCompareSet = useMemo(() => {
    if (!activeLens?.compareSetId) {
      return compareSets.length > 0 ? compareSets[compareSets.length - 1] : null;
    }
    return compareSets.find((item) => item.id === activeLens.compareSetId) ?? null;
  }, [compareSets, activeLens]);

  const exportPackage = useMemo(() => {
    if (!snapshot || !activeLens || !activeCompareSet) return null;

    return buildSpatialNarratorExport({
      accountId: activeAccountId ?? "default-account",
      accountLabel:
        (activeProfile as { displayName?: string; label?: string; name?: string } | null)
          ?.displayName ??
        (activeProfile as { label?: string; name?: string } | null)?.label ??
        (activeProfile as { label?: string; name?: string } | null)?.name ??
        activeAccountId ??
        "Default Account",
      activeLens,
      activeCompareSet,
      compareSetCount: compareSets.length,
      snapshot,
    });
  }, [
    snapshot,
    activeAccountId,
    activeProfile,
    activeLens,
    activeCompareSet,
    compareSets.length,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const syncVoices = () => {
      const next = window.speechSynthesis.getVoices();
      setVoices(next);
      setAvailableVoiceCount(next.length);

      if (!voiceURI && next.length > 0) {
        setVoiceURI(next[0].voiceURI);
      }
    };

    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, [voiceURI, setAvailableVoiceCount, setVoiceURI]);

  const selectedVoice = useMemo(
    () => voices.find((item) => item.voiceURI === voiceURI) ?? null,
    [voices, voiceURI],
  );

  const stop = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("idle");
  };

  const play = () => {
    if (!exportPackage) {
      setLastError("no narrator export available");
      setStatus("error");
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setLastError("speech synthesis unavailable");
      setStatus("error");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(exportPackage.scriptText);
    utterance.voice = selectedVoice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onstart = () => {
      setLastError(null);
      setStatus("playing");
    };

    utterance.onend = () => {
      utteranceRef.current = null;
      setStatus("idle");
    };

    utterance.onerror = () => {
      utteranceRef.current = null;
      setLastError("speech playback failed");
      setStatus("error");
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const panelStyle: CSSProperties = {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 80,
    width: 320,
    padding: 12,
    borderRadius: 12,
    background: "rgba(6,12,28,0.84)",
    color: "#fff",
    border: "1px solid rgba(180,220,255,0.16)",
    display: "grid",
    gap: 8,
  };

  return (
    <div style={panelStyle}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Voice Playback</div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        status: {status} · voices: {availableVoiceCount}
      </div>
      {lastError ? <div style={{ fontSize: 12, color: "#ff9b9b" }}>{lastError}</div> : null}
      <div style={{ display: "grid", gap: 6 }}>
        <button onClick={play} type="button">
          Play
        </button>
        <button onClick={stop} type="button">
          Stop
        </button>
      </div>
    </div>
  );
}

"use client";

import type { CSSProperties } from "react";
import type { SpatialCompareSet as SpatialCompareSetContract } from "../compare/spatialCompareTypes";
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

  const activeAccountLabel =
    ((activeProfile as { label?: string; name?: string } | null)?.label ??
      (activeProfile as { label?: string; name?: string } | null)?.name ??
      activeAccountId);
    if (!activeLens?.compareSetId) {
      return compareSets.length > 0 ? compareSets[compareSets.length - 1] : null;
    }
    return compareSets.find((item) => item.id === activeLens.compareSetId) ?? null;
  }, [compareSets, activeLens]);

  const exportPackage = useMemo(() => {
    if (!snapshot) return null;
    const normalizedActiveCompareSet = toSpatialCompareSetContract(activeCompareSet)
      ? ({
          ...(toSpatialCompareSetContract(activeCompareSet) as Record<string, unknown>),
          label:
            (toSpatialCompareSetContract(activeCompareSet) as { label?: string; id?: string }).label ??
            (toSpatialCompareSetContract(activeCompareSet) as { label?: string; id?: string }).id ??
            "Compare Set",
        } as any)
      : null;

    return buildSpatialNarratorExport({
      accountId: activeAccountId,
      accountLabel: ((activeProfile as { label?: string; name?: string } | null)?.label ?? (activeProfile as { label?: string; name?: string } | null)?.name ?? activeAccountId),
      activeLens,
      activeCompareSet: toSpatialCompareSetContract(activeCompareSet),
      compareSetCount: compareSets.length,
      snapshot,
    });
  }, [
    snapshot,
    activeAccountId,
    activeProfile,
    activeLens,
    toSpatialCompareSetContract(activeCompareSet),
    compareSets.length,
  ]);

  const bundle = useMemo(() => {
  const normalizedActiveCompareSet = toSpatialCompareSetContract(activeCompareSet)
    ? ({
        ...(toSpatialCompareSetContract(activeCompareSet) as Record<string, unknown>),
        label:
          (toSpatialCompareSetContract(activeCompareSet) as { label?: string; id?: string }).label ??
          (toSpatialCompareSetContract(activeCompareSet) as { label?: string; id?: string }).id ??
          "Compare Set",
      } as any)
    : null;
    if (!snapshot) return null;
    const normalizedArcs = toSpatialNarrativeArcs(arcs);
    const normalizedSeasonalArcs = seasonalArcs;
    return buildSpatialNarratorExport({
      accountId: activeAccountId,
      accountLabel: ((activeProfile as { label?: string; name?: string } | null)?.label ?? (activeProfile as { label?: string; name?: string } | null)?.name ?? activeAccountId),
      activeLens,
      activeCompareSet: toSpatialCompareSetContract(activeCompareSet),
      compareSetCount: compareSets.length,
      snapshot,
    });
  }, [
    snapshot,
    activeAccountId,
    activeProfile,
    activeLens,
    toSpatialCompareSetContract(activeCompareSet),
    compareSets.length,
  ]);

    return buildSpatialNarratorExport({
      accountId: activeAccountId,
      accountLabel: ((activeProfile as { label?: string; name?: string } | null)?.label ?? (activeProfile as { label?: string; name?: string } | null)?.name ?? activeAccountId),
      activeLens,
      activeCompareSet: toSpatialCompareSetContract(activeCompareSet),
      compareSetCount: compareSets.length,
      snapshot,
    });
  }, [
    snapshot,
    activeAccountId,
    activeProfile,
    activeLens,
    toSpatialCompareSetContract(activeCompareSet),
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
      setStatus("ended");
    };

    utterance.onpause = () => {
      setStatus("paused");
    };

    utterance.onresume = () => {
      setStatus("playing");
    };

    utterance.onerror = (event) => {
      setLastError(event.error || "speech synthesis error");
      setStatus("error");
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  };

  const resume = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.resume();
    setStatus("playing");
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 18,
        bottom: 190,
        zIndex: 67,
        width: 330,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(8,12,24,0.80)",
        backdropFilter: "blur(14px)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
        padding: 14,
        color: "rgba(255,255,255,0.92)",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: 1.1,
          textTransform: "uppercase",
          opacity: 0.68,
          marginBottom: 8,
        }}
      >
        Voice Playback
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        status: {status}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        voices: {availableVoiceCount}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76, marginBottom: 10 }}>
        selected voice: {selectedVoice?.name ?? "default"}
      </div>

      <select
        value={voiceURI ?? ""}
        onChange={(e) => setVoiceURI(e.target.value || null)}
        style={selectStyle}
      >
        {voices.length === 0 ? <option value="">default</option> : null}
        {voices.map((voice) => (
          <option key={voice.voiceURI} value={voice.voiceURI}>
            {voice.name} · {voice.lang}
          </option>
        ))}
      </select>

      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        <label style={labelStyle}>
          <span>Rate: {rate.toFixed(2)}</span>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </label>

        <label style={labelStyle}>
          <span>Pitch: {pitch.toFixed(2)}</span>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
          />
        </label>

        <label style={labelStyle}>
          <span>Volume: {volume.toFixed(2)}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        <button type="button" onClick={play} style={buttonStyle}>
          Play
        </button>
        <button type="button" onClick={pause} style={buttonStyle}>
          Pause
        </button>
        <button type="button" onClick={resume} style={buttonStyle}>
          Resume
        </button>
        <button type="button" onClick={stop} style={buttonStyle}>
          Stop
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        error: {lastError ?? "none"}
      </div>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  appearance: "none",
  width: "100%",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  fontSize: 13,
  padding: "10px 12px",
  textAlign: "left",
  cursor: "pointer",
};

const selectStyle: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  fontSize: 12,
  padding: "10px 12px",
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  opacity: 0.82,
};

function toSpatialCompareSetContract(
  input: unknown,
): SpatialCompareSetContract | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  return {
    ...(v as SpatialCompareSetContract),
    label:
      typeof v.label === "string" && v.label.trim().length > 0
        ? v.label
        : typeof v.name === "string" && v.name.trim().length > 0
          ? v.name
          : typeof v.id === "string" && v.id.trim().length > 0
            ? v.id
            : "compare-set",
  };
}

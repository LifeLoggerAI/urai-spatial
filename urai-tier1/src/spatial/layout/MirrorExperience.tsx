"use client";

import { useMemo, useState } from "react";
import styles from "./MirrorExperience.module.css";

type MirrorState = "demo" | "ready" | "low_data" | "paused" | "error" | "loading";

type SignalSource = {
  id: string;
  label: string;
  enabled: boolean;
  sensitivity: "low" | "medium" | "high";
  note: string;
};

type MirrorInsight = {
  id: string;
  title: string;
  body: string;
  confidence: "low" | "medium" | "high";
  sensitivity: "low" | "medium" | "high";
  explanation: string;
  sources: string[];
};

const signalSources: SignalSource[] = [
  {
    id: "app_rhythm",
    label: "App rhythm",
    enabled: true,
    sensitivity: "low",
    note: "Timing and interaction rhythm approved for reflection.",
  },
  {
    id: "mood_context",
    label: "Mood context",
    enabled: true,
    sensitivity: "medium",
    note: "Saved mood context and gentle recovery markers.",
  },
  {
    id: "recovery_patterns",
    label: "Recovery patterns",
    enabled: true,
    sensitivity: "medium",
    note: "Recent rest, return, and rebound signals.",
  },
  {
    id: "passive_context",
    label: "Passive context",
    enabled: false,
    sensitivity: "high",
    note: "Paused until the user explicitly enables it.",
  },
];

const demoInsights: MirrorInsight[] = [
  {
    id: "quiet-rhythm",
    title: "Your rhythm looks quieter today",
    body: "Recent activity suggests a slower field. This may be a good moment for recovery, focus, or simply doing less.",
    confidence: "medium",
    sensitivity: "medium",
    explanation: "Based on recent changes in approved app rhythm and saved mood context. This is a reflection, not a verdict.",
    sources: ["App rhythm", "Mood context"],
  },
  {
    id: "soft-recovery",
    title: "A gentle recovery pattern may be emerging",
    body: "The field is showing signs of steadier pacing. URAI will only surface this kind of pattern when enough approved signal exists.",
    confidence: "low",
    sensitivity: "medium",
    explanation: "Based on recovery markers and interaction timing. It does not diagnose or predict a crisis.",
    sources: ["Recovery patterns"],
  },
];

const stateCopy: Record<MirrorState, { label: string; body: string }> = {
  loading: {
    label: "Reading today’s field...",
    body: "URAI is preparing a private reflection from approved signals.",
  },
  low_data: {
    label: "Your mirror is quiet today.",
    body: "URAI needs more approved context before showing a meaningful pattern.",
  },
  ready: {
    label: "Your reflection is ready.",
    body: "Tap the orb or begin reflection to reveal a gentle pattern.",
  },
  demo: {
    label: "Demo field active.",
    body: "Real reflections appear when your private signal sources are connected.",
  },
  error: {
    label: "Reflection could not load.",
    body: "Try again or view the demo field without connecting private data.",
  },
  paused: {
    label: "Mirror is paused.",
    body: "Reflection is stopped until signal sources are enabled again.",
  },
};

export function MirrorExperience() {
  const [isRevealed, setIsRevealed] = useState(false);
  const [drawer, setDrawer] = useState<"why" | "privacy" | null>(null);
  const [tone, setTone] = useState<"gentle" | "direct" | "quiet">("gentle");
  const mirrorState: MirrorState = isRevealed ? "ready" : "demo";
  const copy = stateCopy[mirrorState];
  const activeSources = useMemo(() => signalSources.filter((source) => source.enabled), []);

  const revealReflection = () => setIsRevealed(true);

  return (
    <section className={styles.shell} data-testid="mirror-launch-lock" aria-label="URAI private reflection field">
      <div className={styles.hero}>
        <div className={styles.eyebrow}>MIRROR</div>
        <h1>Your private reflection field</h1>
        <p>
          URAI turns today’s approved signals into a calm visual mirror — mood, rhythm, recovery,
          and patterns you can choose to explore.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryButton} onClick={revealReflection}>
            Begin Reflection
          </button>
          <button type="button" className={styles.secondaryButton} onClick={() => setDrawer("why")}>
            Why am I seeing this?
          </button>
        </div>
      </div>

      <button type="button" className={styles.trustPill} onClick={() => setDrawer("privacy")}>
        Private reflection · Explainable · User-controlled
      </button>

      <button
        type="button"
        className={`${styles.orbTarget} ${isRevealed ? styles.orbTargetRevealed : ""}`}
        onClick={revealReflection}
        aria-label="Reveal your current Mirror reflection"
      >
        <span className={styles.orbHalo} aria-hidden="true" />
        <span className={styles.orbRing} aria-hidden="true" />
        <span className={styles.orbRing} aria-hidden="true" />
        <span className={styles.orbRing} aria-hidden="true" />
        <span className={styles.orbLabel}>Today’s field is forming</span>
        <span className={styles.orbHelper}>Tap the orb to reveal your current reflection.</span>
      </button>

      <div className={styles.ringLabels} aria-hidden="true">
        <span>Mood</span>
        <span>Rhythm</span>
        <span>Recovery</span>
      </div>

      <aside className={styles.statusPanel} aria-live="polite">
        <div className={styles.eyebrow}>Reflection status</div>
        <h2>{copy.label}</h2>
        <p>{copy.body}</p>
        <div className={styles.statusGrid}>
          <span>Mode <strong>Private</strong></span>
          <span>Signals <strong>{activeSources.length} approved</strong></span>
          <span>Tone <strong>{tone}</strong></span>
        </div>
        <div className={styles.toneControl} aria-label="Reflection tone">
          {(["gentle", "direct", "quiet"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={tone === item ? styles.toneActive : undefined}
              onClick={() => setTone(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </aside>

      {isRevealed ? (
        <aside className={styles.insightPanel} data-testid="mirror-insight-panel">
          <div className={styles.eyebrow}>Today’s mirror</div>
          <h2>A gentle pattern may be emerging</h2>
          <p className={styles.safetyNote}>This is a reflection, not a verdict. You decide what feels true.</p>
          <div className={styles.insightList}>
            {demoInsights.map((insight) => (
              <article className={styles.insightCard} key={insight.id}>
                <div className={styles.insightMeta}>Confidence: {insight.confidence} · Sensitivity: {insight.sensitivity}</div>
                <h3>{insight.title}</h3>
                <p>{insight.body}</p>
                <div className={styles.insightActions}>
                  <button type="button" onClick={() => setDrawer("why")}>Why this?</button>
                  <button type="button">This feels right</button>
                  <button type="button">Not accurate</button>
                  <button type="button">Hide similar</button>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.exportActions}>
            <button type="button">Save Reflection</button>
            <button type="button">Export Reflection Card</button>
          </div>
          <p className={styles.exportNote}>Reflection cards are private unless you choose to export them.</p>
        </aside>
      ) : null}

      <div className={styles.compass} aria-label="Field compass">
        <span>N</span>
        <strong>Field Compass</strong>
      </div>

      {drawer ? (
        <div className={styles.drawerBackdrop} role="presentation" onClick={() => setDrawer(null)}>
          <aside
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label={drawer === "why" ? "What shaped this reflection" : "Privacy and safety"}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className={styles.drawerClose} onClick={() => setDrawer(null)} aria-label="Close Mirror drawer">
              Close
            </button>
            {drawer === "why" ? <WhyDrawer /> : <PrivacyDrawer />}
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function WhyDrawer() {
  return (
    <>
      <div className={styles.eyebrow}>Explainability</div>
      <h2>What shaped this reflection?</h2>
      <p>
        URAI uses approved signals to form gentle patterns. You can inspect, pause, or remove any source.
        This reflection does not diagnose you.
      </p>
      <div className={styles.sourceList}>
        {signalSources.map((source) => (
          <article key={source.id}>
            <span>{source.enabled ? "Enabled" : "Paused"}</span>
            <h3>{source.label}</h3>
            <p>{source.note}</p>
          </article>
        ))}
      </div>
      <div className={styles.drawerActions}>
        <button type="button">Manage signal sources</button>
        <button type="button">Pause Mirror</button>
        <button type="button">Hide reflections like this</button>
      </div>
    </>
  );
}

function PrivacyDrawer() {
  return (
    <>
      <div className={styles.eyebrow}>Privacy & safety</div>
      <h2>Your mirror is private by default.</h2>
      <p>
        Reflections are generated from approved signals and can be paused, corrected, or deleted. URAI supports
        reflection, but it does not diagnose or replace emergency care.
      </p>
      <div className={styles.boundaryBox}>
        <strong>Not used without consent</strong>
        <span>Raw audio, private messages, medical diagnosis, crisis prediction, or hidden surveillance.</span>
      </div>
      <div className={styles.drawerActions}>
        <button type="button">Manage signal sources</button>
        <button type="button">Pause Mirror</button>
        <button type="button">Delete today’s reflection</button>
      </div>
    </>
  );
}

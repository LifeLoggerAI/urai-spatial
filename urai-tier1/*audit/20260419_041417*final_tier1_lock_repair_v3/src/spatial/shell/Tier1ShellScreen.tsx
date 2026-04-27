import FocusShellOverlay from "./FocusShellOverlay";
import ReplayShellOverlay from "./ReplayShellOverlay";
'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
// PASS3_DISABLED_OVERLAY
// PASS3_DISABLED_OVERLAY
import Tag from "./Tag";
import Tier1SceneAtmosphere from "./Tier1SceneAtmosphere";
import {
  BODY_TEXT_CLASS,
  BOTTOM_DOCK_CLASS,
  DEFAULT_MAP_DWELL_MS,
  DIVE_PULSE_MS,
  GHOST_BUTTON_CLASS,
  PANEL_CLASS,
  PRIMARY_BUTTON_CLASS,
  RETURN_STEP_MS,
  SECONDARY_BUTTON_CLASS,
  SIDE_DOCK_CLASS,
  SKY_HOLD_MS,
  TITLE_CLASS,
  type Tier1Phase,
} from "./Tier1ShellConstants";

type AnyRecord = Record<string, unknown>;

function normalizePhase(value: any): Tier1Phase {
  const input = String(value ?? "").toLowerCase();
  if (input.includes("REPLAY")) return "REPLAY";
  if (input.includes("FOCUS")) return "FOCUS";
  if (input.includes("life")) return "LIFEMAP";
  if (input.includes("sky")) return "sky";
  return "HOME";
}

function firstArray(...values: any[]) {
  for (const value of values) {
    if (Array.isArray(value)) return value as AnyRecord[];
  }
  return [] as AnyRecord[];
}

function firstText(...values: any[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function pickFn(props: AnyRecord, names: string[]) {
  for (const name of names) {
    const value = props[name];
    if (typeof value === "function") return value as (...args: any[]) => void;
  }
  return null;
}

function itemTitle(item: AnyRecord | undefined, index: number) {
}

const fallbackItems: AnyRecord[] = [
  { id: "threshold-one", title: "Threshold One", chapter: "Origin", emotion: "steady" },
  { id: "threshold-two", title: "Threshold Two", chapter: "Ascent", emotion: "echo" },
];

export type Tier1ShellScreenProps = Record<string, unknown>;

export function Tier1ShellScreen(rawProps: Tier1ShellScreenProps) {
  const props = rawProps as AnyRecord;

  const items = useMemo(
    () =>
      firstArray(
        props.items,
        props.nodes,
        props.memories,
        props.stars,
        props.data,
      ).filter(Boolean) as AnyRecord[],
    [props.items, props.nodes, props.memories, props.stars, props.data],
  );

  const shellItems = items.length ? items : fallbackItems;
  const initialPhase = normalizePhase(props.phase ?? props.mode ?? props.screen);
  const [phase, setPhase] = useState<Tier1Phase>(initialPhase);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [pulseKey, setPulseKey] = useState(0);

  const timers = useRef<number[]>([]);
  const selected = shellItems[selectedIndex] ?? fallbackItems[0];

  const enterReplayExternal = pickFn(props, ["onEnterReplay", "enterReplay", "onReplay"]);
  const exitReplayExternal = pickFn(props, ["onExitReplay", "exitReplay", "onResumeFocus"]);
  const returnHomeExternal = pickFn(props, ["onReturnHome", "returnHome", "onHome"]);
  const selectExternal = pickFn(props, ["onSelectNode", "onSelectStar", "onSelectMemory", "selectNode", "selectStar"]);
  const clearExternal = pickFn(props, ["onClearFocus", "clearFocus", "onClear"]);
  const phaseExternal = pickFn(props, ["onShellPhaseChange", "onPhaseChange", "setPhase"]);
  const enterLifeMapExternal = pickFn(props, ["onEnterLifemap", "enterLifemap", "onEnterLifeMap"]);

  function clearTimers() {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }

    function schedule(ms: number, fn: () => void) {
      const id = window.setTimeout(fn, ms);
      timers.current.push(id);
    }

  function commitPhase(next: Tier1Phase) {
    setPhase(next);
    phaseExternal?.(next);
  }

  function pulse() {
    setPulseKey((value) => value + 1);
  }

  function selectIndex(nextIndex: number) {
    const clamped = ((nextIndex % shellItems.length) + shellItems.length) % shellItems.length;
    setSelectedIndex(clamped);
    const item = shellItems[clamped];
    selectExternal?.(item, clamped, item?.id);
  }

  useEffect(() => {
    document.documentElement.dataset.uraiPhase = phase;
    return () => {
      delete document.documentElement.dataset.uraiPhase;
    };
  }, [phase]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    const selectedId = props.selectedId;
    if (!selectedId) return;
    const idx = shellItems.findIndex((item) => String(item.id ?? item.slug ?? "") === String(selectedId));
    if (idx >= 0) setSelectedIndex(idx);
  }, [props.selectedId, shellItems]);

  useEffect(() => {
    const controlledPhase = props.phase ?? props.mode ?? props.screen;
    if (controlledPhase == null) return;
    const next = normalizePhase(controlledPhase);
    setPhase((current) => (current === next ? current : next));
  }, [props.phase, props.mode, props.screen]);

  function runEnterLifeMap() {
    clearTimers();
    pulse();
    commitPhase("sky");
    enterLifeMapExternal?.();
    schedule(SKY_HOLD_MS, () => {
      commitPhase("LIFEMAP");
    });
  }

  function runResumeFocus() {
    clearTimers();
    pulse();
    commitPhase("FOCUS");
  }

  function runEnterReplay() {
    clearTimers();
    pulse();
    commitPhase("REPLAY");
    enterReplayExternal?.(selected, selectedIndex);
  }

  function runExitReplay() {
    clearTimers();
    pulse();
    commitPhase("FOCUS");
    exitReplayExternal?.(selected, selectedIndex);
  }

  function runClearFocus() {
    clearTimers();
    pulse();
    commitPhase("LIFEMAP");
    clearExternal?.();
  }

  function runReturnHome() {
    clearTimers();
    pulse();
    commitPhase(phase === "REPLAY" ? "FOCUS" : "LIFEMAP");
    schedule(RETURN_STEP_MS, () => commitPhase("sky"));
    schedule(RETURN_STEP_MS * 2, () => {
      commitPhase("HOME");
      returnHomeExternal?.();
    });
  }

  const title = itemTitle(selected, selectedIndex);
  const chapter = firstText(selected.chapter, props.chapter) || "current";
  const emotion = firstText(selected.emotion, props.emotion) || "steady";

  const HomeDock = (
    <div className={SIDE_DOCK_CLASS}>
      <div className={[PANEL_CLASS, "space-y-3"].join(" ")}>
        <div className="flex items-center justify-between gap-2">
          <Tag>Home</Tag>
          <Tag>Tier 1</Tag>
        </div>
        <div className={TITLE_CLASS}></div>
        <p className={BODY_TEXT_CLASS}>
          Shell weight reduced. Scene atmosphere now carries phase identity while the Tier 1 dock only exposes core actions.
        </p>
        <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={runEnterLifeMap}>

        </button>
      </div>
    </div>
  );

  const LifeMapDock = (
    <div className={BOTTOM_DOCK_CLASS}>
      <div className={[PANEL_CLASS, "space-y-3"].join(" ")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Tag>LifeMap</Tag>
            <Tag>{chapter}</Tag>
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Dwell before focus · {DEFAULT_MAP_DWELL_MS}ms
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {shellItems.map((item, index) => {
            const active = index === selectedIndex;
            return (
              <button
                type="button"
                onClick={() => selectIndex(index)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  active
                    ? "border-cyan-300/24 bg-cyan-500/12 text-cyan-100"
                    : "border-white/10 bg-white/6 text-slate-200 hover:bg-white/10",
                ].join(" ")}
              >
                {itemTitle(item, index)}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={runResumeFocus}>
            Resume Focus
          </button>
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => selectIndex(selectedIndex + 1)}>
            Alternate Star
          </button>
          <button type="button" className={GHOST_BUTTON_CLASS} onClick={runReturnHome}>
            Home
          </button>
        </div>
      </div>
    </div>
  );

  const SkyTransit = (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex justify-center">
      <div className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100 backdrop-blur-md">
        Sky transit
      </div>
    </div>
  );

  return (
    <>
      <Tier1SceneAtmosphere phase={phase} pulseKey={pulseKey} title={phase === "FOCUS" || phase === "REPLAY" ? title : ""} />

      <div className="pointer-events-none fixed right-6 top-5 z-[85]">
        <Tag>{phase.toUpperCase()}</Tag>
      </div>

      {phase === "HOME" && HomeDock}
      {phase === "sky" && SkyTransit}
      {phase === "LIFEMAP" && LifeMapDock}

      {phase === "FOCUS" && (
        <FocusShellOverlay
          visible
          node={selected}
          memory={selected}
          title={title}
          chapter={chapter}
          emotion={emotion}
          onEnterReplay={runEnterReplay}
          onClearFocus={runClearFocus}
          onReturnHome={runReturnHome}
        />
      )}

      {phase === "REPLAY" && (
        <ReplayShellOverlay
          visible
          node={selected}
          memory={selected}
          title={title}
          chapter={chapter}
          emotion={emotion}
          onExitReplay={runExitReplay}
          onReturnHome={runReturnHome}
        />
      )}
    </>
  );
}

export default Tier1ShellScreen;

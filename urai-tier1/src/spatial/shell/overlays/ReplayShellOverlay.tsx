'use client';

import React from "react";
import {
  BODY_TEXT_CLASS,
  GHOST_BUTTON_CLASS,
  PANEL_STRONG_CLASS,
  PRIMARY_BUTTON_CLASS,
  SIDE_DOCK_CLASS,
  TITLE_CLASS,
} from "../Tier1ShellConstants";
import ReplayDatum from "../ReplayDatum";
import Tag from "../Tag";

export type ReplayShellOverlayProps = Record<string, unknown>;

function firstText(...values: any[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function pickFn(props: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const value = props[name];
    if (typeof value === "function") return value as (...args: any[]) => void;
  }
  return null;
}

function asRecord(value: any) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function ReplayShellOverlay(rawProps: ReplayShellOverlayProps) {
  const props = rawProps as Record<string, unknown>;
  if (props.hidden === true || props.visible === false) return null;

  const node = asRecord(props.node);
  const memory = asRecord(props.memory);

  const title =
    firstText(
      props.title,
      memory.title,
      node.title,
      node.name,
      memory.name,
      props.label,
    ) || "Replay Active";

  const chapter =
    firstText(props.chapter, memory.chapter, node.chapter) || "current";

  const emotion =
    firstText(props.emotion, memory.emotion, node.emotion) || "echo";

  const summary =
    firstText(
      props.summary,
      memory.summary,
      memory.description,
      node.summary,
      node.description,
    ) || "Replay is still a Tier 1 dock, but now has dedicated scene atmosphere and reduced shell weight.";

  const exitReplay = pickFn(props, ["onExitReplay", "exitReplay", "onResumeFocus"]);
  const returnHome = pickFn(props, ["onReturnHome", "returnHome", "onHome"]);

  return (
    <div className={SIDE_DOCK_CLASS}>
      <div className={[PANEL_STRONG_CLASS, "space-y-3 border-fuchsia-300/14 bg-slate-950/62"].join(" ")}>
        <div className="flex items-center justify-between gap-2">
          <Tag className="border-fuchsia-300/24 bg-fuchsia-500/10 text-fuchsia-100">Replay</Tag>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{chapter}</div>
        </div>

        <div className={TITLE_CLASS}>{title}</div>
        <p className={BODY_TEXT_CLASS}>{summary}</p>

        <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
          <ReplayDatum label="Mode" value="Replay" />
          <ReplayDatum label="Emotion" value={emotion} />
          <ReplayDatum label="Chapter" value={chapter} />
        </div>

        <div className="grid gap-2 pt-1">
          <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => exitReplay?.()}>
            Exit Replay
          </button>
          <button type="button" className={GHOST_BUTTON_CLASS} onClick={() => returnHome?.()}>
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReplayShellOverlay;

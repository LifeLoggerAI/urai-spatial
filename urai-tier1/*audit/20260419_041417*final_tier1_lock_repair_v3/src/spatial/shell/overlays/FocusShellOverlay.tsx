'use client';

import React from "react";
import {
  BODY_TEXT_CLASS,
  GHOST_BUTTON_CLASS,
  PANEL_STRONG_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SIDE_DOCK_CLASS,
  TITLE_CLASS,
} from "../Tier1ShellConstants";
import Tag from "../Tag";

export type FocusShellOverlayProps = Record<string, unknown>;

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

export function FocusShellOverlay(rawProps: FocusShellOverlayProps) {
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
    ) || "Focused Memory";

  const chapter =
    firstText(props.chapter, memory.chapter, node.chapter) || "current";

  const emotion =
    firstText(props.emotion, memory.emotion, node.emotion) || "steady";

  const summary =
    firstText(
      props.summary,
      memory.summary,
      memory.description,
      node.summary,
      node.description,
    ) || "Focus is now reduced to a compact dock so the scene carries more of the experience.";

  const enterReplay = pickFn(props, ["onEnterReplay", "enterReplay", "onReplay"]);
  const clearFocus = pickFn(props, ["onClearFocus", "clearFocus", "onClear"]);
  const returnHome = pickFn(props, ["onReturnHome", "returnHome", "onHome"]);

  return (
    <div className={SIDE_DOCK_CLASS}>
      <div className={[PANEL_STRONG_CLASS, "space-y-3"].join(" ")}>
        <div className="flex items-center justify-between gap-2">
          <Tag>Focus</Tag>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{chapter}</div>
        </div>

        <div className={TITLE_CLASS}>{title}</div>
        <div className="flex flex-wrap gap-2">
          <Tag>{emotion}</Tag>
        </div>
        <p className={BODY_TEXT_CLASS}>{summary}</p>

        <div className="grid gap-2 pt-1">
          <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => enterReplay?.()}>
            Enter Replay
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => clearFocus?.()}>
              LifeMap
            </button>
            <button type="button" className={GHOST_BUTTON_CLASS} onClick={() => returnHome?.()}>
              Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FocusShellOverlay;

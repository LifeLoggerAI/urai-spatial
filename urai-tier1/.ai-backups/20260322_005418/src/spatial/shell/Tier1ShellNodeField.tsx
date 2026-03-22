'use client';

import React from "react";

type Item = Record<string, unknown>;

export type Tier1ShellNodeFieldProps = {
  items?: Item[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  className?: string;
};

function titleFor(item: Item | undefined, index: number) {
  if (!item) return `Star ${index + 1}`;
  const val =
    item.title ??
    item.name ??
    item.label ??
    item.id ??
    item.slug ??
    `Star ${index + 1}`;
  return String(val);
}

export function Tier1ShellNodeField({
  items = [],
  selectedIndex = 0,
  onSelect,
  className = "",
}: Tier1ShellNodeFieldProps) {
  if (!items.length) return null;

  return (
    <div className={["space-y-2", className].join(" ")}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        Readable LifeMap selection
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => {
          const active = index === selectedIndex;
          return (
            <button
              key={`${titleFor(item, index)}-${index}`}
              type="button"
              onClick={() => onSelect?.(index)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs transition",
                active
                  ? "border-cyan-300/30 bg-cyan-400/12 text-cyan-100"
                  : "border-white/10 bg-white/6 text-slate-200 hover:bg-white/10",
              ].join(" ")}
            >
              {titleFor(item, index)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Tier1ShellNodeField;

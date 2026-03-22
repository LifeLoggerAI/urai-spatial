'use client';

import React from "react";

export type Tier1ShellFocusGlowProps = {
  className?: string;
};

export function Tier1ShellFocusGlow({ className = "" }: Tier1ShellFocusGlowProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-cyan-300/20 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_0_80px_rgba(34,211,238,0.08)]",
        className,
      ].join(" ")}
    />
  );
}

export default Tier1ShellFocusGlow;

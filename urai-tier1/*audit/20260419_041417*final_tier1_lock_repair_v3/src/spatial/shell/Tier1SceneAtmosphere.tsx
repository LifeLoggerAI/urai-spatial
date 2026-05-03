'use client';

import React, { useEffect, useMemo, useState } from "react";
import type { Tier1Phase } from "./Tier1ShellConstants";

export type Tier1SceneAtmosphereProps = {
  phase: Tier1Phase;
  pulseKey?: number;
  title?: string;
};

type StyleSet = {
  top: string;
  bottom: string;
  wash: string;
  aura: string;
  chip: string;
};

function stylesFor(phase: Tier1Phase): StyleSet {
  switch (phase) {
    case "HOME":
      return {
        top: "from-slate-950/86 via-slate-950/36 to-transparent",
        bottom: "from-slate-950/86 via-slate-950/34 to-transparent",
        wash: "bg-[radial-gradient(circle_at_50%_42%,rgba(56,189,248,0.06),rgba(2,6,23,0.00)_36%,rgba(2,6,23,0.46)_100%)]",
        aura: "bg-[radial-gradient(circle_at_50%_46%,rgba(34,211,238,0.08),rgba(2,6,23,0.00)_28%,rgba(2,6,23,0.00)_100%)]",
        chip: "border-white/12 bg-black/30 text-slate-200",
      };
    case "sky":
      return {
        top: "from-cyan-950/78 via-slate-950/26 to-transparent",
        bottom: "from-slate-950/80 via-slate-950/34 to-transparent",
        wash: "bg-[radial-gradient(circle_at_50%_18%,rgba(34,211,238,0.14),rgba(2,6,23,0.02)_36%,rgba(2,6,23,0.44)_100%)]",
        aura: "bg-[radial-gradient(circle_at_50%_28%,rgba(125,211,252,0.16),rgba(2,6,23,0.00)_26%,rgba(2,6,23,0.00)_100%)]",
        chip: "border-cyan-300/24 bg-cyan-500/10 text-cyan-100",
      };
    case "LIFEMAP":
      return {
        top: "from-slate-950/82 via-slate-950/24 to-transparent",
        bottom: "from-slate-950/88 via-slate-950/38 to-transparent",
        wash: "bg-[radial-gradient(circle_at_50%_44%,rgba(59,130,246,0.08),rgba(2,6,23,0.02)_42%,rgba(2,6,23,0.48)_100%)]",
        aura: "bg-[radial-gradient(circle_at_50%_46%,rgba(99,102,241,0.10),rgba(2,6,23,0.00)_26%,rgba(2,6,23,0.00)_100%)]",
        chip: "border-indigo-300/22 bg-indigo-500/10 text-indigo-100",
      };
    case "FOCUS":
      return {
        top: "from-slate-950/84 via-slate-950/22 to-transparent",
        bottom: "from-slate-950/90 via-slate-950/42 to-transparent",
        wash: "bg-[radial-gradient(circle_at_70%_50%,rgba(34,211,238,0.10),rgba(2,6,23,0.01)_22%,rgba(2,6,23,0.48)_100%)]",
        aura: "bg-[radial-gradient(circle_at_70%_50%,rgba(103,232,249,0.18),rgba(2,6,23,0.00)_18%,rgba(2,6,23,0.00)_100%)]",
        chip: "border-cyan-300/24 bg-cyan-500/10 text-cyan-100",
      };
    case "REPLAY":
      return {
        top: "from-fuchsia-950/82 via-slate-950/26 to-transparent",
        bottom: "from-slate-950/90 via-slate-950/42 to-transparent",
        wash: "bg-[radial-gradient(circle_at_70%_50%,rgba(217,70,239,0.12),rgba(2,6,23,0.02)_20%,rgba(2,6,23,0.52)_100%)]",
        aura: "bg-[radial-gradient(circle_at_70%_50%,rgba(244,114,182,0.20),rgba(2,6,23,0.00)_18%,rgba(2,6,23,0.00)_100%)]",
        chip: "border-fuchsia-300/24 bg-fuchsia-500/10 text-fuchsia-100",
      };
  }
}

export function Tier1SceneAtmosphere({
  phase,
  pulseKey = 0,
  title = "",
}: Tier1SceneAtmosphereProps) {
  const style = useMemo(() => stylesFor(phase), [phase]);
  const [pulseVisible, setPulseVisible] = useState(false);

    useEffect(() => {
      if (!pulseKey) return;
      setPulseVisible(true);
      const id = window.setTimeout(() => setPulseVisible(false), 520);
      return () => window.clearTimeout(id);
    }, [pulseKey]);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[40]">
        <div className={["absolute inset-x-0 top-0 h-36 bg-gradient-to-b", style.top].join(" ")} />
        <div className={["absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t", style.bottom].join(" ")} />
        <div className={["absolute inset-0", style.wash].join(" ")} />
        <div className={["absolute inset-0", style.aura].join(" ")} />
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_center,white_0.6px,transparent_0.8px)] [background-size:20px_20px]" />
        <div className="absolute inset-x-0 top-5 flex justify-center">
          <div className={["rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] backdrop-blur-md", style.chip].join(" ")}>
            {phase}
          </div>
        </div>
      </div>

      {pulseVisible && (
        <div className="pointer-events-none fixed inset-0 z-[41]">
          <div className="absolute inset-0 bg-white/[0.03]" />
          <div className="absolute left-1/2 top-1/2 h-[52vh] w-[52vh] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.04] blur-2xl" />
        </div>
      )}
    </>
  );
}

export default Tier1SceneAtmosphere;

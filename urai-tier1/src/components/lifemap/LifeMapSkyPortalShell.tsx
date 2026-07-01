"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import LifeMapScene from "./LifeMapScene";

const SKY_PORTAL_KEY = "urai:transition:sky-to-life-map";

type SkyPortalSearchParams = {
  get(name: string): string | null;
};

function shouldPlaySkyPortal(searchParams: SkyPortalSearchParams | null) {
  if (searchParams?.get("transition") === "none") return false;
  if (searchParams?.get("transition") === "sky") return true;
  if (typeof window === "undefined") return true;
  return window.sessionStorage.getItem(SKY_PORTAL_KEY) === "1" || searchParams?.get("from") === "ascent" || true;
}

export function LifeMapSkyPortalShell() {
  const searchParams = useSearchParams();
  const [showPortal, setShowPortal] = useState(false);
  const [complete, setComplete] = useState(false);
  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const shouldPlay = shouldPlaySkyPortal(searchParams);
    setShowPortal(shouldPlay);
    setComplete(false);
    if (typeof window !== "undefined") window.sessionStorage.removeItem(SKY_PORTAL_KEY);

    if (!shouldPlay || reducedMotion) {
      setComplete(true);
      return;
    }

    const timer = window.setTimeout(() => setComplete(true), 1250);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, searchParams]);

  return (
    <>
      <LifeMapScene />
      {showPortal && !complete ? (
        <div
          className="pointer-events-none fixed inset-0 z-[80] overflow-hidden bg-[#020815] text-white"
          data-urai-transition-phase="sky-to-life-map"
          data-urai-sky-portal="active"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(125,220,255,0.2),transparent_32%),linear-gradient(to_top,rgba(2,8,21,1),rgba(10,20,48,0.96),rgba(20,31,64,0.7))]" />
          <div className="absolute inset-x-0 bottom-[-12%] h-1/2 animate-[lifemapCloudLift_1.25s_ease-out_forwards] rounded-[50%] bg-cyan-100/10 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-[lifemapPortalBloom_1.25s_ease-out_forwards] rounded-full border border-cyan-100/40 bg-cyan-100/20 shadow-[0_0_120px_rgba(125,220,255,0.55)]" />
          <div className="absolute inset-0 animate-[lifemapStarReveal_1.25s_ease-out_forwards] opacity-0 [background-image:radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.8)_0_1px,transparent_2px),radial-gradient(circle_at_70%_24%,rgba(125,220,255,0.9)_0_1px,transparent_2px),radial-gradient(circle_at_52%_62%,rgba(244,114,182,0.8)_0_1px,transparent_2px),radial-gradient(circle_at_82%_76%,rgba(255,255,255,0.7)_0_1px,transparent_2px)]" />
          <div className="absolute inset-x-0 top-[42%] flex justify-center text-center">
            <div className="rounded-full border border-cyan-100/20 bg-slate-950/35 px-5 py-3 text-xs font-black uppercase tracking-[0.34em] text-cyan-50/75 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
              Sky opening into Life Map
            </div>
          </div>
          <style>{`
            @keyframes lifemapPortalBloom {
              0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
              45% { opacity: 1; }
              100% { transform: translate(-50%, -50%) scale(30); opacity: 0; }
            }
            @keyframes lifemapCloudLift {
              0% { transform: translateY(18%) scale(1); opacity: 0.75; }
              100% { transform: translateY(-38%) scale(1.4); opacity: 0; }
            }
            @keyframes lifemapStarReveal {
              0% { opacity: 0; transform: scale(0.96); }
              55% { opacity: 0.9; }
              100% { opacity: 0; transform: scale(1.08); }
            }
          `}</style>
        </div>
      ) : null}
    </>
  );
}

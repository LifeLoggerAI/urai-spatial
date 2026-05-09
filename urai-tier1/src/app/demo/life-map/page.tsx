"use client";

import { useEffect } from "react";
import LifeMapAscentGate from "@/spatial/components/world/LifeMapAscentGate";
import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

function publicDemoRoutesAllowed() {
  return process.env.NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES === "true" || process.env.NODE_ENV !== "production";
}

export default function DemoLifeMapPage() {
  useEffect(() => {
    if (!publicDemoRoutesAllowed()) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem("urai:demo-mode", "tier-one-life-map");
    window.sessionStorage.setItem("urai:transition:sky-to-life-map", "1");
  }, []);

  if (!publicDemoRoutesAllowed()) {
    return <TierOneExperience mode="home" />;
  }

  return <LifeMapAscentGate />;
}

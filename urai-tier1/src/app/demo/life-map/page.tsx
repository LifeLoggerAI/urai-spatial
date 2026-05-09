"use client";

import { useEffect } from "react";
import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

function publicDemoRoutesAllowed() {
  return process.env.NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES === "true" || process.env.NODE_ENV !== "production";
}

export default function DemoLifeMapPage() {
  useEffect(() => {
    if (!publicDemoRoutesAllowed()) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem("urai:demo-mode", "tier-one-life-map");
  }, []);

  if (!publicDemoRoutesAllowed()) {
    return <TierOneExperience mode="home" />;
  }

  return <TierOneExperience mode="demo" />;
}

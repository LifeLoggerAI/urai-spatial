"use client";

import { useEffect } from "react";
import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

export default function DemoLifeMapPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("urai:demo-mode", "tier-one-life-map");
  }, []);

  return <TierOneExperience mode="life-map" />;
}

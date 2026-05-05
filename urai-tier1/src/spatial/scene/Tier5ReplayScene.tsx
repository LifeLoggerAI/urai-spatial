"use client";

import SpatialScene from "@/spatial/scene/SpatialScene";

/**
 * Thin compatibility adapter.
 * Canonical LifeMap runtime (state machine, glow scheduler,
 * companion priorities, event emitters, chapter focus camera)
 * lives in SpatialScene.
 */
export default function Tier5ReplayScene() {
  return <SpatialScene />;
}

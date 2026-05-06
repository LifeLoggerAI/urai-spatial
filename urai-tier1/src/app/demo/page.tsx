"use client";

import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

export default function DemoPage() {
  return (
    <TierOneExperience
      mode="demo"
      cta={
        <a className="tier-one-route-card__button" href="/demo/life-map">
          Open Life Map demo
        </a>
      }
    />
  );
}

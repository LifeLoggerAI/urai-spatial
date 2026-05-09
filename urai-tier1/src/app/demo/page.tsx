"use client";

import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

function publicDemoRoutesAllowed() {
  return process.env.NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES === "true" || process.env.NODE_ENV !== "production";
}

export default function DemoPage() {
  if (!publicDemoRoutesAllowed()) {
    return <TierOneExperience mode="home" />;
  }

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

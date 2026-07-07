import { notFound } from "next/navigation";
import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

export const metadata = {
  title: "URAI Spatial Demo",
  description:
    "Fallback-safe Tier One spatial review route used by the tier-lock route audit.",
};

function requireDemoAccess() {
  const enabled =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES === "true" ||
    process.env.URAI_ALLOW_PUBLIC_DEMO_ROUTES === "true";

  if (!enabled) notFound();
}

export default function DemoPage() {
  requireDemoAccess();
  return <TierOneExperience />;
}

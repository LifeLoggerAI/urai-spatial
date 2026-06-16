import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

export const metadata = {
  title: "URAI Spatial Demo",
  description:
    "Public fallback-safe Tier One spatial demo route used by the tier-lock route audit.",
};

export default function DemoPage() {
  return <TierOneExperience />;
}

import { redirect } from "next/navigation";
import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

export const metadata = {
  title: "URAI Spatial Demo",
  description:
    "Fallback-safe Tier One spatial review route used by the tier-lock route audit.",
};

export default function DemoPage() {
  const allowDemo = process.env.NODE_ENV !== "production" || process.env.URAI_ALLOW_PUBLIC_DEMO_ROUTES === "true";
  if (!allowDemo) redirect("/home");
  return <TierOneExperience />;
}

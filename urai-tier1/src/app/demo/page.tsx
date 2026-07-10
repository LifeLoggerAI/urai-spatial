import { notFound } from 'next/navigation'
import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

export const metadata = {
  title: "URAI in 60 Seconds | Spatial AI Memory World",
  description:
    "Experience how URAI turns scattered personal context into a connected spatial AI memory world.",
};

function publicDemoRoutesAllowed() {
  return process.env.NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES === 'true' || process.env.URAI_ALLOW_PUBLIC_DEMO_ROUTES === 'true' || process.env.NODE_ENV !== 'production'
}

export default function DemoPage() {
  if (!publicDemoRoutesAllowed()) notFound()

  return <TierOneExperience />;
}

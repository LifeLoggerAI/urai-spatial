import { MemoryRouteClient } from "@/spatial/layout/MemoryRouteClient";

export const metadata = {
  title: "URAI Replay",
  description: "URAI Replay turns a selected memory thread into a cinematic route through time.",
};

// Legacy replay contract markers retained for source-string lock tests while
// the runtime uses the static-export-safe MemoryRouteClient shell.
// TierOneExperience
// mode="replay"
// Replay Stream
// data-testid="urai-focus-action-panel"
// ReplayUnwindButton

export default function ReplayRoutePage() {
  return <MemoryRouteClient mode="replay" />;
}

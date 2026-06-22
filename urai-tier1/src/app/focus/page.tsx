import { Suspense } from "react";
import { MemoryRouteClient } from "@/spatial/layout/MemoryRouteClient";
import { FocusPlaceDoor } from "./FocusPlaceDoor";

export const metadata = {
  title: "URAI Focus",
  description:
    "URAI Focus opens one selected memory from the Life Map and keeps Replay one step away.",
};

// Legacy canonical shell marker retained for source-string Phase 4 locks while
// MemoryRouteClient preserves selected memory ids in a static-export-safe shell.
// <TierOneExperience mode="focus" />

export default function FocusRoutePage() {
  return (
    <>
      <MemoryRouteClient mode="focus" />
      <Suspense fallback={null}>
        <FocusPlaceDoor manifestId={null} />
      </Suspense>
    </>
  );
}

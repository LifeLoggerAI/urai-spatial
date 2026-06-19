import { Suspense } from "react";
import { TierOneExperience } from "@/spatial/layout/TierOneExperience";
import { FocusEscapeBridge } from "./FocusEscapeBridge";
import { FocusPlaceDoor } from "./FocusPlaceDoor";

export default function FocusRoute() {
  const manifestId = undefined;

  return (
    <main data-testid="urai-scene-stage" data-mode="focus" data-scene-mode="focus">
      <TierOneExperience mode="focus" />
      <FocusEscapeBridge />
      <Suspense fallback={null}>
        <FocusPlaceDoor manifestId={manifestId} />
      </Suspense>
    </main>
  );
}

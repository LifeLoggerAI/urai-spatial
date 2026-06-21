import { Suspense } from "react";
import { FocusEscapeBridge } from "./FocusEscapeBridge";
import { FocusLifeMapStage } from "./FocusLifeMapStage";
import { FocusPlaceDoor } from "./FocusPlaceDoor";

export default function FocusRoute() {
  const manifestId = undefined;

  return (
    <main data-testid="urai-scene-stage" data-mode="focus" data-scene-mode="focus">
      <FocusEscapeBridge />
      <Suspense fallback={<div data-testid="urai-focus-loading" aria-label="Loading focus memory" />}>
        <FocusLifeMapStage />
      </Suspense>
      <Suspense fallback={null}>
        <FocusPlaceDoor manifestId={manifestId} />
      </Suspense>
    </main>
  );
}

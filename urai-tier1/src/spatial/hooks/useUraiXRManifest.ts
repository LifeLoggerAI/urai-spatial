import { useCallback, useEffect, useMemo, useState } from "react";
import { buildUraiXRManifest } from "@/lib/uraiXR/buildXRManifest";
import { loadUraiXRMode, saveUraiXRMode } from "@/lib/uraiXR/localStore";
import type { UraiXRMode, UraiXRPhase } from "@/lib/uraiXR/types";

type UseUraiXRManifestArgs = {
  phase: UraiXRPhase;
  selectedMemoryId: string | null;
  selectedMemoryTitle: string | null;
  selectedMemoryPosition: [number, number, number] | null;
};

export function useUraiXRManifest(args: UseUraiXRManifestArgs) {
  /*
   * URAI_TIER11_XR_HYDRATION_LOCK_V1
   * Server and first client render must match.
   * LocalStorage is loaded only after hydration.
   */
  const [mode, setModeState] = useState<UraiXRMode>("flat");

  useEffect(() => {
    setModeState(loadUraiXRMode());
  }, []);

  const setMode = useCallback((next: UraiXRMode) => {
    setModeState(next);
    saveUraiXRMode(next);
  }, []);

  const cycleMode = useCallback(() => {
    setModeState((prev) => {
      const next: UraiXRMode =
        prev === "flat" ? "ar_preview" :
        prev === "ar_preview" ? "vr_preview" :
        prev === "vr_preview" ? "xr_ready" :
        "flat";

      saveUraiXRMode(next);
      return next;
    });
  }, []);

  const manifest = useMemo(() => {
    return buildUraiXRManifest({
      mode,
      phase: args.phase,
      selectedMemoryId: args.selectedMemoryId,
      selectedMemoryTitle: args.selectedMemoryTitle,
      selectedMemoryPosition: args.selectedMemoryPosition,
    });
  }, [
    mode,
    args.phase,
    args.selectedMemoryId,
    args.selectedMemoryTitle,
    args.selectedMemoryPosition,
  ]);

  return {
    mode,
    setMode,
    cycleMode,
    manifest,
  };
}

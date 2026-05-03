import type { UraiXRMode } from "./types";

const KEY = "urai:tier11:xr-mode:v1";

export function loadUraiXRMode(): UraiXRMode {
  if (typeof window === "undefined") return "flat";

  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "ar_preview" || raw === "vr_preview" || raw === "xr_ready" || raw === "flat") return raw;
    return "flat";
  } catch {
    return "flat";
  }
}

export function saveUraiXRMode(mode: UraiXRMode): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    // Spatial mode must never break Spatial
  }
}

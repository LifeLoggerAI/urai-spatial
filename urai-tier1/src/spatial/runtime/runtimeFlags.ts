"use client";

export type SpatialRuntimeFlags = {
  publicDemoMode: boolean;
  recordingMode: boolean;
  showDemoExportControls: boolean;
};

const DEFAULT_FLAGS: SpatialRuntimeFlags = {
  publicDemoMode: false,
  recordingMode: false,
  showDemoExportControls: false,
};

function toBool(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function readSpatialRuntimeFlags(): SpatialRuntimeFlags {
  if (typeof window === "undefined") return DEFAULT_FLAGS;

  const params = new URLSearchParams(window.location.search);
  const external = (window as any).__URAI_RUNTIME_FLAGS__ as Partial<SpatialRuntimeFlags> | undefined;
  const isDemoRoute = window.location.pathname === "/demo";

  const publicDemoMode =
    external?.publicDemoMode ??
    (toBool(params.get("publicDemoMode")) || isDemoRoute);

  const recordingMode =
    external?.recordingMode ??
    toBool(params.get("recordingMode"));

  const showDemoExportControls =
    external?.showDemoExportControls ??
    toBool(params.get("showDemoExportControls"));

  return {
    publicDemoMode,
    recordingMode,
    showDemoExportControls,
  };
}

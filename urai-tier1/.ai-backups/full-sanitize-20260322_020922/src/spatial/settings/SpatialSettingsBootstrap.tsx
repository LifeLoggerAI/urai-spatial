"use client";

import { useEffect, useMemo, useState } from "react";
import { readSpatialSettings, writeSpatialSettings } from "@/spatial/settings/spatialSettingsIO";
import { useSpatialSettingsStore } from "@/spatial/settings/spatialSettingsStore";
import type { SpatialSettings } from "@/spatial/settings/spatialSettingsTypes";

type SettingsWindow = Window & {
  __URAI_SPATIAL_SETTINGS__?: SpatialSettings;
};

export default function SpatialSettingsBootstrap() {
  const hydrate = useSpatialSettingsStore((s) => s.hydrate);

  const reducedMotion = useSpatialSettingsStore((s) => s.reducedMotion);
  const showImportExport = useSpatialSettingsStore((s) => s.showImportExport);
  const telemetryEnabled = useSpatialSettingsStore((s) => s.telemetryEnabled);
  const showTelemetryPanel = useSpatialSettingsStore((s) => s.showTelemetryPanel);
  const persistSnapshots = useSpatialSettingsStore((s) => s.persistSnapshots);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate(readSpatialSettings());
    setReady(true);
  }, [hydrate]);

  const settings = useMemo(
    () => ({
      schema: "urai.spatial.settings.v1" as const,
      reducedMotion,
      showImportExport,
      telemetryEnabled,
      showTelemetryPanel,
      persistSnapshots,
    }),
    [
      reducedMotion,
      showImportExport,
      telemetryEnabled,
      showTelemetryPanel,
      persistSnapshots,
    ],
  );

  useEffect(() => {
    if (!ready) return;
    writeSpatialSettings(settings);
    const target = window as SettingsWindow;
    target.__URAI_SPATIAL_SETTINGS__ = settings;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-settings", {
        detail: settings,
      }),
    );
  }, [ready, settings]);

  return null;
}

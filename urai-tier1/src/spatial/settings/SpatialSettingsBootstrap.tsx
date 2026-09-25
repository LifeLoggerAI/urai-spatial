'use client'

import { useEffect, useMemo, useState } from 'react'
import { readSpatialSettings, writeSpatialSettings } from '@/spatial/settings/spatialSettingsIO'
import { useSpatialSettingsStore } from '@/spatial/settings/spatialSettingsStore'

export default function SpatialSettingsBootstrap() {
  const hydrate = useSpatialSettingsStore((state) => state.hydrate)
  const reducedMotion = useSpatialSettingsStore((state) => state.reducedMotion)
  const showImportExport = useSpatialSettingsStore((state) => state.showImportExport)
  const telemetryEnabled = useSpatialSettingsStore((state) => state.telemetryEnabled)
  const showTelemetryPanel = useSpatialSettingsStore((state) => state.showTelemetryPanel)
  const persistSnapshots = useSpatialSettingsStore((state) => state.persistSnapshots)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    hydrate(readSpatialSettings())
    setReady(true)
  }, [hydrate])

  const settings = useMemo(() => ({
    schema: 'urai.spatial.settings.v1' as const,
    reducedMotion,
    showImportExport,
    telemetryEnabled,
    showTelemetryPanel,
    persistSnapshots,
  }), [reducedMotion, showImportExport, telemetryEnabled, showTelemetryPanel, persistSnapshots])

  useEffect(() => {
    if (!ready) return
    writeSpatialSettings(settings)
    document.documentElement.dataset.uraiReducedMotion = reducedMotion ? 'true' : 'false'
    window.dispatchEvent(new CustomEvent('urai:spatial-settings', { detail: settings }))
  }, [ready, reducedMotion, settings])

  return null
}

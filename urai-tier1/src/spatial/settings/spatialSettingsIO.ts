import type { SpatialSettings } from './spatialSettingsTypes'
import { createDefaultSpatialSettings } from './spatialSettingsTypes'

export const SPATIAL_SETTINGS_KEY = 'urai.spatial.settings.v1'

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeSpatialSettings(value: unknown): SpatialSettings {
  const defaults = createDefaultSpatialSettings()
  if (!value || typeof value !== 'object') return defaults
  const parsed = value as Partial<SpatialSettings>
  return {
    schema: 'urai.spatial.settings.v1',
    reducedMotion: asBoolean(parsed.reducedMotion, defaults.reducedMotion),
    showImportExport: asBoolean(parsed.showImportExport, defaults.showImportExport),
    telemetryEnabled: asBoolean(parsed.telemetryEnabled, defaults.telemetryEnabled),
    showTelemetryPanel: asBoolean(parsed.showTelemetryPanel, defaults.showTelemetryPanel),
    persistSnapshots: asBoolean(parsed.persistSnapshots, defaults.persistSnapshots),
  }
}

export function readSpatialSettings(): SpatialSettings {
  if (typeof window === 'undefined') return createDefaultSpatialSettings()

  try {
    const raw = window.localStorage.getItem(SPATIAL_SETTINGS_KEY)
    if (!raw) return createDefaultSpatialSettings()
    return normalizeSpatialSettings(JSON.parse(raw))
  } catch {
    return createDefaultSpatialSettings()
  }
}

export function writeSpatialSettings(settings: SpatialSettings): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SPATIAL_SETTINGS_KEY, JSON.stringify(normalizeSpatialSettings(settings)))
  } catch {
    // Local persistence is best effort; runtime preferences continue in memory.
  }
}

export function clearSpatialSettings(): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(SPATIAL_SETTINGS_KEY) } catch { /* best effort */ }
}

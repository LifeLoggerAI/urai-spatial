const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function readBooleanFlag(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null) return fallback;
  const value = raw.trim().toLowerCase();
  if (TRUE_VALUES.has(value)) return true;
  if (FALSE_VALUES.has(value)) return false;
  return fallback;
}

export function resolvePresentationModeConfig(env: Record<string, string | undefined> = process.env) {
  const publicDemoMode = readBooleanFlag(env.NEXT_PUBLIC_URAI_PUBLIC_DEMO_MODE, true);
  const recordingMode = readBooleanFlag(env.NEXT_PUBLIC_URAI_RECORDING_MODE, false);
  const showDemoExportControls = readBooleanFlag(env.NEXT_PUBLIC_URAI_SHOW_DEMO_EXPORT_CONTROLS, false);

  return {
    publicDemoMode,
    recordingMode,
    showDemoExportControls,
  };
}

const presentationModeConfig = resolvePresentationModeConfig();

export const publicDemoMode = presentationModeConfig.publicDemoMode;
export const recordingMode = presentationModeConfig.recordingMode;
export const showDemoExportControls = presentationModeConfig.showDemoExportControls;

export function isInternalUiVisible(config: { publicDemoMode: boolean; recordingMode: boolean } = presentationModeConfig): boolean {
  return !(config.publicDemoMode || config.recordingMode);
}

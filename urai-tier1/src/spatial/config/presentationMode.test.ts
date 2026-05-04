import test from "node:test";
import assert from "node:assert/strict";
import { isInternalUiVisible, resolvePresentationModeConfig } from "./presentationMode.ts";

test("uses public-safe defaults when env values are missing", () => {
  assert.deepEqual(resolvePresentationModeConfig({}), {
    publicDemoMode: true,
    recordingMode: false,
    showDemoExportControls: false,
  });
});

test("resolves explicit env flags", () => {
  assert.deepEqual(
    resolvePresentationModeConfig({
      NEXT_PUBLIC_URAI_PUBLIC_DEMO_MODE: "false",
      NEXT_PUBLIC_URAI_RECORDING_MODE: "true",
      NEXT_PUBLIC_URAI_SHOW_DEMO_EXPORT_CONTROLS: "1",
    }),
    {
      publicDemoMode: false,
      recordingMode: true,
      showDemoExportControls: true,
    },
  );
});

test("falls back safely on invalid env values", () => {
  assert.deepEqual(
    resolvePresentationModeConfig({
      NEXT_PUBLIC_URAI_PUBLIC_DEMO_MODE: "invalid",
      NEXT_PUBLIC_URAI_RECORDING_MODE: "invalid",
      NEXT_PUBLIC_URAI_SHOW_DEMO_EXPORT_CONTROLS: "invalid",
    }),
    {
      publicDemoMode: true,
      recordingMode: false,
      showDemoExportControls: false,
    },
  );
});

test("hides internal UI when public demo mode is on", () => {
  assert.equal(isInternalUiVisible({ publicDemoMode: true, recordingMode: false }), false);
});

test("hides internal UI when recording mode is on", () => {
  assert.equal(isInternalUiVisible({ publicDemoMode: false, recordingMode: true }), false);
});

test("shows internal UI only when both modes are off", () => {
  assert.equal(isInternalUiVisible({ publicDemoMode: false, recordingMode: false }), true);
});

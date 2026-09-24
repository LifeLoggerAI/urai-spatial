import assert from "node:assert/strict";
import {
  DEFAULT_LIVING_WORLD_STATE,
  normalizeLivingWorldState,
  transitionLivingWorld,
  deriveLivingWorldPresentation,
} from "./state-machine.mjs";

const baseline = normalizeLivingWorldState(DEFAULT_LIVING_WORLD_STATE);
assert.equal(baseline.timeOfDay, "day");
assert.equal(baseline.weather, "clear");

const duskStorm = transitionLivingWorld(
  baseline,
  { type: "TIME_OF_DAY", value: "dusk" },
);
assert.equal(duskStorm.timeOfDay, "dusk");

const storm = transitionLivingWorld(
  { ...duskStorm, weather: "storm", atmosphere: "wind" },
  { type: "REDUCED_STIMULATION", enabled: true },
);
assert.equal(storm.weather, "rain");
assert.equal(storm.audio, "muted");

const reducedMotion = transitionLivingWorld(
  { ...baseline, atmosphere: "wind" },
  { type: "REDUCED_MOTION", enabled: true },
);
assert.equal(reducedMotion.motion, "reduced");
assert.equal(reducedMotion.atmosphere, "breeze");

const noWebgl = transitionLivingWorld(
  { ...baseline, weather: "fog", atmosphere: "wind" },
  { type: "WEBGL_AVAILABILITY", available: false },
);
assert.equal(noWebgl.motion, "still");
assert.equal(noWebgl.atmosphere, "calm");
assert.equal(deriveLivingWorldPresentation(noWebgl).requiresWebGL, false);
assert.equal(deriveLivingWorldPresentation(noWebgl).skyVariant, "static-fallback");

assert.throws(
  () => transitionLivingWorld(baseline, { type: "WEATHER", value: "unknown" }),
  /Invalid weather/,
);

const a = deriveLivingWorldPresentation({
  timeOfDay: "night",
  weather: "clear",
  atmosphere: "calm",
  motion: "full",
});
const b = deriveLivingWorldPresentation({
  timeOfDay: "night",
  weather: "clear",
  atmosphere: "calm",
  motion: "full",
});
assert.deepEqual(a, b);

console.log("V2 Living World dormant state conformance: PASS");

export const TIME_OF_DAY = Object.freeze(["dawn", "day", "dusk", "night"]);
export const WEATHER = Object.freeze(["clear", "cloud", "rain", "storm", "snow", "fog"]);
export const ATMOSPHERE = Object.freeze(["calm", "breeze", "wind", "haze"]);
export const MOTION = Object.freeze(["full", "reduced", "still"]);

export const DEFAULT_LIVING_WORLD_STATE = Object.freeze({
  version: "1.0.0",
  timeOfDay: "day",
  weather: "clear",
  atmosphere: "calm",
  motion: "full",
  stimulation: "standard",
  webgl: "available",
  audio: "ambient",
  orbResponse: "neutral",
});

function assertEnum(value, allowed, name) {
  if (!allowed.includes(value)) throw new Error("Invalid " + name + ": " + value);
}

export function normalizeLivingWorldState(input = {}) {
  const state = { ...DEFAULT_LIVING_WORLD_STATE, ...input };
  assertEnum(state.timeOfDay, TIME_OF_DAY, "timeOfDay");
  assertEnum(state.weather, WEATHER, "weather");
  assertEnum(state.atmosphere, ATMOSPHERE, "atmosphere");
  assertEnum(state.motion, MOTION, "motion");

  if (!["standard", "reduced"].includes(state.stimulation)) {
    throw new Error("Invalid stimulation: " + state.stimulation);
  }
  if (!["available", "unavailable"].includes(state.webgl)) {
    throw new Error("Invalid webgl: " + state.webgl);
  }
  if (!["ambient", "muted", "captions_only"].includes(state.audio)) {
    throw new Error("Invalid audio: " + state.audio);
  }

  if (state.motion === "reduced") {
    state.atmosphere = state.atmosphere === "wind" ? "breeze" : state.atmosphere;
  }
  if (state.motion === "still") {
    state.atmosphere = "calm";
  }
  if (state.stimulation === "reduced") {
    state.weather = state.weather === "storm" ? "rain" : state.weather;
    state.audio = state.audio === "ambient" ? "muted" : state.audio;
  }
  if (state.webgl === "unavailable") {
    state.motion = "still";
    state.atmosphere = "calm";
    state.audio = state.audio === "ambient" ? "muted" : state.audio;
  }

  return state;
}

export function transitionLivingWorld(current, event) {
  const next = { ...normalizeLivingWorldState(current) };

  switch (event?.type) {
    case "TIME_OF_DAY":
      next.timeOfDay = event.value;
      break;
    case "WEATHER":
      next.weather = event.value;
      break;
    case "ATMOSPHERE":
      next.atmosphere = event.value;
      break;
    case "REDUCED_MOTION":
      next.motion = event.enabled ? "reduced" : "full";
      break;
    case "REDUCED_STIMULATION":
      next.stimulation = event.enabled ? "reduced" : "standard";
      break;
    case "WEBGL_AVAILABILITY":
      next.webgl = event.available ? "available" : "unavailable";
      break;
    case "AUDIO_MODE":
      next.audio = event.value;
      break;
    case "ORB_RESPONSE":
      next.orbResponse = String(event.value ?? "neutral").slice(0, 64);
      break;
    default:
      throw new Error("Unknown Living World event: " + event?.type);
  }

  return normalizeLivingWorldState(next);
}

export function deriveLivingWorldPresentation(state) {
  const s = normalizeLivingWorldState(state);
  return {
    skyVariant: s.webgl === "unavailable" ? "static-fallback" : s.timeOfDay + "-" + s.weather,
    motionProfile: s.motion,
    atmosphereProfile: s.atmosphere,
    weatherProfile: s.weather,
    audioProfile: s.audio,
    reducedStimulation: s.stimulation === "reduced",
    requiresWebGL: false,
    activationClass: "dormant-v2",
  };
}

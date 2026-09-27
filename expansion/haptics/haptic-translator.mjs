const VOCABULARY = Object.freeze({
  CALM: { pulses:[120,80,120], semantic:"calm", urgency:"low" },
  WARNING: { pulses:[240,90,240,90,240], semantic:"warning", urgency:"high" },
  PERSON_APPROACHING: { pulses:[90,60,90], semantic:"person_approaching", urgency:"medium" },
  KNOWN_VOICE: { pulses:[70,40,70], semantic:"known_voice", urgency:"low" },
  MEMORY_TRIGGER: { pulses:[160,70,80], semantic:"memory_trigger", urgency:"medium" },
  COUNCIL_ALERT: { pulses:[130,50,130,50,130], semantic:"council_alert", urgency:"medium" },
  NAV_LEFT: { pulses:[80,40], semantic:"navigation_left", urgency:"low" },
  NAV_RIGHT: { pulses:[40,80], semantic:"navigation_right", urgency:"low" },
  BREATH_WITH_ME: { pulses:[500,500], semantic:"breath_pacing", urgency:"low" },
});

export function translateHaptic(command, { hapticsAvailable = false } = {}) {
  const spec = VOCABULARY[command?.symbol];
  if (!spec) throw new Error("Unknown haptic symbol");
  const intensity = Math.max(0, Math.min(Number(command.intensity ?? 0.5), 1));
  const repeat = Math.max(1, Math.min(Number(command.repeat ?? 1), 20));

  return {
    version:"1.0.0",
    symbol:command.symbol,
    semantic:spec.semantic,
    urgency:spec.urgency,
    intensity,
    repeat,
    physicalPattern:hapticsAvailable ? spec.pulses : [],
    physicalDispatchAllowed:false,
    equivalents:{
      visual:{required:true,label:spec.semantic},
      audio:{required:true,cue:spec.semantic},
      nonAudio:{required:true,text:spec.semantic.replaceAll("_"," ")},
    },
    fallback:hapticsAvailable ? "simulated_pattern_only" : "equivalent_access_only",
  };
}

export function hapticVocabulary() {
  return Object.keys(VOCABULARY);
}

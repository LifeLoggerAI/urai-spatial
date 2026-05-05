import { FirstLightScriptLine } from "./firstLightTypes";

export const firstLightScript: FirstLightScriptLine[] = [
  {
    id: "arrival-1",
    step: "arrival",
    text: "URAI listens for patterns.",
    delayMs: 400,
    silenceAfterMs: 600,
    allowVoice: false,
  },
  {
    id: "arrival-2",
    step: "arrival",
    text: "It does not rush you.",
    delayMs: 800,
    silenceAfterMs: 1200,
    allowVoice: false,
  },
  {
    id: "companion-1",
    step: "companion",
    text: "I’m here. We can move slowly.",
    delayMs: 900,
    silenceAfterMs: 1200,
    allowVoice: true,
  },
  {
    id: "quiet-1",
    step: "quiet_sky",
    text: "Your sky is quiet, but not empty.",
    delayMs: 1000,
    silenceAfterMs: 1400,
    allowVoice: true,
  },
  {
    id: "star-1",
    step: "first_star",
    text: "This was not just an event. It became a pattern.",
    delayMs: 900,
    silenceAfterMs: 1600,
    allowVoice: true,
  },
  {
    id: "arc-1",
    step: "arc_reveal",
    text: "A life map is not a timeline. It is where repetition becomes visible.",
    delayMs: 1000,
    silenceAfterMs: 1500,
    allowVoice: true,
  },
  {
    id: "recovery-1",
    step: "recovery_line",
    text: "The recovery was quieter than the wound, but it lasted longer.",
    delayMs: 1200,
    silenceAfterMs: 2000,
    allowVoice: true,
  }
];

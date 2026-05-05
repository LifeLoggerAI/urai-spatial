import { CompanionLine } from "./companionTypes";

export const companionLines: CompanionLine[] = [
  { id: "home-1", context: "home", mood: "quiet", text: "I’m here. We can move slowly.", triggerReason: "home_entry", priority: 1, cooldownMinutes: 10 },
  { id: "lifemap-1", context: "lifemap", mood: "curious", text: "That star is connected to more than one season.", triggerReason: "lifemap_view", priority: 2, cooldownMinutes: 5 },
  { id: "focus-1", context: "focus", mood: "reflective", text: "This memory still has energy around it.", triggerReason: "focus_node", priority: 3, cooldownMinutes: 5 },
  { id: "replay-1", context: "replay", mood: "grounding", text: "I’ll walk through it with you.", triggerReason: "replay_start", priority: 4, cooldownMinutes: 2 },
  { id: "mirror-1", context: "mirror", mood: "reflective", text: "The full arc is visible now.", triggerReason: "mirror_view", priority: 5, cooldownMinutes: 10 },
  { id: "recovery-1", context: "recovery", mood: "celebratory", text: "You came back from this.", triggerReason: "recovery_detected", priority: 4, cooldownMinutes: 8 },
  { id: "shadow-1", context: "shadow", mood: "protective", text: "No judgment here. Just pattern.", triggerReason: "shadow_detected", priority: 5, cooldownMinutes: 10 },
];

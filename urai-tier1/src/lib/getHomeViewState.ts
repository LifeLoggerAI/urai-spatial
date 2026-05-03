import type { HomeViewState } from "@/types/home-view";

export const demoHomeViewState: HomeViewState = {
  userId: "demo-user",
  displayName: "Adam",
  moodWeather: {
    state: "clouded",
    label: "Clouded focus",
    summary:
      "Your signals suggest focus is present, but emotional noise is still in the field.",
    intensity: 62,
    confidence: 0.78,
  },
  bodyState: {
    auraColor: "violet",
    energyLevel: 58,
    stressLoad: 44,
    recoveryLevel: 67,
  },
  skyState: {
    gradient: "violet-midnight",
    cloudDensity: 0.42,
    starVisibility: 0.68,
    particleSpeed: 0.35,
  },
  narrator: {
    headline: "Your signal is forming.",
    body:
      "URAI noticed a pattern in today’s mood, memory, and attention signals.",
    actionLabel: "Open Life Map",
  },
  updatedAt: Date.now(),
};

export function getHomeViewState(): HomeViewState {
  return demoHomeViewState;
}

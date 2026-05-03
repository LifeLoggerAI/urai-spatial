export type MoodWeatherState =
  | "clear"
  | "clouded"
  | "stormy"
  | "foggy"
  | "bright"
  | "recovering"
  | "overstimulated"
  | "off_rhythm";

export type HomeViewState = {
  userId: string;
  displayName?: string;
  moodWeather: {
    state: MoodWeatherState;
    label: string;
    summary: string;
    intensity: number;
    confidence: number;
  };
  bodyState: {
    auraColor: string;
    energyLevel: number;
    stressLoad: number;
    recoveryLevel: number;
  };
  skyState: {
    gradient: string;
    cloudDensity: number;
    starVisibility: number;
    particleSpeed: number;
  };
  narrator: {
    headline: string;
    body: string;
    actionLabel: string;
  };
  updatedAt: number;
};

export const URAI_PUBLIC_DEMO_CONFIG = {
  enabled: true,
  productName: "URAI Spatial Life Map",
  headline: "A living map of memory, mood, and reflection.",
  subheadline:
    "Explore how moments become patterns, patterns become replays, and replays become a clearer story of your life.",
  privacyNote:
    "Demo mode uses sample data only. No microphone, camera, health, location, or private account data is collected in this public preview.",
  completionMessage: "Replay complete. Pattern saved to your Life Map.",
  flow: [
    "Home",
    "Life Map",
    "Memory Focus",
    "Replay",
    "Saved",
  ],
} as const;

export type UraiPublicDemoConfig = typeof URAI_PUBLIC_DEMO_CONFIG;

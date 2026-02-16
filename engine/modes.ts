
// Defines the possible states of the master SceneEngine.
// This enum drives all transitions and layer visibility.
export enum SceneMode {
  // The initial state, showing the home/entry experience.
  HOME,

  // The transition state from HOME -> LIFEMAP.
  // The home orb is morphing, preparing for the reveal.
  HOME_MORPH,

  // The state for revealing the main life map.
  LIFEMAP_REVEAL,

  // The main interactive state for the life map.
  LIFEMAP_IDLE,

  // A star/memory is being hovered.
  LIFEMAP_HOVER,

  // A star/memory has been selected and the camera is moving towards it.
  LIFEMAP_COMMIT,

  // The transition state from LIFEMAP -> REPLAY.
  REPLAY_ENTER,

  // The memory replay experience is active.
  REPLAY_ACTIVE,

  // The transition state from REPLAY -> LIFEMAP.
  REPLAY_EXIT
}

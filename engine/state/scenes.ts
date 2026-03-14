export const SCENES = [
    "home",
    "lifemap",
  ] as const
  
  export const SCENE_TRANSITIONS = [
    "toHome",
    "toLifeMap",
  ] as const
  
  export const ALL_SCENES = [
    ...SCENES,
    ...SCENE_TRANSITIONS
  ] as const
  
  export type Scene = typeof ALL_SCENES[number]
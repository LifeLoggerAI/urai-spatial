export const scenes = ['home', 'lifemap', 'toHome', 'toLifeMap'] as const
export type Scene = (typeof scenes)[number]

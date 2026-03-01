export const scenes = ['home', 'lifemap'] as const
export type Scene = (typeof scenes)[number]

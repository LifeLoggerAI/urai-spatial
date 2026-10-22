export type LifeMapPoint3 = [number, number, number];
export function lifeMapWorldStageTransform(portrait: boolean): { scale: LifeMapPoint3; position: LifeMapPoint3 };
export function lifeMapStagePoint(point: readonly [number, number, number], portrait: boolean): LifeMapPoint3;

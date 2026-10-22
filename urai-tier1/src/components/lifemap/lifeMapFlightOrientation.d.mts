export type LifeMapOrientation = { yaw: number; pitch: number };
export type LifeMapFlightAxes = { x: number; y: number; z: number };
export type LifeMapFlightPoint3 = [number, number, number];
export function lifeMapRotateFlightAxes(axes: LifeMapFlightAxes, yaw: number): LifeMapFlightAxes;
export function advanceLifeMapViewOrientation(orientation: LifeMapOrientation, held: ReadonlySet<string>, seconds: number): LifeMapOrientation;
export function lifeMapRotatedLookTarget(camera: LifeMapFlightPoint3, target: LifeMapFlightPoint3, orientation: LifeMapOrientation): LifeMapFlightPoint3;

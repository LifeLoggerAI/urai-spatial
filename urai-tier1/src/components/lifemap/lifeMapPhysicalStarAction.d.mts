export type LifeMapPhysicalStarAction = 'select' | 'replay' | 'ignore';
export type LifeMapPhysicalSourceMode = 'private' | 'explicit-demo' | 'signed-out' | 'unavailable' | 'empty' | 'error';
export type LifeMapPhysicalStarNode = {
  id: string;
  locked?: boolean;
  replayAvailable: boolean;
  authorizedMemory?: boolean;
  memoryId?: string;
  replayManifestId?: string;
};
export function lifeMapPhysicalReplayAllowed(node: LifeMapPhysicalStarNode | null | undefined, sourceMode: LifeMapPhysicalSourceMode): boolean;
export function lifeMapPhysicalStarAction(clickedId: string | null | undefined, selectedId: string | null | undefined, phase: string, replayAllowed: boolean): LifeMapPhysicalStarAction;

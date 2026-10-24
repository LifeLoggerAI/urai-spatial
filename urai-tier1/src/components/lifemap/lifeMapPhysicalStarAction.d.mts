export type LifeMapPhysicalStarAction = 'select' | 'replay' | 'ignore';
export type LifeMapPhysicalSourceMode = 'private' | 'explicit-demo' | 'signed-out' | 'unavailable' | 'empty' | 'error';
export type LifeMapPhysicalStarNode = {
  id: string;
  locked?: boolean;
  replayAvailable: boolean;
  authorizedMemory?: boolean;
  memoryId?: string;
  replayManifestId?: string;
  privacyLevel?: 'private' | 'hidden' | 'shareable';
  privacy?: 'private' | 'hidden' | 'shareable';
};
export function lifeMapFocusAllowed(node: LifeMapPhysicalStarNode | null | undefined, sourceMode: LifeMapPhysicalSourceMode): boolean;
export function lifeMapPhysicalReplayAllowed(node: LifeMapPhysicalStarNode | null | undefined, sourceMode: LifeMapPhysicalSourceMode): boolean;
export function lifeMapPhysicalStarAction(clickedId: string | null | undefined, selectedId: string | null | undefined, phase: string, replayAllowed: boolean): LifeMapPhysicalStarAction;

export type LifeMapRelatedNode = {
  id: string;
  privacyLevel?: 'private' | 'hidden' | 'shareable';
  privacy?: 'private' | 'hidden' | 'shareable';
  connectedTo?: readonly string[];
};
export function lifeMapVisibleRelatedNodes<T extends LifeMapRelatedNode>(nodes: readonly T[], selected: LifeMapRelatedNode | null | undefined): T[];
export function lifeMapNodeIsHidden(node: { privacyLevel?: unknown; privacy?: unknown } | null | undefined): boolean;
export function lifeMapEventPrivacyLevel(node: { privacyLevel?: string; privacy?: string } | null | undefined): 'hidden' | 'private' | 'shareable';
export function lifeMapFilterVisibleNodes<T extends { privacyLevel?: string; privacy?: string }>(nodes: readonly T[] | null | undefined): T[];

// Owner-scoped hidden event metadata vetoes canonical fallback materialization.
export type LifeMapHiddenEventReference = { type?: string; memoryId?: string; privacyLevel?: string; privacy?: string } | null | undefined;
export function lifeMapHiddenEventMemoryIds(nodes: readonly LifeMapHiddenEventReference[] | null | undefined): ReadonlySet<string>;

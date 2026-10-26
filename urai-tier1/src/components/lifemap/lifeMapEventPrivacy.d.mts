export type LifeMapEventPrivacy = 'hidden' | 'private' | 'shareable';
export declare function normalizeLifeMapEventPrivacy(data: { privacy?: unknown; privacyLevel?: unknown } | null | undefined): LifeMapEventPrivacy;

export declare function lifeMapOwnerDocumentAllowed(data: Record<string, unknown> | null | undefined, expectedOwner: string): boolean;
export declare function projectLifeMapOwnerSnapshot<T extends {id: string}>(docs: readonly {id: string;data(): Record<string, unknown>}[], expectedOwner: string, projector:(id:string, data:Record<string,unknown>)=>T): {ok: boolean;items:T[]};

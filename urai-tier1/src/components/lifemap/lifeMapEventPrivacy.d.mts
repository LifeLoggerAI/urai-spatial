export type LifeMapEventPrivacy = 'hidden' | 'private' | 'shareable';
export declare function normalizeLifeMapEventPrivacy(data: { privacy?: unknown; privacyLevel?: unknown } | null | undefined): LifeMapEventPrivacy;

export type SpatialAccountProfile = {
  id: string;
  label: string;
  createdAt: string;
};

export type SpatialAccountManifest = {
  schema: "urai.spatial.account.v1";
  activeAccountId: string;
  profiles: SpatialAccountProfile[];
};

export const SPATIAL_ACCOUNT_STORAGE_KEY = "urai.spatial.account.v1";
export const SPATIAL_DEFAULT_ACCOUNT_ID = "local-main";

export function createDefaultSpatialAccountManifest(): SpatialAccountManifest {
  return {
    schema: "urai.spatial.account.v1",
    activeAccountId: SPATIAL_DEFAULT_ACCOUNT_ID,
    profiles: [
      {
        id: SPATIAL_DEFAULT_ACCOUNT_ID,
        label: "Local Main",
        createdAt: new Date(0).toISOString(),
      },
    ],
  };
}

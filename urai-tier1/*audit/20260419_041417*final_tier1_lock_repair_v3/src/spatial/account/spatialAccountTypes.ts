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

export function createDefaultSpatialAccountManifest(): SpatialAccountManifest {
  return {
    schema: "urai.spatial.account.v1",
    activeAccountId: "local-main",
    profiles: [
      {
        id: "local-main",
        label: "Local Main",
        createdAt: new Date(0).toISOString(),
      },
    ],
  };
}

import { createHash } from "node:crypto";

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function createSceneReceipt(input) {
  if (!input?.sceneId || !input?.route || !input?.assetPackId) {
    throw new Error("scene identity, route and asset pack are required");
  }
  const core = {
    version:"1.0.0",
    receiptId:input.receiptId,
    sceneId:input.sceneId,
    route:input.route,
    assetPackId:input.assetPackId,
    navigation:{
      from:input.navigation?.from ?? null,
      to:input.navigation?.to ?? input.route,
      continuityId:input.navigation?.continuityId ?? null,
    },
    stateVersion:input.stateVersion ?? "unknown",
    dependencies:[...new Set(input.dependencies ?? [])].sort(),
    capturedAt:input.capturedAt,
    synthetic:Boolean(input.synthetic),
  };
  return {
    ...core,
    stateDigest:digest({
      sceneId:core.sceneId,
      route:core.route,
      assetPackId:core.assetPackId,
      navigation:core.navigation,
      stateVersion:core.stateVersion,
      dependencies:core.dependencies,
    }),
    mutationAuthority:false,
  };
}

export function compareSceneReceipts(before,after) {
  return {
    sameScene:before.sceneId===after.sceneId,
    sameAssetPack:before.assetPackId===after.assetPackId,
    stateChanged:before.stateDigest!==after.stateDigest,
    continuityPreserved:
      Boolean(before.navigation.continuityId) &&
      before.navigation.continuityId===after.navigation.continuityId,
  };
}

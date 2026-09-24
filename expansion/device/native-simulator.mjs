export const PLATFORM_CAPABILITIES = Object.freeze({
  ios:      { haptics:true, notifications:true, location:true, backgroundQueue:true, xr:false },
  ipados:   { haptics:true, notifications:true, location:true, backgroundQueue:true, xr:false },
  watchos:  { haptics:true, notifications:true, location:true, backgroundQueue:true, xr:false },
  android:  { haptics:true, notifications:true, location:true, backgroundQueue:true, xr:false },
  wearos:   { haptics:true, notifications:true, location:true, backgroundQueue:true, xr:false },
  macos:    { haptics:false,notifications:true, location:true, backgroundQueue:true, xr:false },
  windows:  { haptics:false,notifications:true, location:true, backgroundQueue:true, xr:false },
  visionos: { haptics:false,notifications:true, location:true, backgroundQueue:true, xr:true },
  web:      { haptics:false,notifications:true, location:true, backgroundQueue:false,xr:true },
});

export function createNativeSimulator(platform) {
  const declared = PLATFORM_CAPABILITIES[platform];
  if (!declared) throw new Error("unsupported simulator platform");

  const permissions = new Map();
  return {
    synthetic:true,
    platform,
    physicalCertification:false,
    capabilities:{...declared},
    permissionState(permission) {
      return permissions.get(permission) ?? "not_requested";
    },
    setPermission(permission, state) {
      if (!["not_requested","denied","limited","granted","revoked"].includes(state)) {
        throw new Error("invalid permission state");
      }
      permissions.set(permission,state);
    },
    canUse(capability, permission) {
      if (declared[capability] !== true) return false;
      if (!permission) return true;
      return permissions.get(permission) === "granted";
    },
    lifecycle(event) {
      if (!["foreground","background","suspended","terminated"].includes(event)) {
        throw new Error("invalid lifecycle event");
      }
      return {platform,event,synthetic:true};
    },
  };
}

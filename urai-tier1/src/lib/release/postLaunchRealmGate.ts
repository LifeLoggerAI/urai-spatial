/** Fail-closed V1 boundary for implemented but not launch-certified spatial realms. */
export function postLaunchSpatialRealmsEnabled() {
  return process.env.URAI_ENABLE_POST_LAUNCH_REALMS === 'true'
}

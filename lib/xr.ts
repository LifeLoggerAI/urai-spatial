export async function isXrSupported(mode: 'immersive-vr' | 'immersive-ar') {
  if (navigator.xr) {
    return await navigator.xr.isSessionSupported(mode);
  }
  return false;
}

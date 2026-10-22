// Client interaction freshness only. Does NOT grant engineering permissions.
// Route navigation (including leave -> return) invalidates in-flight results.
const ROUTES=new Set(['/','/home','/ascent','/life-map','/focus','/replay']);
export function chalkRouteEpochCurrent({startRoute,currentPathname,startEpoch,currentEpoch}){
 return typeof startRoute==='string' && ROUTES.has(startRoute) &&
  currentPathname===startRoute &&
  Number.isSafeInteger(startEpoch) && Number.isSafeInteger(currentEpoch) &&
  startEpoch>=0 && startEpoch===currentEpoch;
}

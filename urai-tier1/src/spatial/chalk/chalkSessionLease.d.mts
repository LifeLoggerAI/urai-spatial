export function isChalkSessionLeaseCurrent(input: {
  requestedUid:string;currentUid:string|null;requestedAuthEpoch:number;currentAuthEpoch:number;
  requestedRoute:string;currentRoute:string;requestedRouteEpoch:number;currentRouteEpoch:number
}):boolean;

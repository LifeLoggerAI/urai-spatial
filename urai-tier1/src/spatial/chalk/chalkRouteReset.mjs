// Release only route-scoped engineering UI state when navigation changes.
// The existing auth/route lease still rejects results from old requests.
export function resetChalkRouteState(input) {
  const {stop, setReport, setPending, setJobs, setBusy} = input ?? {};
  if ([stop, setReport, setPending, setJobs, setBusy].some(fn => typeof fn !== 'function'))
    throw new Error('CHALK_ROUTE_RESET_CALLBACKS_REQUIRED');
  // Abort browser speech input before allowing new work on the destination.
  stop();
  setReport('');
  setPending(null);
  setJobs([]);
  // The old request's finally is deliberately lease-scoped, so release here.
  setBusy(false);
}

export function resetChalkRouteState(input: {
  stop(): void;
  setReport(value: string): void;
  setPending(value: null): void;
  setJobs(value: never[]): void;
  setBusy(value: boolean): void;
}): void;

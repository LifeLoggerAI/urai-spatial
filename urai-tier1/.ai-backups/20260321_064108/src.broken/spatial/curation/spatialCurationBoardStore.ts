"use client";

import { useSyncExternalStore } from "react";

type SpatialCurationBoardState = Record<string, unknown>;

const snapshot: SpatialCurationBoardState = {
  items: [],
};

const subscribe = (_onStoreChange: () => void) => () => {};

export function useSpatialCurationBoardStore<T>(
  selector: (state: SpatialCurationBoardState & Record<string, any>) => T,
): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(snapshot as SpatialCurationBoardState & Record<string, any>),
    () => selector(snapshot as SpatialCurationBoardState & Record<string, any>),
  );
}

export function getSpatialCurationBoardSnapshot() {
  return snapshot as SpatialCurationBoardState & Record<string, any>;
}

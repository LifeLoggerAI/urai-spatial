"use client";

import { create } from "zustand";
import {
  createEmptyXrInputSnapshot,
  type XrInputSnapshot,
} from "@/spatial/xr/xrInputTypes";

type XrInputStore = XrInputSnapshot & {
  setSnapshot: (snapshot: XrInputSnapshot) => void;
  reset: () => void;
};

export const useXrInputStore = create<XrInputStore>((set) => ({
  ...createEmptyXrInputSnapshot(),
  setSnapshot: (snapshot) => set(snapshot),
  reset: () => set(createEmptyXrInputSnapshot()),
}));

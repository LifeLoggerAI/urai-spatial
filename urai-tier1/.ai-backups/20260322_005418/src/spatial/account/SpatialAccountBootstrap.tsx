"use client";

import { useEffect, useMemo, useState } from "react";
import { readSpatialAccountManifest, writeSpatialAccountManifest } from "./spatialAccountIO";
import { useSpatialAccountStore } from "./spatialAccountStore";
import type { SpatialAccountManifest } from "./spatialAccountTypes";

type AccountWindow = Window & {
  __URAI_SPATIAL_ACCOUNT_MANIFEST__?: SpatialAccountManifest;
};

export default function SpatialAccountBootstrap() {
  const hydrate = useSpatialAccountStore((s) => s.hydrate);
  const activeAccountId = useSpatialAccountStore((s) => s.activeAccountId);
  const profiles = useSpatialAccountStore((s) => s.profiles);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate(readSpatialAccountManifest());
    setReady(true);
  }, [hydrate]);

  const manifest = useMemo(
    () => ({
      schema: "urai.spatial.account.v1" as const,
      activeAccountId,
      profiles,
    }),
    [activeAccountId, profiles],
  );

  useEffect(() => {
    if (!ready) return;
    writeSpatialAccountManifest(manifest);
    const target = window as AccountWindow;
    target.__URAI_SPATIAL_ACCOUNT_MANIFEST__ = manifest;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-account-manifest", {
        detail: manifest,
      }),
    );
  }, [ready, manifest]);

  return null;
}

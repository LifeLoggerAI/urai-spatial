"use client";

import { useEffect, useState } from "react";
import { useSpatialAccountStore } from "./spatialAccountStore";

export default function SpatialAccountBootstrap() {
  const hydrate = useSpatialAccountStore((s) => s.hydrate);
  const activeAccountId = useSpatialAccountStore((s) => s.activeAccountId);
  const profiles = useSpatialAccountStore((s) => s.profiles);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  if (!ready) return null;

  return (
    <div
      style={{ display: "none" }}
      data-spatial-account-ready="true"
      data-active-account-id={activeAccountId ?? ""}
      data-profile-count={profiles.length}
    />
  );
}

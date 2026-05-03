"use client";

import { useMemo, useState } from "react";
import { readSpatialAccountManifest, writeSpatialAccountManifest } from "@/spatial/account/spatialAccountIO";

export default function SpatialAccountPanel() {
  const [label, setLabel] = useState("");
  const manifest = useMemo(() => {
    try { return readSpatialAccountManifest(); } catch { return null; }
  }, []);

  const accountProfileCount = Array.isArray((manifest as { profiles?: unknown[] } | null)?.profiles)
    ? ((manifest as { profiles?: unknown[] }).profiles?.length ?? 0)
    : 0;

  const createProfile = () => {
    const nextLabel = label.trim();
    if (!nextLabel) return;
    const profiles = Array.isArray((manifest as { profiles?: unknown[] } | null)?.profiles)
      ? ([...(manifest as { profiles: unknown[] }).profiles] as Array<{ id?: string; label?: string; createdAt?: string }>)
      : [];

    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `profile-${Date.now()}`;
    writeSpatialAccountManifest({
      schema: "urai.spatial.account.v1",
      activeAccountId: (manifest as { activeAccountId?: string } | null)?.activeAccountId,
      profiles: [...profiles, { id, label: nextLabel, createdAt: new Date().toISOString() }],
    });
    setLabel("");
    if (typeof window !== "undefined") window.location.reload();
  };

  return <section className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white"><div className="mb-3 text-sm font-semibold">Spatial Account</div><div className="mb-3 text-xs opacity-80">Profiles: {accountProfileCount}</div><div className="flex gap-2"><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="New profile label" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"/><button type="button" onClick={createProfile} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm">Create</button></div></section>;
}

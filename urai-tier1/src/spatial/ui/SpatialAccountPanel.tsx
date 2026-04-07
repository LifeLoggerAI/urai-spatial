import { uraiNow, uraiRandom, uraiTime } from "@/lib/uraiDeterminism";
"use client";

import { useMemo, useState } from "react";
import {
  readSpatialAccountManifest,
  writeSpatialAccountManifest,
} from "@/spatial/account/spatialAccountIO";

export default function SpatialAccountPanel() {
  const [label, setLabel] = useState("");

  const manifest = useMemo(() => {
    try {
      return readSpatialAccountManifest();
    } catch {
      return null;
    }
  }, []);

  const accountProfileCount = useMemo(() => {
    const profiles = manifest?.profiles;
    return Array.isArray(profiles) ? profiles.length : 0;
  }, [manifest]);

  const createProfile = () => {
    const nextLabel = label.trim();
    if (!nextLabel) return;

    const nextManifest = {
      schema: "urai.spatial.account.v1" as const,
      activeAccountId: manifest?.activeAccountId,
      profiles: [
        ...(Array.isArray(manifest?.profiles) ? manifest.profiles : []),
        {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `profile-${uraiNow()}`,
          label: nextLabel,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    writeSpatialAccountManifest(nextManifest);
    setLabel("");
    if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
      <div className="mb-3 text-sm font-semibold">Spatial Account</div>

      <div className="mb-3 text-xs opacity-80">
        Profiles: {accountProfileCount}
      </div>

      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="New profile label"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
        />
        <button
          type="button"
          onClick={createProfile}
          className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm"
        >
          Create
        </button>
      </div>
    </section>
  );
}

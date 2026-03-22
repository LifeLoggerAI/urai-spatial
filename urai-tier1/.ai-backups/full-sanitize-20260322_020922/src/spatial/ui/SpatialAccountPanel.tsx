"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import {
  createSpatialAccountProfile,
  readSpatialAccountManifest,
  writeSpatialAccountManifest,
} from "@/spatial/account/spatialAccountIO";
import { useSpatialAccountStore } from "@/spatial/account/spatialAccountStore";

export default function SpatialAccountPanel() {
  const activeAccountId = useSpatialAccountStore((s) => s.activeAccountId);
  const profiles = useSpatialAccountStore((s) => s.profiles);
  const replaceManifest = useSpatialAccountStore((s) => s.replaceManifest);

  const [label, setLabel] = useState("");

  const activeProfile = useMemo(
    () => profiles.find((item) => item.id === activeAccountId) ?? null,
    [profiles, activeAccountId],
  );

  const activateProfile = (accountId: string) => {
    const manifest = readSpatialAccountManifest();
    const next = {
      ...manifest,
      activeAccountId: accountId,
    };
    writeSpatialAccountManifest(next);
    replaceManifest(next);
    window.location.reload();
  };

  const addProfile = () => {
    const profile = createSpatialAccountProfile(label);
    const manifest = readSpatialAccountManifest();
    const next = {
      ...manifest,
      activeAccountId: profile.id,
      profiles: [...manifest.profiles, profile],
    };
    writeSpatialAccountManifest(next);
    replaceManifest(next);
    setLabel("");
    window.location.reload();
  };

  const removeProfile = (accountId: string) => {
    const manifest = readSpatialAccountManifest();
    const profilesNext = manifest.profiles.filter((item) => item.id !== accountId);
    if (profilesNext.length === 0) return;

    const next = {
      ...manifest,
      activeAccountId:
        manifest.activeAccountId === accountId
          ? profilesNext[0].id
          : manifest.activeAccountId,
      profiles: profilesNext,
    };
    writeSpatialAccountManifest(next);
    replaceManifest(next);
    window.location.reload();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 18,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 63,
        width: 340,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(8,12,24,0.80)",
        backdropFilter: "blur(14px)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
        padding: 14,
        color: "rgba(255,255,255,0.92)",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: 1.1,
          textTransform: "uppercase",
          opacity: 0.68,
          marginBottom: 8,
        }}
      >
        Spatial Accounts
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88, marginBottom: 10 }}>
        active: {activeProfile?.label ?? "none"}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="new profile label"
          style={inputStyle}
        />
        <button type="button" onClick={addProfile} style={buttonStyle}>
          Add
        </button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {profiles.map((profile) => (
          <div key={profile.id} style={rowStyle}>
            <div>
              <div style={{ fontSize: 13 }}>{profile.label}</div>
              <div style={{ fontSize: 11, opacity: 0.62 }}>{profile.id}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => activateProfile(profile.id)}
                style={buttonStyle}
              >
                Use
              </button>
              {profiles.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeProfile(profile.id)}
                  style={buttonStyle}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  flex: 1,
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  fontSize: 13,
  padding: "10px 12px",
  outline: "none",
};

const buttonStyle: CSSProperties = {
  appearance: "none",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  fontSize: 12,
  padding: "9px 10px",
  cursor: "pointer",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  padding: 10,
};

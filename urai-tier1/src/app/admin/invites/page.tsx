"use client";

import { useEffect, useState } from "react";
import { TierOneStaticShell } from "@/spatial/layout/TierOneStaticShell";
import { createAdminInvite, listAdminInvites, inviteLink, adminInviteMode } from "../../../spatial/landing/adminInvites";

type InviteRow = {
  inviteCode: string;
  email: string;
  status: string;
};

function adminRouteAllowed() {
  return process.env.NEXT_PUBLIC_ALLOW_ADMIN_ROUTES === "true" || process.env.NODE_ENV !== "production";
}

export default function AdminInvitesPage() {
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mode = adminInviteMode();

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const data = await listAdminInvites();
      setInvites(data as InviteRow[]);
    } catch (err: any) {
      setError(err?.message ?? "Unable to load invites.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!adminRouteAllowed()) return;
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      await createAdminInvite(email);
      setEmail("");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Unable to create invite.");
      setLoading(false);
    }
  }

  async function copy(code: string, link: string) {
    await navigator.clipboard.writeText(link);
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(null), 1800);
  }

  if (!adminRouteAllowed()) {
    return (
      <TierOneStaticShell
        eyebrow="URAI Admin"
        title="Admin route locked"
        description="This route is disabled in production unless NEXT_PUBLIC_ALLOW_ADMIN_ROUTES is explicitly enabled."
        align="top"
      />
    );
  }

  return (
    <TierOneStaticShell
      eyebrow="URAI Admin"
      title="Invite Control"
      description="Create and copy early-access links without leaving the Tier-1 launch system."
      align="top"
    >
      <p className="tier-one-static-shell__microcopy">
        Invite storage: {mode === "firestore" ? "Live Firestore" : "Local launch fallback"}
      </p>

      <form onSubmit={handleCreate} className="tier-one-form">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@email.com"
          type="email"
          required
        />
        <button disabled={loading}>{loading ? "Working..." : "Create Invite"}</button>
      </form>

      {error ? <p className="tier-one-static-shell__message tier-one-static-shell__message--error">{error}</p> : null}

      {loading && invites.length === 0 ? (
        <p className="tier-one-static-shell__microcopy">Loading invites...</p>
      ) : (
        <div className="tier-one-admin-list">
          {invites.length === 0 ? (
            <p className="tier-one-static-shell__microcopy">No invites yet.</p>
          ) : (
            invites.map((invite) => {
              const link = inviteLink(invite.inviteCode);
              return (
                <article key={invite.inviteCode} className="tier-one-admin-row">
                  <div>
                    <strong>{invite.email}</strong>
                    <span>{invite.inviteCode}</span>
                  </div>
                  <small>{invite.status}</small>
                  <button type="button" onClick={() => copy(invite.inviteCode, link)}>
                    {copiedCode === invite.inviteCode ? "Copied" : "Copy Link"}
                  </button>
                </article>
              );
            })
          )}
        </div>
      )}
    </TierOneStaticShell>
  );
}

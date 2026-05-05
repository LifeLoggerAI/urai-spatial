"use client";

import { useEffect, useState } from "react";
import { createAdminInvite, listAdminInvites, inviteLink } from "../../../spatial/landing/adminInvites";

export default function AdminInvitesPage() {
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const data = await listAdminInvites();
    setInvites(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    await createAdminInvite(email);
    setEmail("");
    await load();
  }

  function copy(link: string) {
    navigator.clipboard.writeText(link);
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl mb-6">URAI Admin Invites</h1>

      <form onSubmit={handleCreate} className="flex gap-3 mb-6">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@email.com"
          className="px-3 py-2 bg-gray-900 border border-gray-700"
        />
        <button className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/30">
          Create Invite
        </button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="space-y-3">
          {invites.map((i) => {
            const link = inviteLink(i.inviteCode);
            return (
              <div key={i.inviteCode} className="border border-gray-800 p-3">
                <div>{i.email}</div>
                <div className="text-sm text-gray-400">{i.inviteCode}</div>
                <div className="text-xs text-gray-500">{i.status}</div>
                <button
                  onClick={() => copy(link)}
                  className="mt-2 text-cyan-300 text-sm"
                >
                  Copy Link
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

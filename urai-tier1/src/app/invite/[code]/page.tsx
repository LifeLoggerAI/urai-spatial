"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { acceptInvite } from "../../../spatial/landing/inviteAccess";

export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params?.code ?? "";

  const [status, setStatus] = useState<"loading" | "accepted" | "missing" | "invalid">("loading");
  const [message, setMessage] = useState("Checking your invite...");

  useEffect(() => {
    async function run() {
      const result = await acceptInvite(code);

      if (result.ok) {
        setStatus("accepted");
        setMessage("Invite accepted. Preparing your Life Map...");

        setTimeout(() => {
          router.push("/life-map");
        }, 1500);

        return;
      }

      setStatus(result.status);
      setMessage(result.status === "missing" ? "Invite not found." : "Invite invalid.");
    }

    run();
  }, [code, router]);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-center px-6">
      <div className="space-y-4">
        <h1 className="text-2xl">URAI</h1>
        <p className="text-slate-300">{message}</p>

        {status !== "accepted" && (
          <button
            onClick={() => router.push("/early-access")}
            className="mt-4 px-4 py-2 border border-cyan-400/30 rounded-full"
          >
            Request Access
          </button>
        )}
      </div>
    </main>
  );
}

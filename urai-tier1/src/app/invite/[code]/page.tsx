"use client";

import { useEffect, useState } from "react";
import { acceptInvite } from "../../../spatial/landing/inviteAccess";
import { useParams, useRouter } from "next/navigation";

export default function InvitePage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Checking your invite…");
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params?.code ?? "";

  useEffect(() => {
    async function run() {
      try {
        if (!code) throw new Error("Invalid invite.");
        await acceptInvite(code);
        setStatus("success");
        setMessage("Invite accepted. Preparing your Life Map…");

        setTimeout(() => {
          router.push("/life-map");
        }, 1500);
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message || "Invalid invite.");
      }
    }

    run();
  }, [code, router]);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-center px-6">
      <div className="space-y-4">
        <h1 className="text-2xl">URAI</h1>
        <p className="text-slate-300">{message}</p>
        {status === "error" && (
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

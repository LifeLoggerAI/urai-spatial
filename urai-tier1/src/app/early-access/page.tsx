"use client";

import { useState } from "react";
import { saveEarlyAccessSignup } from "../../spatial/landing/earlyAccessSignup";

export default function EarlyAccessPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      await saveEarlyAccessSignup(email);
      setStatus("success");
      setEmail("");
      setMessage("You’re on the list. When the map opens, we’ll send you the first light.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message ?? "Something went wrong.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xl space-y-8">
        <h1 className="text-3xl md:text-5xl font-light">
          URAI
        </h1>

        <p className="text-lg md:text-xl text-slate-300">
          A quiet AI life map for the patterns you carry.
        </p>

        <p className="text-sm text-slate-400">
          URAI is opening quietly. Early users will help shape how the Life Map notices patterns and presents meaning without noise.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          <input
            type="email"
            required
            placeholder="your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-2 rounded-full bg-slate-900 border border-slate-700 text-white w-64"
          />

          <button
            type="submit"
            disabled={status === "loading"}
            className="px-5 py-2 rounded-full bg-cyan-500/20 border border-cyan-400/30 hover:bg-cyan-500/30"
          >
            {status === "loading" ? "Joining…" : "Join Early Access"}
          </button>
        </form>

        {message && (
          <p className="text-sm text-slate-300">{message}</p>
        )}

        <div className="text-xs text-slate-500 pt-4">
          URAI does not diagnose. URAI does not decide what your life means.
        </div>
      </div>
    </main>
  );
}

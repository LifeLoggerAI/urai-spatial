import LaunchReadinessWidget from "../../components/LaunchReadinessWidget";
import LaunchVersionWidget from "../../components/LaunchVersionWidget";
import LaunchReceiptWidget from "../../components/LaunchReceiptWidget";

export const metadata = {
  title: "URAI Launch Dashboard",
  description: "URAI readiness and verification dashboard.",
};

export default function LaunchDashboardPage() {
  return (
    <main className="min-h-screen bg-[#020713] px-6 py-12 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="text-xs font-black uppercase tracking-[0.4em] text-cyan-200">
          URAI Launch Dashboard
        </p>
        <h1 className="mt-4 text-5xl font-black">Launch readiness control room</h1>
        <p className="mt-5 max-w-3xl text-slate-300">
          Readiness, version, evidence, and release visibility.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <LaunchReadinessWidget />
          <LaunchVersionWidget />
          <LaunchReceiptWidget />
        </div>
      </section>
    </main>
  );
}

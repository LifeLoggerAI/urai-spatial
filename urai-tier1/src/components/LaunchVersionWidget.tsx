const release = {
  version: "V1 Foundation",
  state: "Verification Ready",
  checks: [
    "Build verification",
    "Release checks",
    "Evidence receipts",
    "Documentation systems",
  ],
};

export default function LaunchVersionWidget() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-200">
        Release Status
      </p>
      <h2 className="mt-3 text-3xl font-black">{release.version}</h2>
      <p className="mt-2 text-slate-300">{release.state}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-300">
        {release.checks.map((check) => (
          <li key={check}>✓ {check}</li>
        ))}
      </ul>
    </section>
  );
}

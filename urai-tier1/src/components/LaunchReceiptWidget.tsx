const receipts = [
  "Build verification",
  "Guardian verification",
  "E2E verification",
  "Release verification",
];

export default function LaunchReceiptWidget() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-200">
        Evidence Receipts
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-300">
        {receipts.map((receipt) => (
          <li key={receipt}>✓ {receipt}</li>
        ))}
      </ul>
    </section>
  );
}

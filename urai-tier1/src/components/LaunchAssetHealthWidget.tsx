const assets = {
  total: 213,
  ready: 53,
  pending: 160,
};

export default function LaunchAssetHealthWidget() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-200">
        Asset Manifest Health
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>Total<br /><strong>{assets.total}</strong></div>
        <div>Ready<br /><strong>{assets.ready}</strong></div>
        <div>Pending<br /><strong>{assets.pending}</strong></div>
      </div>
    </section>
  );
}

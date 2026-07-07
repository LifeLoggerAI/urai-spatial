import { launchReadiness } from "../lib/launch/readinessData";

export default function LaunchReadinessWidget() {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      {launchReadiness.areas.map((item) => (
        <article key={item.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex justify-between">
            <strong>{item.name}</strong>
            <span>{item.state}</span>
          </div>
          <p className="mt-2 text-sm text-slate-300">{item.evidence}</p>
        </article>
      ))}
    </section>
  );
}

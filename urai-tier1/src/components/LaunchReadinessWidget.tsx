type Item = {
  name: string;
  state: "GREEN" | "YELLOW" | "RED";
  detail: string;
};

const items: Item[] = [
  { name: "Engineering", state: "GREEN", detail: "Build and verification systems" },
  { name: "Assets", state: "YELLOW", detail: "Premium media integration pending" },
  { name: "Documentation", state: "GREEN", detail: "Launch documentation complete" },
  { name: "Deployment", state: "YELLOW", detail: "Final hosted certification" },
];

export default function LaunchReadinessWidget() {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <article key={item.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex justify-between">
            <strong>{item.name}</strong>
            <span>{item.state}</span>
          </div>
          <p className="mt-2 text-sm text-slate-300">{item.detail}</p>
        </article>
      ))}
    </section>
  );
}

import { useGroundState } from "./ground-state";

export default function GroundPanel() {
  const selected = useGroundState((s) => s.selected);
  const objects = useGroundState((s) => s.objects);
  const select = useGroundState((s) => s.select);

  if (!selected) return null;

  const obj = objects.find((o) => o.id === selected);
  if (!obj) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white p-6 rounded-xl w-full max-w-sm">
      <h2 className="text-xl font-semibold">{obj.label}</h2>
      <p className="text-sm opacity-70 mt-1">Intensity: {obj.intensity}</p>
      <button
        className="absolute top-2 right-2 text-2xl opacity-70 hover:opacity-100"
        onClick={() => select(null)}
      >
        &times;
      </button>
    </div>
  );
}

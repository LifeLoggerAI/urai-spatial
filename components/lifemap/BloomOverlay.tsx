export default function BloomOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md text-white z-50">
      <div className="max-w-xl p-6">
        <h2 className="text-2xl font-light mb-4">Memory Bloom</h2>
        <p>Emotional summary goes here.</p>
      </div>
    </div>
  )
}

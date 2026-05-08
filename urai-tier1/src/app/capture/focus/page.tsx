import MemoryStarArtifact from '@/spatial/memory/MemoryStarArtifact'
import { buildMemoryMorphology } from '@/spatial/memory/memoryMorphology'

export default function CinematicFocusCaptureRoute() {
  const morphology = buildMemoryMorphology(null, 'recovery')

  return (
    <main className="urai-capture-focus" data-capture-mode="true" data-memory-state={morphology.state} data-memory-tone={morphology.tone}>
      <div className="urai-capture-focus__field" aria-hidden="true" />
      <section className="urai-capture-focus__copy" aria-label="URAI focus state">
        <div className="urai-capture-focus__eyebrow">{morphology.systemLabel}</div>
        <h1>A memory star, opened gently.</h1>
        <p>{morphology.poeticLine}</p>
      </section>
      <MemoryStarArtifact morphology={morphology} />
      <section className="urai-capture-focus__action" aria-label="Selected memory star">
        <div className="urai-capture-focus__eyebrow">Memory Star Open</div>
        <h2>{morphology.title}</h2>
        <p>This star is open. Start replay to enter the memory stream.</p>
        <div className="urai-capture-focus__button">Start Replay</div>
      </section>
    </main>
  )
}

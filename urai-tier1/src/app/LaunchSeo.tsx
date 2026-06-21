export function LaunchSeo({ label }: { label: string }) {
  return (
    <section aria-label="URAI launch route summary" style={{ display: 'none' }}>
      <h1>{label}</h1>
      <p>URAI Spatial is a connected 3D product surface with Home, Life Map, Focus, Replay, Mirror, Passport, and Status routes.</p>
      <p>The live experience includes spatial camera movement, memory selection, replay paths, and route navigation.</p>
      <a href="/home">Home</a>
      <a href="/life-map">Life Map</a>
      <a href="/focus?memoryId=quiet-reset">Focus</a>
      <a href="/replay?manifestId=replay-recovery-thread">Replay</a>
      <a href="/mirror">Mirror</a>
      <a href="/passport">Passport</a>
      <a href="/status">Status</a>
    </section>
  )
}

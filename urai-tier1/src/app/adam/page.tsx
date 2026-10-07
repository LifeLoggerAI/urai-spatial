import AdamLauncherSlot from '@/spatial/adam/AdamLauncherSlot'

export const metadata = {
  title: 'Adam — UrAi Founder Presence',
  description: 'Talk with Adam, the governed digital Founder presence inside UrAi.',
}

export default function AdamPage() {
  return (
    <main
      data-urai-adam-route="canonical"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(28px, 6vw, 72px)',
        background: 'radial-gradient(circle at 50% 20%, #152735 0%, #09111a 44%, #05090d 100%)',
        color: '#f7fafb',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <section style={{ width: 'min(760px, 100%)' }}>
        <p style={{ margin: 0, opacity: 0.6, letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: 12 }}>
          UrAi Founder Presence
        </p>
        <h1 style={{ margin: '14px 0 12px', fontSize: 'clamp(48px, 10vw, 94px)', lineHeight: 0.95, letterSpacing: '-0.055em' }}>
          Adam
        </h1>
        <p style={{ maxWidth: 620, margin: 0, fontSize: 'clamp(17px, 2.5vw, 23px)', lineHeight: 1.5, color: 'rgba(244,249,250,.78)' }}>
          Ask about UrAi, what you are seeing, where to go next, or why the system was built the way it was.
        </p>
        <p style={{ maxWidth: 620, margin: '18px 0 0', fontSize: 13, lineHeight: 1.6, color: 'rgba(244,249,250,.52)' }}>
          Binding founder, legal, financial, governance, partnership, and other explicitly human decisions still require the human founder.
        </p>
        <div style={{ maxWidth: 320, marginTop: 28 }}>
          <AdamLauncherSlot name="adam-route" as="div" />
        </div>
      </section>
    </main>
  )
}

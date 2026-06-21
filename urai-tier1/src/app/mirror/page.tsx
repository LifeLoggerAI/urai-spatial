import { CinematicRouteSurface } from '@/spatial/layout/CinematicRouteSurface';

export const metadata = {
  title: 'URAI Mirror',
  description: 'URAI Mirror is the reflection realm for pattern recognition, return paths, and public-safe self-recognition.',
};

export default function MirrorRoutePage() {
  return (
    <CinematicRouteSurface
      tone="mirror"
      eyebrow="URAI Mirror · Reflection Realm"
      title="See the pattern without leaving the world."
      lead="Mirror is not a report. It is a quiet realm where the selected thread can reflect back as shape, rhythm, and return path while the Life Map remains one step away."
      primary={{ label: 'Return to Life Map', href: '/life-map' }}
      secondary={{ label: 'Open Focus', href: '/focus?memoryId=quiet-reset' }}
      signals={[
        { label: 'State', value: 'Softened' },
        { label: 'Route', value: 'Open' },
        { label: 'Privacy', value: 'Held' },
      ]}
      panels={[
        { title: 'Recognition', body: 'Patterns are shown as meaning, not judgment. The reflection names the shape without trapping the person inside it.' },
        { title: 'Continuity', body: 'Mirror keeps the same emotional thread connected back to Life Map, Focus, and Replay.' },
        { title: 'Consent', body: 'The route stays public-safe and leaves private detail behind the Passport layer.' },
      ]}
    />
  );
}

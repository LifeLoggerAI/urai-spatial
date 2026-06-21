import { CinematicRouteSurface } from '@/spatial/layout/CinematicRouteSurface';

export const metadata = {
  title: 'URAI Passport',
  description: 'URAI Passport keeps identity, permissions, provenance, and memory access private-by-default.',
};

export default function PassportRoutePage() {
  return (
    <CinematicRouteSurface
      tone="passport"
      eyebrow="URAI Passport · Ownership Layer"
      title="Own your life. Live your world."
      lead="Passport is the trust layer beneath the spatial world: identity, consent, provenance, and access remain visible while memories become stars and replays become routes."
      primary={{ label: 'Open Life Map', href: '/life-map' }}
      secondary={{ label: 'Privacy Controls', href: '/privacy-controls' }}
      signals={[
        { label: 'Identity', value: 'Owned' },
        { label: 'Access', value: 'Gated' },
        { label: 'Trail', value: 'Visible' },
      ]}
      panels={[
        { title: 'Identity', body: 'The world has an owner. URAI treats identity as permission and continuity, not extraction.' },
        { title: 'Provenance', body: 'Every memory surface keeps a visible trail back to where it came from and why it appears.' },
        { title: 'Control', body: 'Life Map, Focus, Replay, and Mirror stay connected through user-controlled route gates.' },
      ]}
    />
  );
}

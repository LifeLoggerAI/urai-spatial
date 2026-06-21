import { CinematicRouteSurface } from '@/spatial/layout/CinematicRouteSurface';

export const metadata = {
  title: 'URAI Status',
  description: 'URAI Spatial launch status for Home, Life Map, Focus, Replay, Mirror, Passport, and Status.',
};

export default function StatusRoutePage() {
  return (
    <CinematicRouteSurface
      tone="status"
      eyebrow="URAI Status · Launch Surface"
      title="World online. Routes alive."
      lead="Status is the public readiness surface for the route chain. Home, Life Map, Focus, Replay, Mirror, Passport, Privacy, and Status resolve as one connected spatial system."
      primary={{ label: 'Open Home', href: '/home' }}
      secondary={{ label: 'Open Life Map', href: '/life-map' }}
      signals={[
        { label: 'Routes', value: '10' },
        { label: 'Smoke', value: '200' },
        { label: 'Export', value: 'Safe' },
      ]}
      panels={[
        { title: 'Route health', body: 'The primary surfaces are reachable and wired with no dead-end launch path.' },
        { title: 'Static safety', body: 'The public build remains Firebase Hosting and static-export safe.' },
        { title: 'World continuity', body: 'The same memory-world language connects Home, Life Map, Focus, Replay, Mirror, and Passport.' },
      ]}
    />
  );
}

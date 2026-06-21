import { CinematicRouteSurface } from '@/spatial/layout/CinematicRouteSurface';

export const metadata = {
  title: 'URAI Status',
  description: 'URAI Spatial launch status for the connected route chain.',
};

export default function StatusRoutePage() {
  return (
    <CinematicRouteSurface
      tone="status"
      eyebrow="URAI Status · Launch Surface"
      title="World online. Routes alive."
      lead="Status is the public readiness surface for the connected route chain."
      primary={{ label: 'Open Home', href: '/home' }}
      secondary={{ label: 'Open Life Map', href: '/life-map' }}
      signals={[
        { label: 'Routes', value: '10' },
        { label: 'Smoke', value: '200' },
        { label: 'Export', value: 'Safe' },
      ]}
      panels={[
        { title: 'Route health', body: 'The primary surfaces are reachable and wired with no dead-end launch path.' },
        { title: 'Static safety', body: 'The public build remains static hosting safe.' },
        { title: 'World continuity', body: 'The same memory-world language connects the product surface.' },
      ]}
    />
  );
}

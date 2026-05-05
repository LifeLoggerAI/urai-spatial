'use client';

import LifeMapScene from '@/components/spatial/LifeMapScene';
import InsightReportPanel from '@/components/spatial/InsightReportPanel';
import AuthPanel from '@/components/spatial/AuthPanel';

export default function SpatialPage() {
  return (
    <main style={{ display: 'grid', gap: '1rem', padding: '1rem' }}>
      <AuthPanel />

      <section>
        <h2>Life Map</h2>
        <LifeMapScene />
      </section>

      <section>
        <h2>Reports</h2>
        <InsightReportPanel planId="free" />
        <InsightReportPanel planId="pro" />
        <InsightReportPanel planId="therapist" />
        <InsightReportPanel planId="founder" />
      </section>
    </main>
  );
}

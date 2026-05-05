'use client';

import { useMemo } from 'react';
import {
  buildInsightReport,
  renderInsightReportMarkdown,
  downloadMarkdown,
  INSIGHT_PLANS,
  type InsightPlanId,
} from './insightMonetizationEngine';
import {
  getInsightStorageKey,
  parseInsightLedger,
} from './persistentInsightEngine';

export default function InsightReportPanel({ planId = 'free' as InsightPlanId }: { planId?: InsightPlanId }) {
  const ledger = useMemo(() => {
    if (typeof window === 'undefined') return { insights: [], updatedAt: null };
    return parseInsightLedger(window.localStorage.getItem(getInsightStorageKey()));
  }, []);

  const report = useMemo(() => buildInsightReport(ledger, planId), [ledger, planId]);

  const markdown = useMemo(() => renderInsightReportMarkdown(report), [report]);

  const plan = INSIGHT_PLANS.find((p) => p.id === planId);

  return (
    <section className="report-panel">
      <header>
        <h2>{report.title}</h2>
        <p>{report.summary}</p>
        <small>{plan?.description}</small>
      </header>

      <div className="totals">
        <span>Total: {report.totals.totalInsights}</span>
        <span>Active: {report.totals.activeInsights}</span>
        <span>High: {report.totals.highSeverityInsights}</span>
      </div>

      <div className="sections">
        {report.sections.map((section, i) => (
          <article key={i}>
            <h3>{section.heading}</h3>
            <p style={{ whiteSpace: 'pre-line' }}>{section.body}</p>
          </article>
        ))}
      </div>

      <div className="actions">
        <button onClick={() => downloadMarkdown(`${report.id}.md`, markdown)}>
          Export Markdown
        </button>
      </div>

      {report.upgradePrompt && (
        <div className="upgrade">
          <p>{report.upgradePrompt}</p>
        </div>
      )}

      <style jsx>{`
        .report-panel{border:1px solid rgba(157,196,255,.3);padding:1rem;border-radius:16px;background:#0b1228;color:#eef3ff}
        header h2{margin:0 0 .25rem}
        .totals{display:flex;gap:.75rem;margin:.5rem 0}
        .sections article{margin:.75rem 0}
        button{margin-top:1rem;padding:.5rem .75rem;border-radius:999px}
        .upgrade{margin-top:1rem;color:#9fc5ff}
      `}</style>
    </section>
  );
}

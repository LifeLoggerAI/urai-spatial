import type { InsightLedgerState, PersistentInsight, PersistentInsightSeverity } from './persistentInsightEngine';

export type InsightPlanId = 'free' | 'pro' | 'therapist' | 'founder';

export type InsightPlan = {
  id: InsightPlanId;
  title: string;
  priceLabel: string;
  description: string;
  unlockedFeatures: string[];
  reportDepth: 'snapshot' | 'weekly' | 'clinical-style' | 'founder-archive';
  maxInsights: number;
};

export type InsightReport = {
  id: string;
  generatedAt: number;
  planId: InsightPlanId;
  title: string;
  summary: string;
  totals: {
    totalInsights: number;
    activeInsights: number;
    resolvedInsights: number;
    highSeverityInsights: number;
  };
  sections: Array<{
    heading: string;
    body: string;
    insightIds: string[];
  }>;
  recommendedActions: string[];
  upgradePrompt: string | null;
};

export const INSIGHT_PLANS: InsightPlan[] = [
  {
    id: 'free',
    title: 'Insight Snapshot',
    priceLabel: 'Free',
    description: 'Basic pattern visibility for the current Life Map.',
    unlockedFeatures: ['Top active patterns', 'Basic evidence', 'Manual resolve/archive'],
    reportDepth: 'snapshot',
    maxInsights: 3,
  },
  {
    id: 'pro',
    title: 'URAI Pro Insights',
    priceLabel: '$9/mo placeholder',
    description: 'Deeper weekly reflection reports with recurrence and severity tracking.',
    unlockedFeatures: ['Weekly report', 'Severity trends', 'Narrator summaries', 'Exportable markdown'],
    reportDepth: 'weekly',
    maxInsights: 12,
  },
  {
    id: 'therapist',
    title: 'Therapist Replay Pack',
    priceLabel: '$29/mo placeholder',
    description: 'Structured evidence trails for coaching, therapy, and guided self-review.',
    unlockedFeatures: ['Clinical-style pattern report', 'Evidence trails', 'Resolution tracking', 'Replay prompts'],
    reportDepth: 'clinical-style',
    maxInsights: 24,
  },
  {
    id: 'founder',
    title: 'Founder Archive',
    priceLabel: 'Founder tier placeholder',
    description: 'Long-term archive for early adopters and high-signal personal intelligence.',
    unlockedFeatures: ['Full archive', 'Advanced exports', 'Priority future cloud sync', 'Legacy summaries'],
    reportDepth: 'founder-archive',
    maxInsights: 80,
  },
];

function severityRank(severity: PersistentInsightSeverity): number {
  if (severity === 'high') return 3;
  if (severity === 'medium') return 2;
  return 1;
}

function sortInsights(insights: PersistentInsight[]): PersistentInsight[] {
  return [...insights].sort((a, b) => {
    const severityDelta = severityRank(b.severity) - severityRank(a.severity);
    if (severityDelta !== 0) return severityDelta;
    const recurrenceDelta = b.recurrenceCount - a.recurrenceCount;
    if (recurrenceDelta !== 0) return recurrenceDelta;
    return b.lastSeenAt - a.lastSeenAt;
  });
}

function summarize(insights: PersistentInsight[]) {
  const active = insights.filter((insight) => insight.status === 'new' || insight.status === 'active');
  const resolved = insights.filter((insight) => insight.status === 'resolved');
  const high = insights.filter((insight) => insight.severity === 'high');
  return {
    totalInsights: insights.length,
    activeInsights: active.length,
    resolvedInsights: resolved.length,
    highSeverityInsights: high.length,
  };
}

function buildSummary(totals: InsightReport['totals']): string {
  if (totals.totalInsights === 0) return 'No persistent insight patterns have been recorded yet.';
  if (totals.highSeverityInsights > 0) return `URAI is tracking ${totals.totalInsights} persistent patterns, including ${totals.highSeverityInsights} high-signal pattern${totals.highSeverityInsights === 1 ? '' : 's'}.`;
  return `URAI is tracking ${totals.totalInsights} persistent pattern${totals.totalInsights === 1 ? '' : 's'}, with ${totals.activeInsights} currently active.`;
}

function sectionForInsight(insight: PersistentInsight): InsightReport['sections'][number] {
  const evidenceCount = insight.evidence.length;
  return {
    heading: insight.message,
    body: `${insight.narratorSummary} Status: ${insight.status}. Severity: ${insight.severity}. Recurrence: ${insight.recurrenceCount}. Evidence points: ${evidenceCount}.`,
    insightIds: [insight.id],
  };
}

export function buildInsightReport(
  ledger: InsightLedgerState,
  planId: InsightPlanId = 'free'
): InsightReport {
  const plan = INSIGHT_PLANS.find((candidate) => candidate.id === planId) ?? INSIGHT_PLANS[0];
  const sorted = sortInsights(ledger.insights).slice(0, plan.maxInsights);
  const totals = summarize(ledger.insights);
  const active = sorted.filter((insight) => insight.status === 'new' || insight.status === 'active');
  const resolved = sorted.filter((insight) => insight.status === 'resolved');
  const archived = sorted.filter((insight) => insight.status === 'archived');

  const sections: InsightReport['sections'] = [];
  if (active.length) {
    sections.push({
      heading: 'Active pattern themes',
      body: active.map((insight) => `${insight.message} (${insight.severity}, recurrence ${insight.recurrenceCount})`).join('\n'),
      insightIds: active.map((insight) => insight.id),
    });
  }
  sections.push(...sorted.slice(0, Math.max(1, plan.maxInsights)).map(sectionForInsight));
  if (resolved.length) {
    sections.push({
      heading: 'Resolved signals',
      body: `${resolved.length} insight${resolved.length === 1 ? '' : 's'} have been marked resolved. These can become recovery evidence in later reports.`,
      insightIds: resolved.map((insight) => insight.id),
    });
  }
  if (archived.length && plan.id !== 'free') {
    sections.push({
      heading: 'Archived background patterns',
      body: `${archived.length} archived insight${archived.length === 1 ? '' : 's'} remain available for long-term review.`,
      insightIds: archived.map((insight) => insight.id),
    });
  }

  return {
    id: `report-${plan.id}-${Date.now()}`,
    generatedAt: Date.now(),
    planId: plan.id,
    title: `${plan.title} Report`,
    summary: buildSummary(totals),
    totals,
    sections,
    recommendedActions: [
      'Review high-severity active insights first.',
      'Mark patterns resolved only when they feel genuinely softened or complete.',
      'Use evidence trails to understand why each insight appeared.',
    ],
    upgradePrompt: plan.id === 'free' ? 'Upgrade placeholder: unlock weekly reports, deeper evidence trails, and therapist replay summaries.' : null,
  };
}

export function renderInsightReportMarkdown(report: InsightReport): string {
  const lines = [
    `# ${report.title}`,
    '',
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    '',
    `## Summary`,
    report.summary,
    '',
    `## Totals`,
    `- Total insights: ${report.totals.totalInsights}`,
    `- Active insights: ${report.totals.activeInsights}`,
    `- Resolved insights: ${report.totals.resolvedInsights}`,
    `- High severity insights: ${report.totals.highSeverityInsights}`,
    '',
  ];

  report.sections.forEach((section) => {
    lines.push(`## ${section.heading}`, section.body, '');
  });

  lines.push('## Recommended actions');
  report.recommendedActions.forEach((action) => lines.push(`- ${action}`));
  if (report.upgradePrompt) lines.push('', `> ${report.upgradePrompt}`);
  return lines.join('\n');
}

export function downloadMarkdown(filename: string, markdown: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

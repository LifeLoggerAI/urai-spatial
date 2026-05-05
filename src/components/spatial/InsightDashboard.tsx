'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getInsightStorageKey,
  parseInsightLedger,
  serializeInsightLedger,
  type InsightLedgerState,
  type PersistentInsight,
  type PersistentInsightSeverity,
  type PersistentInsightStatus,
} from './persistentInsightEngine';

const STATUS_ORDER: PersistentInsightStatus[] = ['new', 'active', 'resolved', 'archived'];
const SEVERITY_ORDER: PersistentInsightSeverity[] = ['high', 'medium', 'low'];

function formatTime(value: number) {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(value);
  } catch {
    return String(value);
  }
}

function updateInsightStatus(ledger: InsightLedgerState, insightId: string, status: PersistentInsightStatus): InsightLedgerState {
  return {
    ...ledger,
    updatedAt: Date.now(),
    insights: ledger.insights.map((insight) => (insight.id === insightId ? { ...insight, status } : insight)),
  };
}

export default function InsightDashboard({ userId = 'local' }: { userId?: string }) {
  const storageKey = getInsightStorageKey(userId);
  const [ledger, setLedger] = useState<InsightLedgerState>({ insights: [], updatedAt: null });
  const [statusFilter, setStatusFilter] = useState<PersistentInsightStatus | 'all'>('all');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const load = () => setLedger(parseInsightLedger(window.localStorage.getItem(storageKey)));
    load();
    window.addEventListener('storage', load);
    window.addEventListener('urai:insights-updated', load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('urai:insights-updated', load);
    };
  }, [storageKey]);

  const filtered = useMemo(() => {
    return ledger.insights
      .filter((insight) => statusFilter === 'all' || insight.status === statusFilter)
      .sort((a, b) => {
        const severityDelta = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
        if (severityDelta !== 0) return severityDelta;
        return b.lastSeenAt - a.lastSeenAt;
      });
  }, [ledger.insights, statusFilter]);

  const counts = useMemo(() => {
    return ledger.insights.reduce<Record<string, number>>((acc, insight) => {
      acc[insight.status] = (acc[insight.status] ?? 0) + 1;
      acc[insight.severity] = (acc[insight.severity] ?? 0) + 1;
      return acc;
    }, {});
  }, [ledger.insights]);

  const persist = (next: InsightLedgerState) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, serializeInsightLedger(next));
    window.dispatchEvent(new Event('urai:insights-updated'));
    setLedger(next);
  };

  const setStatus = (insight: PersistentInsight, status: PersistentInsightStatus) => {
    persist(updateInsightStatus(ledger, insight.id, status));
  };

  return (
    <section className="insight-dashboard" aria-label="URAI persistent insight dashboard">
      <header className="insight-header">
        <div>
          <p className="eyebrow">Persistent Insight Engine</p>
          <h2>Life Map Insights</h2>
          <p className="summary">
            {ledger.insights.length ? `${ledger.insights.length} remembered pattern${ledger.insights.length === 1 ? '' : 's'}` : 'No persistent patterns yet.'}
            {ledger.updatedAt ? ` Updated ${formatTime(ledger.updatedAt)}.` : ''}
          </p>
        </div>
        <div className="metric-row" aria-label="Insight counts">
          <span>High {counts.high ?? 0}</span>
          <span>Active {counts.active ?? 0}</span>
          <span>Resolved {counts.resolved ?? 0}</span>
        </div>
      </header>

      <nav className="filter-row" aria-label="Insight status filters">
        <button type="button" className={statusFilter === 'all' ? 'active' : ''} onClick={() => setStatusFilter('all')}>All</button>
        {STATUS_ORDER.map((status) => (
          <button key={status} type="button" className={statusFilter === status ? 'active' : ''} onClick={() => setStatusFilter(status)}>
            {status} {counts[status] ?? 0}
          </button>
        ))}
      </nav>

      <div className="insight-list">
        {filtered.length === 0 ? (
          <article className="empty-card">
            <h3>No matching insights</h3>
            <p>As the Life Map activates and patterns repeat, persistent insights will appear here.</p>
          </article>
        ) : filtered.map((insight) => (
          <article key={insight.id} className={`insight-card severity-${insight.severity} status-${insight.status}`}>
            <div className="card-topline">
              <span>{insight.type.replaceAll('-', ' ')}</span>
              <strong>{insight.severity}</strong>
            </div>
            <h3>{insight.message}</h3>
            <p>{insight.narratorSummary}</p>
            <dl>
              <div><dt>Status</dt><dd>{insight.status}</dd></div>
              <div><dt>Recurrence</dt><dd>{insight.recurrenceCount}</dd></div>
              <div><dt>Strength</dt><dd>{insight.strength}</dd></div>
              <div><dt>Last seen</dt><dd>{formatTime(insight.lastSeenAt)}</dd></div>
            </dl>
            <details>
              <summary>Why am I seeing this?</summary>
              <ul>
                {insight.evidence.slice(-4).map((entry) => (
                  <li key={`${entry.at}-${entry.strength}`}>{formatTime(entry.at)} · strength {entry.strength} · {entry.starIds.length} star{entry.starIds.length === 1 ? '' : 's'}</li>
                ))}
              </ul>
            </details>
            <div className="actions">
              <button type="button" onClick={() => setStatus(insight, 'active')}>Keep active</button>
              <button type="button" onClick={() => setStatus(insight, 'resolved')}>Mark resolved</button>
              <button type="button" onClick={() => setStatus(insight, 'archived')}>Archive</button>
            </div>
          </article>
        ))}
      </div>

      <style jsx>{`
        .insight-dashboard{border:1px solid rgba(157,196,255,.28);border-radius:22px;background:linear-gradient(180deg,rgba(9,13,31,.92),rgba(5,7,18,.96));color:#eef3ff;padding:1rem;box-shadow:0 24px 80px rgba(0,0,0,.26)}
        .insight-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem}.eyebrow{margin:0 0 .25rem;color:#9fc5ff;text-transform:uppercase;letter-spacing:.12em;font-size:.72rem}.insight-header h2{margin:0;font-size:1.35rem}.summary{margin:.35rem 0 0;color:rgba(238,243,255,.75)}
        .metric-row{display:flex;gap:.5rem;flex-wrap:wrap}.metric-row span{border:1px solid rgba(180,215,255,.26);background:rgba(18,31,68,.58);border-radius:999px;padding:.4rem .6rem;font-size:.82rem}
        .filter-row{display:flex;gap:.45rem;flex-wrap:wrap;margin-bottom:1rem}.filter-row button,.actions button{border:1px solid rgba(180,215,255,.34);background:rgba(18,31,68,.72);color:#eef3ff;border-radius:999px;padding:.45rem .7rem}.filter-row button.active{border-color:#b9d7ff;box-shadow:0 0 16px rgba(125,211,252,.24)}
        .insight-list{display:grid;gap:.75rem}.empty-card,.insight-card{border:1px solid rgba(157,196,255,.24);border-radius:18px;background:rgba(8,12,28,.72);padding:.85rem}.insight-card.severity-high{box-shadow:inset 3px 0 0 rgba(255,195,125,.9)}.insight-card.severity-medium{box-shadow:inset 3px 0 0 rgba(185,215,255,.8)}.insight-card.severity-low{box-shadow:inset 3px 0 0 rgba(160,255,220,.55)}
        .card-topline{display:flex;justify-content:space-between;gap:.75rem;color:#9fc5ff;text-transform:capitalize;font-size:.78rem}.card-topline strong{text-transform:uppercase}.insight-card h3{margin:.35rem 0 .35rem;font-size:1.02rem}.insight-card p{margin:.25rem 0 .75rem;color:rgba(238,243,255,.78);line-height:1.45}
        dl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.45rem;margin:.75rem 0}dt{color:rgba(238,243,255,.56);font-size:.7rem}dd{margin:0;font-weight:700}details{margin:.6rem 0;color:rgba(238,243,255,.86)}summary{cursor:pointer;color:#b9d7ff}ul{padding-left:1.1rem}.actions{display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.75rem}
        @media (max-width:800px){.insight-header{display:block}dl{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `}</style>
    </section>
  );
}

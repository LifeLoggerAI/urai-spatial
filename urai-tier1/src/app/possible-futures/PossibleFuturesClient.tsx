'use client'

import { useMemo, useState } from 'react'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'
import { MAX_SCENARIO_BRANCHES } from '@/lib/scenario/scenarioTypes'

const DEFAULT_LABELS = ['Current path', 'Requested change', 'Alternative constraint'] as const

type ManualBranch = { id: string; label: string; summary: string }

function makeBranch(index: number, summary: string): ManualBranch {
  return { id: `manual-${index + 1}`, label: DEFAULT_LABELS[index] ?? `Branch ${index + 1}`, summary }
}

export default function PossibleFuturesClient() {
  const [question, setQuestion] = useState('')
  const [drafts, setDrafts] = useState(['', '', ''])
  const [branches, setBranches] = useState<ManualBranch[]>([])
  const [activeId, setActiveId] = useState('')

  const active = useMemo(() => branches.find((branch) => branch.id === activeId) ?? branches[0] ?? null, [activeId, branches])

  const enterManualScenario = () => {
    const next = drafts
      .map((summary, index) => makeBranch(index, summary.trim()))
      .filter((branch) => branch.summary)
      .slice(0, MAX_SCENARIO_BRANCHES)
    if (!question.trim() || !next.length) return
    setBranches(next)
    setActiveId(next[0].id)
  }

  const reset = () => {
    setBranches([])
    setActiveId('')
  }

  return (
    <main
      data-testid="urai-possible-futures"
      data-truth-mode="scenario"
      data-provider-state="unavailable-manual-only"
      data-branch-ordering="unranked"
      style={{ minHeight: '100svh', background: 'linear-gradient(180deg,#090d10 0%,#12191a 52%,#0b1012 100%)', color: '#eef4f2', padding: 'clamp(20px,4vw,56px)' }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 24 }}>
        <header>
          <p style={{ letterSpacing: '.16em', fontSize: 12, fontWeight: 800, margin: 0 }}>POSSIBLE FUTURE · NOT A MEMORY</p>
          <h1 style={{ fontSize: 'clamp(32px,7vw,72px)', lineHeight: 1, margin: '12px 0' }}>Possible Futures</h1>
          <p style={{ maxWidth: 760, opacity: .82, fontSize: 'clamp(16px,2vw,20px)' }}>
            Explore assumptions without turning them into memory, prediction, or fact. The governed generation provider is unavailable here, so this surface fails closed to Manual Scenario.
          </p>
        </header>

        {!branches.length ? (
          <section aria-labelledby="possible-futures-manual-title" style={{ display: 'grid', gap: 16, padding: 'clamp(18px,3vw,30px)', border: '1px solid rgba(238,244,242,.18)', borderRadius: 24, background: 'rgba(255,255,255,.035)' }}>
            <div>
              <h2 id="possible-futures-manual-title" style={{ margin: 0 }}>Manual Scenario</h2>
              <p style={{ opacity: .72 }}>Provider unavailable. Nothing below is AI-generated or ranked.</p>
            </div>
            <label>
              <span>What do you want to explore?</span>
              <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What if I change…" style={{ width: '100%', minHeight: 92, marginTop: 8, padding: 14, borderRadius: 14, background: '#111719', color: 'inherit', border: '1px solid rgba(238,244,242,.2)', font: 'inherit' }} />
            </label>
            {DEFAULT_LABELS.map((label, index) => (
              <label key={label}>
                <span>{label}</span>
                <textarea value={drafts[index]} onChange={(event) => setDrafts((current) => current.map((value, i) => i === index ? event.target.value : value))} placeholder="Your assumption or possible branch" style={{ width: '100%', minHeight: 72, marginTop: 8, padding: 14, borderRadius: 14, background: '#111719', color: 'inherit', border: '1px solid rgba(238,244,242,.2)', font: 'inherit' }} />
              </label>
            ))}
            <button type="button" onClick={enterManualScenario} disabled={!question.trim() || !drafts.some((value) => value.trim())} style={{ minHeight: 48, width: 'fit-content', padding: '0 20px', borderRadius: 999 }}>
              Enter Manual Scenario
            </button>
          </section>
        ) : (
          <section aria-labelledby="possible-futures-world-title" style={{ display: 'grid', gap: 18 }}>
            <div style={{ minHeight: 360, position: 'relative', borderRadius: 28, overflow: 'hidden', border: '1px solid rgba(238,244,242,.16)', background: 'radial-gradient(circle at 50% 42%,rgba(133,160,151,.16),transparent 28%),linear-gradient(160deg,#151d1d,#080c0f)' }}>
              <div aria-hidden="true" style={{ position: 'absolute', inset: '12% 8%', borderRadius: '48% 52% 38% 62%', border: '1px solid rgba(214,231,224,.2)', transform: 'perspective(800px) rotateX(62deg) rotateZ(-7deg)' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 32, textAlign: 'center' }}>
                <div>
                  <p style={{ letterSpacing: '.14em', fontSize: 11, fontWeight: 800 }}>SCENARIO · UNRANKED</p>
                  <h2 id="possible-futures-world-title" style={{ fontSize: 'clamp(28px,5vw,52px)', margin: '8px 0' }}>{active?.label}</h2>
                  <p style={{ maxWidth: 640, margin: '0 auto', fontSize: 'clamp(17px,2vw,22px)', lineHeight: 1.5 }}>{active?.summary}</p>
                </div>
              </div>
            </div>
            <div role="group" aria-label="Unranked scenario branches" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {branches.map((branch) => (
                <button key={branch.id} type="button" aria-pressed={active?.id === branch.id} onClick={() => setActiveId(branch.id)} style={{ minHeight: 48, padding: '0 18px', borderRadius: 999 }}>
                  {branch.label}
                </button>
              ))}
            </div>
            <aside aria-label="Scenario truth boundary" style={{ padding: 18, borderLeft: '3px solid rgba(238,244,242,.5)', background: 'rgba(255,255,255,.035)' }}>
              <strong>Assumptions only.</strong> These branches are user-authored possibilities. They are not memories, observations, recommendations, predictions, or externally executed actions.
            </aside>
            <button type="button" onClick={reset} style={{ minHeight: 48, width: 'fit-content', padding: '0 18px', borderRadius: 999 }}>Edit assumptions</button>
          </section>
        )}

        <footer style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={requestUraiWorldReturn} style={{ minHeight: 48, padding: '0 20px', borderRadius: 999 }}>Return to origin</button>
          <span aria-live="polite" style={{ alignSelf: 'center', opacity: .68 }}>Maximum {MAX_SCENARIO_BRANCHES} branches · unranked · provider unavailable</span>
        </footer>
      </div>
      <p className="sr-only">This is a hypothetical Scenario World. It is not Replay and not autobiographical memory.</p>
    </main>
  )
}

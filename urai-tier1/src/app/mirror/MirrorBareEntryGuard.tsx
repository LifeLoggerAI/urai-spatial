'use client'

import { useEffect, useState } from 'react'
import MirrorSpatialClient from './MirrorSpatialClient'

const EXPLICIT_DEMO_HREF = '/mirror?memoryId=demo%3Amirror-preview&node=mirror-preview&demo=1'
const ACCEPTANCE_FIXTURES_ENABLED = process.env.NEXT_PUBLIC_URAI_ACCEPTANCE_FIXTURES === '1'

type EntryState = 'checking' | 'bare' | 'contextual'

export default function MirrorBareEntryGuard() {
  const [entryState, setEntryState] = useState<EntryState>('checking')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hasMemoryContext = Boolean(params.get('memoryId') ?? params.get('node'))
    const isEvidenceFixture = ACCEPTANCE_FIXTURES_ENABLED && Boolean(params.get('mirrorFixture'))
    setEntryState(hasMemoryContext || isEvidenceFixture ? 'contextual' : 'bare')
  }, [])

  if (entryState === 'checking') {
    return <main className="mirrorEntryCheck" aria-busy="true" aria-label="Checking Mirror entry context" />
  }

  if (entryState === 'contextual') return <MirrorSpatialClient />

  return (
    <main className="mirrorBareEntry" data-testid="mirror-bare-entry" data-demo-disclosure="required">
      <section aria-labelledby="mirror-bare-title">
        <p>Mirror · private reflection chamber</p>
        <h1 id="mirror-bare-title">Choose what Mirror may open.</h1>
        <span>
          Open a clearly disclosed demonstration, review your data permissions, or return home. Mirror will not invent or silently substitute a private memory.
        </span>
        <nav aria-label="Mirror entry choices">
          <a href={EXPLICIT_DEMO_HREF}>Open disclosed demo</a>
          <a href="/passport">Open Passport</a>
          <a href="/">Return home</a>
        </nav>
      </section>
      <style>{bareEntryCss}</style>
    </main>
  )
}

const bareEntryCss = `.mirrorEntryCheck{position:fixed;inset:0;background:#010306}.mirrorBareEntry{position:fixed;inset:0;z-index:80;display:grid;place-items:center;box-sizing:border-box;padding:24px;background:radial-gradient(circle at 50% 24%,#173543,#030910 58%,#010306);color:#fff}.mirrorBareEntry section{width:min(720px,100%);text-align:center}.mirrorBareEntry p{margin:0;color:#9ceef4;font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.mirrorBareEntry h1{margin:14px 0;font:500 clamp(2.4rem,7vw,5.6rem)/.92 Georgia,serif}.mirrorBareEntry span{display:block;max-width:620px;margin:0 auto;color:#c4d3dc;line-height:1.65}.mirrorBareEntry nav{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:26px}.mirrorBareEntry a{display:grid;place-items:center;min-width:170px;min-height:50px;padding:0 18px;border:1px solid #c8f7fb;border-radius:999px;background:#081924;color:#fff;font-weight:900;text-decoration:none}.mirrorBareEntry a:first-child{background:#dffcff;color:#031018}.mirrorBareEntry a:focus-visible{outline:3px solid #fff;outline-offset:4px}@media(max-width:620px){.mirrorBareEntry nav{display:grid}.mirrorBareEntry a{width:min(320px,calc(100vw - 48px));box-sizing:border-box}}`

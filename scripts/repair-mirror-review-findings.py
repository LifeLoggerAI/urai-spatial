from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise AssertionError(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


guard = Path('urai-tier1/src/app/mirror/MirrorBareEntryGuard.tsx')
guard_text = guard.read_text()
guard_anchor = "const EXPLICIT_DEMO_HREF = '/mirror?memoryId=demo%3Amirror-preview&node=mirror-preview&demo=1'\n"
guard_flag = "const ACCEPTANCE_FIXTURES_ENABLED = process.env.NEXT_PUBLIC_URAI_ACCEPTANCE_FIXTURES === '1'\n"
if 'ACCEPTANCE_FIXTURES_ENABLED' in guard_text:
    raise AssertionError('guard fixture flag already exists')
guard_text = replace_once(guard_text, guard_anchor, guard_anchor + guard_flag, 'guard flag')
guard_text = replace_once(
    guard_text,
    "const isEvidenceFixture = Boolean(params.get('mirrorFixture'))",
    "const isEvidenceFixture = ACCEPTANCE_FIXTURES_ENABLED && Boolean(params.get('mirrorFixture'))",
    'guard fixture gate',
)
guard.write_text(guard_text)

client = Path('urai-tier1/src/app/mirror/MirrorSpatialClient.tsx')
client_text = client.read_text()
if 'NEXT_PUBLIC_URAI_ACCEPTANCE_FIXTURES' in client_text:
    raise AssertionError('client fixture flag already exists')
client_text = replace_once(
    client_text,
    'const CAMERA_HEIGHT = 1.68\n',
    "const CAMERA_HEIGHT = 1.68\nconst ACCEPTANCE_FIXTURES_ENABLED = process.env.NEXT_PUBLIC_URAI_ACCEPTANCE_FIXTURES === '1'\n",
    'client fixture flag',
)
client_text = replace_once(
    client_text,
    "useEffect(() => {\n  setFixture(new URLSearchParams(window.location.search).get('mirrorFixture'))\n}, [])",
    "useEffect(() => {\n  const requestedFixture = new URLSearchParams(window.location.search).get('mirrorFixture')\n  setFixture(ACCEPTANCE_FIXTURES_ENABLED ? requestedFixture : null)\n}, [])",
    'client fixture parsing',
)

fallback_start = client_text.index('  if (!webglAvailable) return <main className="mirrorFallback"')
fallback_end_marker = '<style>{fallbackCss}</style></main>'
fallback_end = client_text.index(fallback_end_marker, fallback_start) + len(fallback_end_marker)
fallback_replacement = '''  if (!webglAvailable) return <main className="mirrorFallback" data-testid="mirror-webgl-fallback"><section>
    <p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} reflection`}</p>
    <h1>{memory.title}</h1>
    <p>Spatial rendering is unavailable. The source-backed reflection remains available through semantic controls.</p>
    <div className="fallbackPatterns">{patterns.map((pattern) => <button key={pattern.id} type="button" aria-pressed={selected?.id === pattern.id} onClick={() => selectPattern(pattern)}>{pattern.label} · {pattern.confidenceLabel}</button>)}</div>
    {selected ? <article className="fallbackInspection" aria-label={`${selected.label} evidence`}>
      <button type="button" onClick={() => selectPattern(null)}>Close {selected.label}</button>
      <p>{selected.evidenceState.replace('-', ' ')}</p>
      <h2>{selected.label}</h2>
      <strong>{selected.explanation}</strong>
      <dl><div><dt>Confidence</dt><dd>{selected.confidence === null ? 'Not calculated' : `${Math.round(selected.confidence * 100)}% · ${selected.confidenceLabel}`}</dd></div><div><dt>Evidence</dt><dd>{selected.evidenceCount} permitted source{selected.evidenceCount === 1 ? '' : 's'}</dd></div><div><dt>Uncertainty</dt><dd>{selected.uncertainty}</dd></div><div><dt>Provenance</dt><dd>{selected.provenance}</dd></div></dl>
      {selected.fragments.length ? <ul>{selected.fragments.map((fragment) => <li key={fragment.id}><strong>{fragment.label}</strong><span>{fragment.certainty}</span></li>)}</ul> : <p>No source fragments are available for this pattern.</p>}
    </article> : null}
    <nav aria-label="Mirror fallback transitions"><button type="button" onClick={goReplay}>Return to Replay</button><button type="button" onClick={goPassport}>Open Passport</button></nav>
  </section><style>{fallbackCss}</style></main>'''
client_text = client_text[:fallback_start] + fallback_replacement + client_text[fallback_end:]
client_text = replace_once(
    client_text,
    '<aside className="mirrorInspection" aria-live="polite" aria-label={`${selected.label} evidence`}>',
    '<aside className="mirrorInspection" data-movement-ui="true" aria-live="polite" aria-label={`${selected.label} evidence`}>',
    'mobile inspector input ownership',
)
client_text = replace_once(
    client_text,
    '.mirrorInspection{position:absolute;',
    '.mirrorInspection{touch-action:pan-y;overscroll-behavior:contain;position:absolute;',
    'mobile inspector touch action',
)
fallback_css_end = client_text.index('`\nconst worldCss', client_text.index('const fallbackCss = `'))
fallback_extra = '.fallbackPatterns{display:grid;gap:8px;margin:20px 0}.fallbackInspection{margin:18px 0;padding:18px;border:1px solid #bdeff333;border-radius:18px;background:#071722}.fallbackInspection h2{font:500 2rem/1 Georgia,serif}.fallbackInspection dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.fallbackInspection dl div,.fallbackInspection li{padding:10px;border:1px solid #bdeff322;border-radius:12px}.fallbackInspection dt{font-size:10px;text-transform:uppercase;letter-spacing:.12em}.fallbackInspection dd{margin:4px 0 0}.fallbackInspection ul{display:grid;gap:8px;padding:0;list-style:none}.fallbackInspection li strong,.fallbackInspection li span{display:block}.fallbackInspection nav{display:flex;flex-wrap:wrap;gap:8px}@media(max-width:620px){.fallbackInspection dl{grid-template-columns:1fr}}'
client_text = client_text[:fallback_css_end] + fallback_extra + client_text[fallback_css_end:]
client.write_text(client_text)

proof_workflow = Path('.github/workflows/mirror-release-proof.yml')
workflow_text = proof_workflow.read_text()
if 'NEXT_PUBLIC_URAI_ACCEPTANCE_FIXTURES' in workflow_text:
    raise AssertionError('proof workflow fixture flag already exists')
workflow_text = replace_once(
    workflow_text,
    "  PLAYWRIGHT_BROWSERS_PATH: '0'\n",
    "  PLAYWRIGHT_BROWSERS_PATH: '0'\n  NEXT_PUBLIC_URAI_ACCEPTANCE_FIXTURES: '1'\n",
    'proof workflow fixture env',
)
proof_workflow.write_text(workflow_text)

contract = Path('urai-tier1/tests/mirror-spatial-realm-contract.test.mjs')
contract_text = contract.read_text()
if 'proofWorkflowSource' in contract_text:
    raise AssertionError('proof workflow contract already exists')
contract_text = replace_once(
    contract_text,
    "const navigationSource = fs.readFileSync(new URL('../src/spatial/navigation/EmbodiedNavigation.tsx', import.meta.url), 'utf8')\n",
    "const navigationSource = fs.readFileSync(new URL('../src/spatial/navigation/EmbodiedNavigation.tsx', import.meta.url), 'utf8')\nconst proofWorkflowSource = fs.readFileSync(new URL('../../.github/workflows/mirror-release-proof.yml', import.meta.url), 'utf8')\n",
    'proof workflow contract source',
)
contract_text += '''

test('Mirror acceptance fixtures, mobile scrolling, and semantic fallback fail closed', () => {
  assert.match(clientSource, /NEXT_PUBLIC_URAI_ACCEPTANCE_FIXTURES/)
  assert.match(bareEntrySource, /ACCEPTANCE_FIXTURES_ENABLED && Boolean\(params\.get\('mirrorFixture'\)\)/)
  assert.match(proofWorkflowSource, /NEXT_PUBLIC_URAI_ACCEPTANCE_FIXTURES: '1'/)
  assert.match(clientSource, /data-movement-ui="true"/)
  assert.match(clientSource, /touch-action:pan-y/)
  assert.match(clientSource, /className="fallbackInspection"/)
  assert.match(clientSource, /selected\.uncertainty/)
  assert.match(clientSource, /selected\.provenance/)
})
'''
contract.write_text(contract_text)

proof = Path('tests/mirror-release-proof.mjs')
proof_text = proof.read_text()
if 'async function proveSemanticFallback' in proof_text:
    raise AssertionError('semantic fallback proof already exists')
fallback_function = '''async function proveSemanticFallback(browser) {
  const name = 'no-webgl-semantic-fallback'
  const { context, page, consoleErrors, failedRequests } = await createPage(browser, 'desktop', { disableWebGL: true })
  try {
    const response = await page.goto(absolute(`/mirror?${demoQuery}`), { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for semantic fallback`)
    const fallback = page.getByTestId('mirror-webgl-fallback')
    await fallback.waitFor({ state: 'visible', timeout: 45000 })
    await fallback.getByRole('button', { name: /^Body rhythm/ }).click()
    const inspector = fallback.locator('article[aria-label="Body rhythm evidence"]')
    await inspector.waitFor({ state: 'visible' })
    await inspector.getByText('Uncertainty', { exact: true }).waitFor({ state: 'visible' })
    await inspector.getByText(/owner-authorized|demonstration data/).waitFor({ state: 'visible' })
    const shot = await screenshot(page, 'desktop-no-webgl-semantic-fallback')
    await assertCleanEvidence(consoleErrors, failedRequests)
    pushCase(name, 'desktop', 'passed', { screenshot: shot, finalUrl: page.url(), consoleErrors, failedRequests })
  } catch (error) {
    const shot = await screenshot(page, 'desktop-no-webgl-semantic-fallback-failure').catch(() => '')
    pushCase(name, 'desktop', 'failed', { screenshot: shot, error: String(error?.message || error), finalUrl: page.url(), consoleErrors, failedRequests })
  } finally {
    await context.close()
  }
}

'''
proof_text = replace_once(proof_text, 'await fs.mkdir(shotDir, { recursive: true })\n', fallback_function + 'await fs.mkdir(shotDir, { recursive: true })\n', 'semantic fallback proof function')
proof_text = replace_once(
    proof_text,
    "  await proveState(browser, { name: 'no-webgl-semantic-fallback', route: `/mirror?${demoQuery}`, disableWebGL: true, marker: '[data-testid=\"mirror-webgl-fallback\"]', text: 'Spatial rendering is unavailable.' })",
    '  await proveSemanticFallback(browser)',
    'semantic fallback proof call',
)
mobile_anchor = "    const inspector = page.locator('aside[aria-label=\"Body rhythm evidence\"]')\n    await inspector.waitFor({ state: 'visible' })\n"
mobile_check = '''    if (deviceName === 'mobile') {
      const geometry = await inspector.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }))
      if (geometry.scrollHeight <= geometry.clientHeight) throw new Error(`mobile inspector is not scrollable: ${geometry.clientHeight}/${geometry.scrollHeight}`)
      await inspector.evaluate((element) => { element.scrollTop = element.scrollHeight })
      await page.waitForTimeout(100)
      const scrollTop = await inspector.evaluate((element) => element.scrollTop)
      if (scrollTop <= 0) throw new Error('mobile inspector touch-scroll surface did not move')
    }
'''
proof_text = replace_once(proof_text, mobile_anchor, mobile_anchor + mobile_check, 'mobile inspector browser proof')
proof.write_text(proof_text)

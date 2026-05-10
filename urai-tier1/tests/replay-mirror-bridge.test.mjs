import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const replayPanelSource = readFileSync(new URL('../src/spatial/replay/ReplayMetaPanel.tsx', import.meta.url), 'utf8')

test('ReplayMetaPanel exposes Mirror bridge only when a manifest id is provided', () => {
  assert.match(replayPanelSource, /manifestId\?: string \| null/)
  assert.match(replayPanelSource, /router\.push\(`\/mirror\?manifestId=\$\{encodeURIComponent\(manifestId\)\}&source=replay`\)/)
  assert.match(replayPanelSource, /manifestId \? <button type="button" data-testid="urai-replay-open-mirror"/)
})

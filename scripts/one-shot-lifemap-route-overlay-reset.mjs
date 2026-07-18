import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const write = (path, value) => fs.writeFileSync(path, value)

const cssPath = 'urai-tier1/src/app/continuous-spatial-proof-defects.css'
const css = read(cssPath)
const reset = `

/* Life Map owns its atmosphere. Retired global body effects created a visible
   horizontal compositing band over the canonical authored and WebGL layers. */
html.urai-route-life-map body::before,
html.urai-route-life-map body::after {
  content: none !important;
  display: none !important;
  background: none !important;
  filter: none !important;
  opacity: 0 !important;
  mix-blend-mode: normal !important;
}
`
if (css.includes('Retired global body effects created a visible')) {
  throw new Error('Life Map route overlay reset already exists')
}
write(cssPath, `${css.trimEnd()}${reset}`)

const contractPath = 'urai-tier1/tests/lifemap-visual-material-contract.test.mjs'
const contract = read(contractPath)
if (contract.includes('Life Map suppresses retired global body atmosphere overlays')) {
  throw new Error('Life Map body-overlay contract already exists')
}
write(contractPath, `${contract.trimEnd()}\n\ntest('Life Map suppresses retired global body atmosphere overlays', () => {\n  assert.match(proofCss, /html\\.urai-route-life-map body::before,\\s*html\\.urai-route-life-map body::after/)\n  assert.match(proofCss, /content:\\s*none !important/)\n  assert.match(proofCss, /display:\\s*none !important/)\n  assert.match(proofCss, /background:\\s*none !important/)\n  assert.match(proofCss, /mix-blend-mode:\\s*normal !important/)\n})\n`)

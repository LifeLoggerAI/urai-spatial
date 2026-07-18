import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const write = (path, value) => fs.writeFileSync(path, value)

const cssPath = 'urai-tier1/src/app/continuous-spatial-proof-defects.css'
const css = read(cssPath)
const cleanup = `

/* Canonical Life Map owns one authored image layer and one WebGL layer.
   Retired finishing-wall pseudo images, wash, and vignette produced a hard
   cross-viewport boundary when composited together. */
html.urai-route-life-map [data-testid="urai-r3f-canonical-lifemap"] {
  background: transparent !important;
}

html.urai-route-life-map [data-testid="urai-r3f-canonical-lifemap"]::before,
html.urai-route-life-map [data-testid="urai-r3f-canonical-lifemap"]::after {
  content: none !important;
  display: none !important;
  background: none !important;
  filter: none !important;
  opacity: 0 !important;
  mix-blend-mode: normal !important;
}

html.urai-route-life-map .life-map-cosmic-wash,
html.urai-route-life-map .life-map-depth-vignette {
  display: none !important;
  background: none !important;
  opacity: 0 !important;
}
`
if (css.includes('Canonical Life Map owns one authored image layer')) {
  throw new Error('Canonical overlay cleanup already exists')
}
write(cssPath, `${css.trimEnd()}${cleanup}`)

const contractPath = 'urai-tier1/tests/lifemap-visual-material-contract.test.mjs'
const contract = read(contractPath)
if (contract.includes('Life Map removes the retired multi-overlay finishing stack')) {
  throw new Error('Canonical overlay cleanup contract already exists')
}
write(contractPath, `${contract.trimEnd()}\n\ntest('Life Map removes the retired multi-overlay finishing stack', () => {\n  assert.match(proofCss, /html\\.urai-route-life-map \\[data-testid=\"urai-r3f-canonical-lifemap\"\\] \\{[\\s\\S]*background:\\s*transparent !important/)\n  assert.match(proofCss, /\\[data-testid=\"urai-r3f-canonical-lifemap\"\\]::before,[\\s\\S]*\\[data-testid=\"urai-r3f-canonical-lifemap\"\\]::after/)\n  assert.match(proofCss, /html\\.urai-route-life-map \\.life-map-cosmic-wash,[\\s\\S]*html\\.urai-route-life-map \\.life-map-depth-vignette/)\n  assert.match(proofCss, /display:\\s*none !important/)\n  assert.match(proofCss, /background:\\s*none !important/)\n})\n`)

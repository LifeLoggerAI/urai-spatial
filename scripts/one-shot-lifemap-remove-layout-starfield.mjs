import fs from 'node:fs'

const layoutPath = 'urai-tier1/src/app/life-map/layout.tsx'
const layout = fs.readFileSync(layoutPath, 'utf8')
const before = `export default function LifeMapLayout({ children }: { children: React.ReactNode }) {
  return <div className="lifemap-starfield-shell">{children}</div>
}
`
const after = `export default function LifeMapLayout({ children }: { children: React.ReactNode }) {
  return children
}
`
if (!layout.includes(before)) throw new Error('Expected Life Map starfield wrapper not found')
if (layout.indexOf(before) !== layout.lastIndexOf(before)) throw new Error('Life Map starfield wrapper duplicated')
fs.writeFileSync(layoutPath, layout.replace(before, after))

const contractPath = 'urai-tier1/tests/lifemap-visual-material-contract.test.mjs'
let contract = fs.readFileSync(contractPath, 'utf8')
const anchor = `const proofCss = fs.readFileSync('src/app/continuous-spatial-proof-defects.css', 'utf8')\n`
if (!contract.includes(anchor)) throw new Error('Contract read anchor missing')
contract = contract.replace(anchor, `${anchor}const routeLayout = fs.readFileSync('src/app/life-map/layout.tsx', 'utf8')\n`)
if (contract.includes('Life Map route layout cannot mount a second starfield owner')) throw new Error('Route layout contract already exists')
contract = `${contract.trimEnd()}\n\ntest('Life Map route layout cannot mount a second starfield owner', () => {\n  assert.doesNotMatch(routeLayout, /lifemap-starfield-shell/, 'The route layout must not add a legacy starfield outside the canonical realm')\n  assert.match(routeLayout, /return children/, 'The Life Map layout must pass the canonical owner through directly')\n})\n`
fs.writeFileSync(contractPath, contract)

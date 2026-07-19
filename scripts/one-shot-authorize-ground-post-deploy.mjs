import fs from 'node:fs'

const paths = [
  '.github/workflows/lifemap-fullscreen-selected-actions.yml',
  '.github/workflows/lifemap-route-dom-source-diagnostic.yml',
]

for (const path of paths) {
  const source = fs.readFileSync(path, 'utf8')
  const marker = '            urai-tier1/tests/lifemap-deep-link-controls-contract.test.mjs | sort)'
  const replacement = '            urai-tier1/tests/lifemap-deep-link-controls-contract.test.mjs \\\n            urai-tier1/tests/post-deploy-ground-smoke-contract.test.mjs | sort)'
  const count = source.split(marker).length - 1
  if (count !== 1) throw new Error(`Expected one bounded allowlist marker in ${path}, found ${count}`)
  fs.writeFileSync(path, source.replace(marker, replacement))
  console.log(`Authorized post-deploy Ground smoke contract in ${path}`)
}

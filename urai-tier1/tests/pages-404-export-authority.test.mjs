import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// A production build is still required: this only distinguishes an invalid
// page source from a webpack/Next page-manifest or artifact problem.
const pages404 = readFileSync(new URL('../src/pages/404.tsx', import.meta.url), 'utf8')
const appNotFound = readFileSync(new URL('../src/app/not-found.tsx', import.meta.url), 'utf8')
const surface = readFileSync(new URL('../src/components/public/MissingRouteSurface.tsx', import.meta.url), 'utf8')

test('Pages Router 404 has an actual default React component export', () => {
  assert.match(pages404, /export default function PagesRouterNotFoundShim\(\)/)
  assert.match(pages404, /return <>[\s\S]*<MissingRouteSurface companion=\{false\} \/>[\s\S]*<\/>/)
  assert.match(pages404, /import MissingRouteSurface from ['"]@\/components\/public\/MissingRouteSurface['"]/)
})

test('App Router not-found also resolves to a default component', () => {
  assert.match(appNotFound, /export \{ default \} from ['"]@\/components\/public\/MissingRouteSurface['"]/)
  assert.match(surface, /export default function MissingRouteSurface\(/)
  assert.match(surface, /return \(/)
})

test('404 source does not export a data object instead of a component', () => {
  assert.doesNotMatch(pages404, /export default \{|export default \[|export const getServerSideProps|export const getStaticProps/)
})

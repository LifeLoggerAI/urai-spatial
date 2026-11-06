import assert from 'node:assert/strict'
import test from 'node:test'
import { ownerSessionMatches } from '../src/lib/privacy/ownerSessionFence.ts'

const source = {
  initiatingUid: 'owner-a', currentUid: 'owner-a',
  initiatingEpoch: 4, currentEpoch: 4, online: true,
}
test('owner-session fence allows only the same authenticated online owner and epoch', () => {
  assert.equal(ownerSessionMatches(source), true)
})
test('owner-session fence denies cross-owner, signout, disconnection and stale callbacks', () => {
  const cases = [
    { currentUid: 'owner-b' }, { currentUid: '' }, { currentUid: null },
    { currentUid: undefined }, { initiatingUid: null }, { initiatingUid: '' },
    { initiatingUid: 'owner-b' }, { online: false }, { online: undefined },
    { initiatingEpoch: 3 }, { currentEpoch: 5 },
    { initiatingEpoch: -1 }, { currentEpoch: -1 },
    { initiatingEpoch: NaN }, { currentEpoch: Infinity },
    { initiatingEpoch: 2.3 }, { currentEpoch: Number.MAX_SAFE_INTEGER + 1 },
  ]
  for(const change of cases) {
    assert.equal(ownerSessionMatches({ ...source, ...change }), false, JSON.stringify(change))
  }
})
test('an epoch change prevents account A re-login callbacks from reviving account A data', () => {
  assert.equal(ownerSessionMatches({ ...source, currentEpoch: 5 }), false)
  assert.equal(ownerSessionMatches({ ...source, initiatingEpoch: 5, currentEpoch: 5 }), true)
})

test('R655: Passport and Consent both deny stale-owner actions and clear private state on offline', async () => {
  const { readFileSync } = await import('node:fs')
  const root = new URL('../src/app/', import.meta.url)
  const passport = readFileSync(new URL('passport/PassportVaultClient.tsx', root), 'utf8')
  const consent = readFileSync(new URL('privacy-controls/ConsentSanctuaryClient.tsx', root), 'utf8')
  for (const source of [passport, consent]) {
    assert.match(source, /import \{ ownerSessionMatches \} from '@\/lib\/privacy\/ownerSessionFence'/)
    assert.match(source, /currentUid: getAuth\(app\)\.currentUser\?\.uid/)
    assert.match(source, /initiatingEpoch: epoch, currentEpoch: authEpoch\.current, online: navigator\.onLine/)
    assert.match(source, /const \[connectionEpoch, setConnectionEpoch\] = useState\(0\)/)
    assert.match(source, /setConnectionEpoch\(value => value \+ 1\)/)
    assert.match(source, /ownerSessionCurrent\(user\.uid, epoch\)/)
    assert.match(source, /ownerSessionCurrent\(user\?\.uid, authEpoch\.current\)/)
    assert.match(source, /\[user, explicitDemo, connectionEpoch\]/)
    assert.match(source, /authEpoch\.current \+= 1[\s\S]*?setExportDownloading\(false\)/)
  }
  assert.match(passport, /setSnapshot\(\{\}\); setExports\(\[\]\); setDeletions\(\[\]\); setReceipts\(\[\]\)/)
  assert.match(consent, /setPolicy\(unresolvedPolicy\(\)\); setReceipts\(\[\]\); setExports\(\[\]\); setDeletions\(\[\]\)/)
})

test('R655: cancel and download handlers check the live owner, not only a captured epoch', async () => {
  const { readFileSync } = await import('node:fs')
  const root = new URL('../src/app/', import.meta.url)
  const passport = readFileSync(new URL('passport/PassportVaultClient.tsx', root), 'utf8')
  const consent = readFileSync(new URL('privacy-controls/ConsentSanctuaryClient.tsx', root), 'utf8')
  for (const source of [passport, consent]) {
    assert.match(source, /onClick=\{\(\) => \{ if \([^\n]*ownerSessionCurrent\(user\?\.uid, authEpoch\.current\)\) void cancelOperationalExportRequest\(job\.id\)/)
    assert.match(source, /onClick=\{\(\) => \{ if \([^\n]*ownerSessionCurrent\(user\?\.uid, authEpoch\.current\)\) void cancelOperationalDeletionRequest\(job\.id\)/)
    assert.match(source, /session\.download\(request, \(\) => ownerSessionCurrent\(user\.uid, epoch\), downloadOperationalExportBytes\)/)
  }
})

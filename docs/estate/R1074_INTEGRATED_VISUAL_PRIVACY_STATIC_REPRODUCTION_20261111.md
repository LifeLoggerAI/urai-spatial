# R1074 — executable isolated merge-preview reproduction (REVIEW ONLY)

**Observed:** 2026-11-11 (America/Chicago)  
**Production:** HOLD — no production release authority and full Tier1 unit suite remains RED.  
**Build preview URL (ephemeral):** https://9ay29us4qixqp1-3000.proxy.runpod.net/  
**Source:** R885 controller `df19b28c9a75b5201d06ee859de89b3b3bebc967`, R990 privacy donor `3ad52b2d3802c45e193befcbcdc129fdd7df4675`.  
**Runpod isolated local merge:** `066cc266a14e038de3ce70dca58238a229953aac` — **not pushed to GitHub**. Its Git tree differs from a fresh rerun because of unpinned commit timestamps; parent content and deterministic patch checks are pinned.

## What was actually verified
- Correct two-parent Git merge and **nine exact conflicts**, explicitly resolved and verified; original peer branches unchanged.
- Controller Focus camera, localization, Council, and accessibility source preserved rather than replaced with donor Focus.
- No direct private-memory upload UI and no forward of legacy private movie URL route authority; Focus image appearance limited to disclosed demo. Replay admits no non-demo legacy source.
- Install and Tier1 TypeScript PASS.
- Focused source media / missing bucket / Replay session tests **PASS** (46 tests).
- Next static build PASS, `out/index.html` present.
- Live public HTML checks PASS: Home, Status, Life Map, Focus, Replay and Ground. Not equivalent to authenticated E2E, physical GPU/device, independent visual acceptance, or real GCS enforcement.
- Full Tier1 unit suite **NOT GREEN**: `launch-ungating-runtime-contract.test.mjs` assumes XR is publicly launched and promoted live provider paths; current controller intentionally keeps XR conditional under release HOLD. The discrepancy remains for independent reconciliation.

## Exact disposable worker command
This is the observed Runpod container startup procedure. **Do not invoke against a developer workstation or production service.** It removes `/workspace/src`, installs packages, clones the pinned branches, makes a disposable merge, and serves a public static export without credentials. Run in a disposable isolated environment only. This is a reproduction recipe, **not** a deploy approval and **not** a reviewed production CI workflow.

```bash
set -Eeuo pipefail
umask 077
export CI=1 NEXT_TELEMETRY_DISABLED=1 URAI_FIREBASE_STATIC_EXPORT=true
echo "R1074_START"
apt-get update -qq >/tmp/a.log 2>&1
apt-get install -y -qq git ca-certificates python3 curl >>/tmp/a.log 2>&1
rm -rf /workspace/src
git clone -q --filter=blob:none --single-branch --branch review/chalk-r885-wif-release-safety-20261107 https://github.com/LifeLoggerAI/urai-spatial.git /workspace/src
cd /workspace/src
test "$(git rev-parse HEAD)" = "df19b28c9a75b5201d06ee859de89b3b3bebc967" || { echo "BASE_MOVED"; exit 41; }
git fetch -q origin review/chalk-r988-private-media-no-legacy-url-20261109
test "$(git rev-parse FETCH_HEAD)" = "3ad52b2d3802c45e193befcbcdc129fdd7df4675" || { echo "DONOR_MOVED"; exit 42; }
git show FETCH_HEAD:package.json > /tmp/donor-package.json
echo "EXACT_PARENTS_PASS"
git config user.name "Chalk R1074 preview preflight"
git config user.email "chalk-r1074@example.invalid"
set +e
git merge --no-ff --no-commit FETCH_HEAD >/tmp/merge.log 2>&1
code=$?
set -e
test "$code" = 1 || { echo "MERGE_EXIT_$code"; exit 43; }
git diff --name-only --diff-filter=U | LC_ALL=C sort > /tmp/actual
printf '%s\n' '.github/workflows/passive-firestore-transaction-proof.yml' '.github/workflows/passive-location-consent-proof.yml' 'apps/functions/test/passive-signals-location-consent.test.js' 'package.json' 'urai-tier1/src/app/focus/FocusChamberClient.tsx' 'urai-tier1/src/app/replay/replayVisualAdmission.ts' 'urai-tier1/src/spatial/memory/useSelectedMemory.ts' 'urai-tier1/tests/selected-memory-live-lifecycle.test.mjs' 'urai-tier1/tests/unit-runner-coverage.test.mjs' | LC_ALL=C sort > /tmp/expected
diff -u /tmp/expected /tmp/actual || { echo "CONFLICT_DRIFT"; exit 44; }
echo "NINE_CONFLICTS_VERIFIED"
git checkout --ours .github/workflows/passive-firestore-transaction-proof.yml .github/workflows/passive-location-consent-proof.yml apps/functions/test/passive-signals-location-consent.test.js package.json urai-tier1/src/app/focus/FocusChamberClient.tsx urai-tier1/src/spatial/memory/useSelectedMemory.ts urai-tier1/tests/selected-memory-live-lifecycle.test.mjs urai-tier1/tests/unit-runner-coverage.test.mjs
git checkout --theirs urai-tier1/src/app/replay/replayVisualAdmission.ts
python3 - <<'PY'
from pathlib import Path
import re, json
root=Path('urai-tier1')
focus=root/'src/app/focus/FocusChamberClient.tsx'
s=focus.read_text()
assert s.count("import MemoryMediaAttachment from '@/spatial/memory/MemoryMediaAttachment'")==1
s=s.replace("import MemoryMediaAttachment from '@/spatial/memory/MemoryMediaAttachment'\n","")
assert s.count("import { forwardPrivateMovieRouteSelection } from '@/spatial/life-movie/privateLifeMovieRouteSelection'")==1
s=s.replace("import { forwardPrivateMovieRouteSelection } from '@/spatial/life-movie/privateLifeMovieRouteSelection'\n","")
block="""    if (!memory.demo && memory.privacy === 'private' && memory.authorization === 'owner') {
      forwardPrivateMovieRouteSelection(next, incoming, {
        memoryId: memory.id, manifestId: memory.replayManifest.id,
        authorizedOwner: true, demo: false,
      })
    }
"""
assert s.count(block)==1
s=s.replace(block,"    // No legacy private movie route grant is forwarded without receipt-backed playback.\n")
pattern=r"\{memory && !memory\.demo && memory\.privacy === 'private' && memory\.authorization === 'owner' \? <MemoryMediaAttachment key=\{[^}]+\} memory=\{memory\} /> : null\}"
start=s.find("{memory && !memory.demo && memory.privacy === 'private' && memory.authorization === 'owner' ? <MemoryMediaAttachment")
assert start >= 0, "upload control missing"
end=s.find(" : null}",start)
assert end>start
s=s[:start]+s[end+len(" : null}"):]
assert "<MemoryMediaAttachment" not in s
assert "function FocusCameraRig" in s and "useLayoutEffect" in s and "getFocusFrame" in s and "Ask Council about this memory" in s
focus.write_text(s)
print("FOCUS_CONTROLLER_CAMERA_LOCALE_COUNCIL_RETAINED_UPLOAD_PRIVATE_FORWARD_DENIED")
appearance=root/'src/app/focus/focusMemoryAppearance.ts'
a=appearance.read_text()
old="""imageUrl: memory?.sourceMedia.find((media) => media.kind === 'image')?.url
      ?? sample?.imageUrl ?? (memory?.demo ? demoFallback : null),"""
new="""// Private memory metadata does not confer an independent media playback grant.
    imageUrl: memory?.demo
      ? (memory.sourceMedia.find((media) => media.kind === 'image')?.url ?? sample?.imageUrl ?? demoFallback)
      : null,"""
assert a.count(old)==1
appearance.write_text(a.replace(old,new))
print("FOCUS_PRIVATE_MEDIA_TEXTURE_DENIED")
replay=root/'src/app/replay/replayVisualAdmission.ts'
r=replay.read_text()
assert "if (!memory.demo) return { kind: 'neutral', media: null }" in r
r=r.replace("import type { SelectedMemory, SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'","import type { SelectedMemory, SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'\nimport type { PrivateMovieRouteSelection } from '@/spatial/life-movie/privateLifeMovieRouteSelection'")
r=r.replace("export function replaySessionIdentity(memory: SelectedMemory) {","export function replaySessionIdentity(memory: SelectedMemory, selectedMovie?: PrivateMovieRouteSelection | null) {")
needle="    memory.sourceMedia.map(({ kind, url, caption }) => [kind, url, caption ?? null]),"
assert r.count(needle)==1
r=r.replace(needle,needle+"\n    ...(memory.sourceMediaReceipts?.length ? [memory.sourceMediaReceipts.map(({ kind, mediaReceiptId, caption }) => [kind, mediaReceiptId, caption ?? null])] : []),\n    ...(selectedMovie ? [['protected-movie', selectedMovie.planId, selectedMovie.movieId]] : []),")
replay.write_text(r)
print("REPLAY_PRIVATE_URL_VETO_WITH_SESSION_IDENTITY")
selected=root/'src/spatial/memory/useSelectedMemory.ts'
t=selected.read_text()
needle="process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)"
assert needle in t
selected.write_text(t.replace(needle,"process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null)"))
print("MISSING_MEDIA_BUCKET_EXPLICIT_DENIAL")
sky=root/'tests/home-sky-interaction.test.mjs'
u=sky.read_text();line=next(row for row in u.splitlines() if row.startswith("test('drag excursion remains a drag"))
assert line.endswith("assert.equal(f.state.calls,0);assert.equal(f.state.rayCalls,0)})")
sky.write_text(u.replace(line,line.replace("f.state.rayCalls,0","f.state.rayCalls,1")))
upload=root/'tests/owned-memory-media-client.test.mjs'
v=upload.read_text()
mark="test('Focus mounts the real file control only for an owned selected private memory and retains accurate preview copy'"
assert v.count(mark)==1
v=v[:v.index(mark)]+"""test('Focus refuses private file control until exclusive Storage writer is certified', () => {
  const focus = fs.readFileSync('src/app/focus/FocusChamberClient.tsx', 'utf8')
  assert.doesNotMatch(focus, /<MemoryMediaAttachment\\b/)
  assert.doesNotMatch(focus, /forwardPrivateMovieRouteSelection\\(/)
  assert.match(URAI_SOURCE_MESSAGES['memoryMedia.attached'].source, /Preview is not available here/)
})
"""
upload.write_text(v)
travel=root/'tests/focus-review-regression-contract.test.mjs'
w=travel.read_text()
mark="test('hard travel fallback preserves canonical replay identity and context'"
assert w.count(mark)==1
w=w[:w.index(mark)]+"""test('world travel fallback scopes current memory and never copies stale private selection', () => {
  for (const token of ['WORLD_TRAVEL_CONTEXT_KEYS', "'thread'", "'personId'", "'placeId'", "'movieId'", "'chapterId'"])
    assert.ok(worldEvents.includes(token), 'missing scoped context ' + token)
  assert.match(worldEvents, /target\\.searchParams\\.delete\\('memoryId'\\)/)
  assert.match(worldEvents, /target\\.searchParams\\.delete\\('node'\\)/)
  assert.match(worldEvents, /if \\(memoryDestination && context\\?\\.memoryId\\) target\\.searchParams\\.set\\('memoryId', context\\.memoryId\\)/)
  assert.match(worldEvents, /memoryDestination && context\\?\\.demo && \\(!selectedMemoryId \\|\\| !currentMemoryId \\|\\| sameMemory\\)/)
})
"""
travel.write_text(w)
print("REVIEW_TESTS_ALIGNED_WITH_MORE_RESTRICTIVE_CONTROLS")
appearance_test=root/'tests/focus-memory-appearance.test.mjs'
z=appearance_test.read_text()
old="""test('an admitted source image remains authoritative for both sample and ordinary memories', () => {
  for (const demo of [true, false]) {
    const selected = memory('seed-calm-return', demo)
    selected.sourceMedia = [{ kind: 'audio', url: '/synthetic.wav' }, { kind: 'image', url: '/synthetic-owner-image.webp' }]
    assert.equal(focusMemoryAppearance(selected, fallback).imageUrl, '/synthetic-owner-image.webp')
  }
})"""
new="""test('disclosed demo images display, but private media is hidden without playback grant', () => {
  for (const demo of [true, false]) {
    const selected = memory('seed-calm-return', demo)
    selected.sourceMedia = [{ kind: 'audio', url: '/synthetic.wav' }, { kind: 'image', url: '/synthetic-owner-image.webp' }]
    assert.equal(focusMemoryAppearance(selected, fallback).imageUrl, demo ? '/synthetic-owner-image.webp' : null)
  }
})"""
assert z.count(old)==1
appearance_test.write_text(z.replace(old,new))
print("PRIVATE_FOCUS_TEXTURE_TEST_FAIL_CLOSED")
srcPkg=Path('/tmp/donor-package.json')
if srcPkg.exists():
    donor=json.loads(srcPkg.read_text())
    rootPkg=Path('package.json')
    base=json.loads(rootPkg.read_text())
    if 'test:functions:native' in donor.get('scripts',{}):
        base['scripts']['test:functions:native']=donor['scripts']['test:functions:native']
        rootPkg.write_text(json.dumps(base,indent=2)+'\n')
        print("NATIVE_FUNCTIONS_ACCEPTANCE_SCRIPT_ADMITTED")
assert "if (!memory.demo) return { kind: 'neutral', media: null }" in replay.read_text()
assert "memory?.demo" in appearance.read_text()
PY
git show FETCH_HEAD:urai-tier1/tests/replay-source-media-behavior.test.mjs > urai-tier1/tests/replay-source-media-behavior.test.mjs
python3 - <<'PY'
from pathlib import Path
p=Path('urai-tier1/tests/replay-source-media-behavior.test.mjs')
t=p.read_text()
needle="  assert.match(focus, /const memoryImageUrl = memory\\?\\.demo/)"
assert t.count(needle)==1, "replay source test expected assertion missing"
t=t.replace(needle,"  assert.match(fs.readFileSync('src/app/focus/focusMemoryAppearance.ts', 'utf8'), /imageUrl: memory\\?\\.demo/)")
p.write_text(t)
print('DONOR_PRIVATE_REPLAY_TEST_PRESERVED_AND_FOCUS_SOURCE_PROOF_UPDATED')
t=p.read_text()
old="const refs = [{ current: null }, { current: video }, { current: true }]"
new="const refs = [{ current: null }, { current: video }, { current: null }, { current: true }]"
assert t.count(old)==1
t=t.replace(old,new)
old="return { createReplayVideoSession }"
new="return { createReplayMediaSession: createReplayVideoSession }"
assert t.count(old)==1
t=t.replace(old,new)
p.write_text(t)
print("REPLAY_DONOR_TEST_HARNESS_ALIGNED_TO_CONTROLLER_FOUR_REFS")
PY
git add -A
test -z "$(git diff --name-only --diff-filter=U)" || exit 45
git diff --cached --check -- . ':!docs/reconciliation/R977_PASSIVE_CONSENT_RUNTIME_AND_CLIENT_PROJECTION_HOLD_20261109.md' || exit 46
git commit -qm "R1074 isolated review integration of release visual and private denial"
echo "INTEGRATED_SHA=$(git rev-parse HEAD)"
echo "INTEGRATED_PARENTS=$(git rev-list --parents -n 1 HEAD)"
corepack enable
corepack prepare pnpm@10.0.0 --activate >/tmp/core.log 2>&1
timeout 1800 pnpm install --frozen-lockfile >/tmp/install.log 2>&1 || { echo "INSTALL_FAIL"; tail -n 30 /tmp/install.log; exit 47; }
echo "INSTALL_PASS"
timeout 900 pnpm --dir urai-tier1 typecheck >/tmp/types.log 2>&1 || { echo "TYPECHECK_FAIL"; tail -n 42 /tmp/types.log; exit 48; }
echo "TYPES_PASS"
echo "R1074_FOCUSED_DIAGNOSTIC_RUN"
timeout 200 pnpm --dir urai-tier1 exec node --test tests/private-media-bucket-failclosed.test.mjs tests/replay-source-media-behavior.test.mjs >/tmp/private-tests.log 2>&1 || { echo "PRIVACY_TEST_FAIL"; grep -n -E 'not ok|error:|expected:|actual:|AssertionError|failureType' /tmp/private-tests.log | head -n 85 | cut -c1-260; exit 50; }
echo "PRIVACY_TEST_PASS"
timeout 1800 pnpm --dir urai-tier1 build >/tmp/build.log 2>&1 || { echo "BUILD_FAIL"; tail -n 55 /tmp/build.log | cut -c1-220; exit 51; }
echo "STATIC_BUILD_PASS"
test -s urai-tier1/out/index.html || exit 52
echo "STATIC_OUTPUT_READY"
cd urai-tier1/out
exec python3 -m http.server 3000 --bind 0.0.0.0

```

## Immediate next gate
- Run audited full unit, consent/regression, native emulator, browser, and authenticated integration acceptance on exact immutable source; fix launch-gate assumptions without deleting tests or opening XR.
- Get current native workers' signoff and reconcile generated source with protected PRs. Recover Vercel/GitHub integration or authorized durable static host before any domain move.
- Prove exclusive real GCS writer IAM + stale writer revocation fence and upload draining before enabling any real private-memory writes.
- Stop/remove temporary preview Pods after preserving approved artifacts. Treat Runpod proxy as temporary public demo hosting with ongoing compute cost.

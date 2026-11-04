#!/usr/bin/env bash
# ONE URAI R585: temporary Runpod CPU exact-source verification, REVIEW ONLY.
# Usage: bash scripts/review-only/runpod-r578-spatial-native-ci.sh <40-character SHA>
set -Eeuo pipefail
umask 077
export CI=1 GIT_TERMINAL_PROMPT=0 NEXT_TELEMETRY_DISABLED=1 COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NO_GCE_CHECK=true
unset GITHUB_TOKEN GH_TOKEN RUNPOD_API_KEY GOOGLE_APPLICATION_CREDENTIALS GOOGLE_CLOUD_PROJECT GCLOUD_PROJECT FIREBASE_TOKEN STRIPE_SECRET_KEY OPENAI_API_KEY GOOGLE_OAUTH_ACCESS_TOKEN AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY || true
SHA="$1"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo R585_INVALID_PIN; exit 64; }
ROOT="$(mktemp -d /tmp/urai-r578-XXXXXX)"
STAGE=checkout
finish(){
 rc="$?";trap - EXIT
 echo "R585_FINISHED=$(date -u +%FT%TZ)"
 echo "R585_FINAL_EXIT=$rc"
 echo "R585_FINAL_STAGE=$STAGE"
 for n in focused install unit types build html browser; do if test -f "$ROOT/$n.log";then echo "R585_LOG_SHA_$n=$(sha256sum "$ROOT/$n.log" | awk '{print $1}')"; fi;done
 if test "$rc" -ne 0 && test -f "$ROOT/$STAGE.log";then
  echo R585_FAILED_TAIL_BEGIN;tail -n 40 "$ROOT/$STAGE.log" | sed -E 's/(token|authorization|api[_-]?key)=([^[:space:]]+)/\1=[REDACTED]/Ig';echo R585_FAILED_TAIL_END
 fi
 echo R585_PRODUCTION_AUTHORIZED=false
 echo R585_RELEASE_VERDICT=HOLD
 sleep 65
 exit "$rc"
}
trap finish EXIT
step(){
 STAGE="$1";seconds="$2";shift 2
 if timeout -k 10 "$seconds" "$@" >"$ROOT/$STAGE.log" 2>&1;then echo "R585_STAGE_$STAGE=PASS";else echo "R585_STAGE_$STAGE=FAIL";return 27;fi
}
echo "R585_STARTED=$(date -u +%FT%TZ)"
corepack enable >/dev/null
corepack prepare pnpm@10.0.0 --activate >/dev/null 2>&1
echo "R585_NODE=$(node -v)"
echo "R585_PNPM=$(pnpm -v)"
git init -q "$ROOT/src"
git -C "$ROOT/src" remote add origin https://github.com/LifeLoggerAI/urai-spatial.git
timeout -k 10 120 git -C "$ROOT/src" fetch -q --depth 1 origin "$SHA"
git -C "$ROOT/src" checkout -q --detach FETCH_HEAD
test "$(git -C "$ROOT/src" rev-parse HEAD)" = "$SHA"
cd "$ROOT/src"
echo "R585_GIT_HEAD=$(git rev-parse HEAD)"
echo "R585_GIT_TREE=$(git rev-parse HEAD^{tree})"
while read -r file expected;do
 test "$(git hash-object "$file")" = "$expected" || { echo "R585_SOURCE_DRIFT $file";exit 18;}
done <<'BLOBS'
urai-tier1/src/app/passport/PassportVaultClient.tsx c30095d59b7cb4fd0b9339ad9d4c6961cf207575
urai-tier1/src/app/privacy-controls/ConsentSanctuaryClient.tsx 5c948cc6c3ca2f3d0da6634632fe971080c9883e
urai-tier1/tests/security-boundary-contract.test.mjs a9ad272ec1137585e1f0a8b110d74063b508d970
urai-tier1/src/app/privacy-controls/consentModel.ts 8c4884d77267583d6a87a423daa1928d72bde92b
urai-tier1/tests/consent-policy-validation.test.mjs 3f1107bf264625555891a5bfbde85e92b5ada687
BLOBS
echo R585_GIT_BLOBS=5/5_PASS
step focused 120 node --experimental-strip-types --test urai-tier1/tests/consent-policy-validation.test.mjs urai-tier1/tests/security-boundary-contract.test.mjs urai-tier1/tests/passport-ownership-vault-contract.test.mjs urai-tier1/tests/privacy-consent-sanctuary-contract.test.mjs urai-tier1/tests/unit-runner-coverage.test.mjs
grep -E '^# (tests|pass|fail|duration_ms)' "$ROOT/focused.log" | tail -n 5 || true
step install 330 pnpm install --frozen-lockfile
step unit 300 pnpm --dir urai-tier1 test:unit
step types 230 pnpm --dir urai-tier1 typecheck
step build 510 env URAI_FIREBASE_STATIC_EXPORT=true pnpm build:static
STAGE=html
node - <<'NODE' >"$ROOT/html.log" 2>&1
const fs=require('node:fs'),path=require('node:path')
let passed=true
for(const route of ['passport','privacy-controls']){
 const options=[path.join('urai-tier1','out',route,'index.html'),path.join('urai-tier1','out',route+'.html')]
 const file=options.find(fs.existsSync)
 if(!file){console.log('R585_HTML_'+route+'=NOT_EXPORTED');passed=false;continue}
 const html=fs.readFileSync(file,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
 const banned=['Ownership: verified','Memory granted','Enforcement: fully-enforced','2 connected targets','sample-owner'].filter(t=>html.includes(t))
 const marker=route==='passport'?'data-passport-source="loading"':'data-privacy-source="loading"'
 const ok=html.includes(marker)&&banned.length===0
 console.log('R585_HTML_'+route+'='+(ok?'PASS':'FAIL')+' forbidden='+banned.join('|'))
 if(!ok)passed=false
}
process.exit(passed?0:2)
NODE
if test "$?" -eq 0;then echo R585_STAGE_html=PASS;else echo R585_STAGE_html=FAIL;tail -n 25 "$ROOT/html.log";exit 33;fi
step browser 180 env URAI_CHROMIUM_EXECUTABLE=/usr/bin/chromium-browser node scripts/review-only/r579-passport-consent-browser.mjs
grep -E '^R579_BROWSER_CHECKS=|^R579_VERDICT=' "$ROOT/browser.log" || true
grep -q '^R579_BROWSER_CHECKS=10/10_PASS' "$ROOT/browser.log" || { echo R585_BROWSER_RECEIPT_MISSING; exit 36; }
echo R585_REVIEW_RESULT=PASS_NOT_RELEASE

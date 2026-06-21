#!/usr/bin/env bash
set +e

echo "=== URAI FIREBASE STUDIO NODE POLISH DEPLOY ==="
echo "No python3 needed."

PROJECT_ID="${PROJECT_ID:-urai-4dc1d}"
ROOT=""
for d in "$PWD" "$PWD/urai-spatial" "$HOME/urai-spatial" "/workspace/urai-spatial" "/workspaces/urai-spatial"; do
  if [ -d "$d/.git" ] && [ -f "$d/urai-tier1/package.json" ]; then
    ROOT="$d"
    break
  fi
done

if [ -z "$ROOT" ]; then
  echo "ERROR: could not find urai-spatial repo. Open the urai-spatial Firebase Studio workspace."
  read -p "Press Enter to keep terminal open..."
  exit 0
fi

cd "$ROOT" || exit 0
mkdir -p logs
LOG="logs/firebase-studio-node-polish-deploy-$(date -u +%Y%m%dT%H%M%SZ).log"
exec > >(tee "$LOG") 2>&1

echo "ROOT=$ROOT"
echo "PROJECT_ID=$PROJECT_ID"
echo "LOG=$LOG"

echo
echo "=== APPLY POLISH + WIRING PATCH WITH NODE ==="
node <<'NODE'
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, text) => fs.writeFileSync(path.join(root, p), text);
function replaceOnce(text, oldText, newText, label) {
  if (!text.includes(oldText)) {
    console.log(`SKIP_OR_ALREADY_PATCHED: ${label}`);
    return text;
  }
  console.log(`PATCHED: ${label}`);
  return text.replace(oldText, newText);
}

let p = 'urai-tier1/src/spatial/layout/TierOneExperience.tsx';
let text = read(p);
text = text.replace('import type { ReactNode } from "react";', 'import { useCallback, useState, type ReactNode } from "react";');
text = replaceOnce(text,
`const mirror = mirrorStates[0];
const replayMode = 'replay';
const noop = () => {};
const noopNode = (_nodeId: string) => {};
const startReplayFromFocus = () => {
  window.location.href = "/replay?manifestId=seed-memory-bloom";
};
`,
`const mirror = mirrorStates[0];
const replayMode = 'replay';
const seededReplayManifestId = "seed-memory-bloom";
`, 'TierOne constants');
text = replaceOnce(text,
`  const showRouteCard = mode !== "home" && mode !== "ascent";
  const routeCard = showRouteCard ? <p className="urai-v1-route-card">Your Life Map is forming.</p> : null;
  const focusActionPanel = (
`,
`  const showRouteCard = mode !== "home" && mode !== "ascent";
  const routeCard = showRouteCard ? <p className="urai-v1-route-card">Your Life Map is forming.</p> : null;
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(
    mode === "focus" || mode === replayMode ? firstNodeId : undefined,
  );

  const returnHome = useCallback(() => {
    window.location.href = "/home";
  }, []);

  const returnLifeMap = useCallback(() => {
    window.location.href = "/life-map";
  }, []);

  const openMirror = useCallback(() => {
    window.location.href = "/mirror";
  }, []);

  const startReplayFromFocus = useCallback(() => {
    window.location.href = \`/replay?manifestId=\${encodeURIComponent(seededReplayManifestId)}\`;
  }, []);

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const closeNode = useCallback(() => {
    setSelectedNodeId(undefined);
  }, []);

  const focusActionPanel = (
`, 'TierOne hooks');
text = replaceOnce(text,
`  if (mode === "life-map" || mode === "demo") {
    return <StageFrame mode={mode}>{routeCard}<LifeMapScene nodes={lifeMapNodes} edges={lifeMapEdges} replayPath={replayPath} replayActive={false} onSelectNode={noopNode} onCloseNode={noop} onStartReplay={noop} onOpenMirror={noop} onReturnHome={noop} /></StageFrame>;
  }

  if (mode === "focus") {
    return <StageFrame mode={mode}>{routeCard}<LifeMapScene nodes={lifeMapNodes} edges={lifeMapEdges} replayPath={replayPath} selectedNodeId={firstNodeId} replayActive={false} onSelectNode={noopNode} onCloseNode={noop} onStartReplay={startReplayFromFocus} onOpenMirror={noop} onReturnHome={noop} />{focusActionPanel}</StageFrame>;
  }

  if (mode === replayMode) {
    return <StageFrame mode={mode}>{routeCard}<LifeMapScene nodes={lifeMapNodes} edges={lifeMapEdges} replayPath={replayPath} selectedNodeId={firstNodeId} replayActive onSelectNode={noopNode} onCloseNode={noop} onStartReplay={noop} onOpenMirror={noop} onReturnHome={noop} /></StageFrame>;
  }

  if (mode === "mirror") {
    return <StageFrame mode={mode}>{routeCard}<MirrorOfBecomingView mirror={mirror} onClose={noop} onHome={noop} /></StageFrame>;
  }
`,
`  if (mode === "life-map" || mode === "demo") {
    return <StageFrame mode={mode}>{routeCard}<LifeMapScene nodes={lifeMapNodes} edges={lifeMapEdges} replayPath={replayPath} selectedNodeId={selectedNodeId} replayActive={false} onSelectNode={selectNode} onCloseNode={closeNode} onStartReplay={startReplayFromFocus} onOpenMirror={openMirror} onReturnHome={returnHome} /></StageFrame>;
  }

  if (mode === "focus") {
    return <StageFrame mode={mode}>{routeCard}<LifeMapScene nodes={lifeMapNodes} edges={lifeMapEdges} replayPath={replayPath} selectedNodeId={selectedNodeId ?? firstNodeId} replayActive={false} onSelectNode={selectNode} onCloseNode={closeNode} onStartReplay={startReplayFromFocus} onOpenMirror={openMirror} onReturnHome={returnHome} />{focusActionPanel}</StageFrame>;
  }

  if (mode === replayMode) {
    return <StageFrame mode={mode}>{routeCard}<LifeMapScene nodes={lifeMapNodes} edges={lifeMapEdges} replayPath={replayPath} selectedNodeId={selectedNodeId ?? firstNodeId} replayActive onSelectNode={selectNode} onCloseNode={closeNode} onStartReplay={startReplayFromFocus} onOpenMirror={openMirror} onReturnHome={returnHome} /></StageFrame>;
  }

  if (mode === "mirror") {
    return <StageFrame mode={mode}>{routeCard}<MirrorOfBecomingView mirror={mirror} onClose={returnLifeMap} onHome={returnHome} /></StageFrame>;
  }
`, 'TierOne route wiring');
write(p, text);

p = 'urai-tier1/src/scene/HomeScene.tsx';
text = read(p);
text = replaceOnce(text,
  'function HomeHud({ onLifeMap, onFocus, onReplay }: { onLifeMap: () => void; onFocus: () => void; onReplay: () => void }) {',
  'function HomeHud({ onLifeMap, onFocus, onReplay, onMirror }: { onLifeMap: () => void; onFocus: () => void; onReplay: () => void; onMirror: () => void }) {',
  'HomeHud signature');
text = text.replace('<h1>Private emotional universe online.</h1>', '<h1>Step inside yourself.</h1>');
text = text.replace('<p>Sky, ground, avatar mirror, memory stars, and Passport foundation are live as seeded public demo data. URAI remains private by default with no ads inside URAI.</p>', '<p>Your Life Map, Focus Chamber, Replay Theater, Mirror, and Passport foundation are live in one private spatial field.</p>');
text = text.replace('Ascend to Life Map', 'Open Life Map');
text = text.replace('Open Focus Chamber', 'Open Focus');
text = text.replace('Enter Replay Theater', 'Open Replay');
if (!text.includes('onMirror() }}>Open Mirror</button>')) {
  text = text.replace('        <button type="button" onClick={(event) => { event.stopPropagation(); onReplay() }}>Open Replay</button>\n', '        <button type="button" onClick={(event) => { event.stopPropagation(); onReplay() }}>Open Replay</button>\n        <button type="button" onClick={(event) => { event.stopPropagation(); onMirror() }}>Open Mirror</button>\n');
}
text = text.replace('Private by default · User-controlled data access · URAI Passport foundation · No ads', 'Private by default · user controlled · no ads inside URAI');
text = replaceOnce(text,
  "  const openLifeMap = useCallback(() => router.push(isHomeMode && !reducedMotion ? '/ascent' : '/life-map'), [isHomeMode, reducedMotion, router])",
  "  const openLifeMap = useCallback(() => router.push('/life-map'), [router])",
  'openLifeMap direct');
text = replaceOnce(text,
  "  const openReplay = useCallback(() => router.push(`/replay?manifestId=${encodeURIComponent(activeManifestId)}`), [activeManifestId, router])",
  "  const openReplay = useCallback(() => router.push(`/replay?manifestId=${encodeURIComponent(activeManifestId)}`), [activeManifestId, router])\n  const openMirror = useCallback(() => router.push('/mirror'), [router])",
  'openMirror callback');
text = replaceOnce(text,
  '{isHomeMode ? <HomeHud onLifeMap={openLifeMap} onFocus={openFocus} onReplay={openReplay} /> : null}',
  '{isHomeMode ? <HomeHud onLifeMap={openLifeMap} onFocus={openFocus} onReplay={openReplay} onMirror={openMirror} /> : null}',
  'HomeHud render');
const homeOverride = `
      /* URAI Firebase Studio live polish override */
      .urai-home-canon-hud {
        left: clamp(18px, 5vw, 72px);
        bottom: clamp(24px, 8vh, 86px);
        width: min(560px, calc(100vw - 36px));
        padding: clamp(20px, 3vw, 34px);
        border-radius: 30px;
        border-color: rgba(186, 230, 253, 0.34);
        background: radial-gradient(circle at 16% 14%, rgba(103, 232, 249, 0.16), transparent 34%), linear-gradient(145deg, rgba(2, 8, 23, 0.78), rgba(15, 23, 42, 0.54));
      }
      .urai-home-canon-hud h1 { max-width: 12ch; margin: 12px 0 14px; font-size: clamp(3.1rem, 6.8vw, 6.6rem); line-height: 0.9; letter-spacing: -0.085em; color: rgba(238, 248, 255, 0.96); text-shadow: 0 18px 80px rgba(103, 232, 249, 0.22); }
      .urai-home-canon-hud p { max-width: 48ch; margin-bottom: 20px; color: rgba(234, 244, 255, 0.82); font-size: clamp(0.95rem, 1.3vw, 1.08rem); }
      .urai-home-canon-hud__actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .urai-home-canon-hud button { min-height: 44px; padding: 11px 15px; }
`;
if (!text.includes('URAI Firebase Studio live polish override')) {
  text = text.replace('      @media (max-width: 760px) {', homeOverride + '\n      @media (max-width: 760px) {');
}
write(p, text);

p = 'urai-tier1/src/spatial/v1/LifeMapScene.tsx';
text = read(p);
if (!text.includes('urai-v1-lifemap__title')) {
  text = text.replace('      <ReplayPathEngine path={replayPath} active={replayActive} />\n      <div className="urai-v1-lifemap__controls" data-testid="urai-v1-time-lens" aria-label="Life Map controls">\n', '      <ReplayPathEngine path={replayPath} active={replayActive} />\n      <article className="urai-v1-lifemap__title" aria-label="Life Map launch panel">\n        <p>URAI Life Map</p>\n        <h1>Memory galaxy alive.</h1>\n        <span>Tap a star. Open Replay. Enter Mirror. Return home anytime.</span>\n      </article>\n      <div className="urai-v1-lifemap__controls" data-testid="urai-v1-time-lens" aria-label="Life Map controls">\n');
  console.log('PATCHED: LifeMap title');
} else {
  console.log('SKIP_OR_ALREADY_PATCHED: LifeMap title');
}
write(p, text);

p = 'urai-tier1/src/spatial/v1/uraiSpatialV1.css';
text = read(p);
const lifeOverride = `
/* URAI Life Map Firebase Studio live polish override */
.urai-v1-route-card { display: none; }
.urai-v1-lifemap { background: radial-gradient(circle at 50% 50%, rgba(103,232,249,.16), transparent 22%), radial-gradient(circle at 34% 54%, rgba(132,204,22,.18), transparent 25%), radial-gradient(circle at 72% 44%, rgba(251,113,133,.2), transparent 26%), radial-gradient(circle at 55% 18%, rgba(251,191,36,.12), transparent 20%), #02030a; }
.urai-v1-lifemap__title { position: absolute; left: max(18px, env(safe-area-inset-left)); bottom: max(18px, env(safe-area-inset-bottom)); z-index: 42; width: min(460px, calc(100vw - 36px)); padding: 18px 20px; border: 1px solid rgba(186,230,253,.22); border-radius: 26px; background: rgba(3, 8, 20, .5); backdrop-filter: blur(22px); box-shadow: 0 24px 90px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.07); pointer-events: none; }
.urai-v1-lifemap__title p { margin: 0 0 8px; color: #8fdcff; font-size: 11px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; }
.urai-v1-lifemap__title h1 { margin: 0 0 8px; font-size: clamp(28px, 4vw, 52px); line-height: .94; letter-spacing: -.055em; }
.urai-v1-lifemap__title span { color: rgba(235,250,255,.72); font-size: 13px; line-height: 1.4; }
.urai-v1-lifemap__controls { gap: 8px; padding: 8px; border-radius: 999px; background: rgba(3, 8, 20, .62); }
.urai-v1-lifemap__controls button, .urai-v1-memory-scroll__actions button, .urai-v1-mirror__actions button, .urai-v1-focus-action-panel button { min-height: 38px; border: 1px solid rgba(186,230,253,.28); border-radius: 999px; background: rgba(15, 23, 42, .72); color: rgba(248, 251, 255, .94); padding: 8px 13px; font-weight: 850; cursor: pointer; }
.urai-v1-lifemap__controls button:hover, .urai-v1-memory-scroll__actions button:hover, .urai-v1-mirror__actions button:hover, .urai-v1-focus-action-panel button:hover { border-color: rgba(103,232,249,.7); background: rgba(30,41,59,.78); }
.urai-v1-node__label { top: 135%; padding: 4px 8px; border-radius: 999px; background: rgba(3, 8, 20, .44); backdrop-filter: blur(10px); }
@media (max-width: 760px) { .urai-v1-lifemap__title { display: none; } }
`;
if (!text.includes('URAI Life Map Firebase Studio live polish override')) {
  text += '\n' + lifeOverride + '\n';
  console.log('PATCHED: LifeMap CSS');
} else {
  console.log('SKIP_OR_ALREADY_PATCHED: LifeMap CSS');
}
write(p, text);
console.log('PATCH_DONE');
NODE

PATCH_EXIT=$?
echo "PATCH_EXIT=$PATCH_EXIT"
if [ "$PATCH_EXIT" != "0" ]; then
  echo "Patch failed. Send me the last lines above."
  read -p "Press Enter to keep terminal open..."
  exit 0
fi

echo
echo "=== PATCH CHECK ==="
grep -n "Step inside yourself\|Open Mirror\|selectedNodeId\|returnHome\|Memory galaxy alive" \
  urai-tier1/src/scene/HomeScene.tsx \
  urai-tier1/src/spatial/layout/TierOneExperience.tsx \
  urai-tier1/src/spatial/v1/LifeMapScene.tsx || true

echo
echo "=== FIREBASE PUBLIC ENV ==="
cat > urai-tier1/.env.production.local <<EOF
NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${PROJECT_ID}.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${PROJECT_ID}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_URAI_DEMO_USER_ID=demo-user
EOF
cp urai-tier1/.env.production.local .env.production.local

echo
echo "=== INSTALL + BUILD ==="
corepack enable
corepack prepare pnpm@10.0.0 --activate
URAI_MIN_INSTALL_FREE_MB=256 pnpm install --frozen-lockfile
INSTALL_EXIT=$?
echo "INSTALL_EXIT=$INSTALL_EXIT"
if [ "$INSTALL_EXIT" != "0" ]; then
  echo "Install failed. Send me the last eighty lines."
  read -p "Press Enter to keep terminal open..."
  exit 0
fi

URAI_FIREBASE_STATIC_EXPORT=true pnpm --filter urai-tier1 build
BUILD_EXIT=$?
echo "BUILD_EXIT=$BUILD_EXIT"
if [ "$BUILD_EXIT" != "0" ]; then
  echo "Build failed. Send me the last one hundred twenty lines."
  read -p "Press Enter to keep terminal open..."
  exit 0
fi

echo
echo "=== DEPLOY HOSTING ==="
npx firebase-tools@latest deploy --config firebase.static.json --only hosting --project "$PROJECT_ID"
DEPLOY_EXIT=$?
echo "DEPLOY_EXIT=$DEPLOY_EXIT"
if [ "$DEPLOY_EXIT" != "0" ]; then
  echo "Deploy failed. If it asks auth, run:"
  echo "npx firebase-tools@latest login --no-localhost"
  read -p "Press Enter to keep terminal open..."
  exit 0
fi

echo
echo "=== LIVE CHECK ==="
sleep 15
for p in / /home /life-map /focus /replay /mirror /passport /status; do
  code="$(curl -L -s -o /tmp/urai-check.html -w "%{http_code}" "https://urai.app$p?nodepatch=$(date +%s)")"
  echo "$code https://urai.app$p"
done

echo
echo "DONE — hard refresh urai.app with Ctrl+Shift+R"
echo "LOG=$LOG"
read -p "Press Enter to keep terminal open..."

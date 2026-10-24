import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/components/lifemap/useLifeMapEvents.ts', import.meta.url), 'utf8')
const accessGate = fs.readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8')
const semanticNavigator = fs.readFileSync(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const routeBoundary = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
const routeTransactionBridge = fs.readFileSync(new URL('../src/spatial/world/LifeMapRouteTransactionBridge.tsx', import.meta.url), 'utf8')

test('Life Map identity fails closed instead of defaulting to demo-user', () => {
  assert.doesNotMatch(source, /return "demo-user"/)
  assert.doesNotMatch(source, /\|\| "demo-user"/)
  assert.match(source, /function resolveUserId\(explicitUserId\?: string\): string \| null/)
  assert.doesNotMatch(source, /localStorage\.getItem/)
  assert.match(source, /return null;/)
  assert.match(source, /if \(!resolvedUserId\)/)
  assert.match(source, /Sign in to open your private Life Map\./)
})

test('sample memories require only the explicit demo-user contract', () => {
  assert.match(source, /return explicitUserId === "demo-user"/)
  assert.doesNotMatch(source, /NEXT_PUBLIC_URAI_EXPLICIT_DEMO/)
  assert.doesNotMatch(source, /lifeMapDemoMode/)
  assert.match(source, /sourceMode: LifeMapSourceMode/)
  assert.match(source, /"explicit-demo"/)
})

test('empty and failed private snapshots never substitute seed memories', () => {
  assert.match(source, /setNodes\(snapshot\.docs\.map/)
  assert.doesNotMatch(source, /setNodes\([^)]*lifeMapNodes/)
  assert.match(source, /setNodes\(\[\]\)/)
  assert.match(source, /setEras\(\[\]\)/)
  assert.match(source, /\? "empty"/)
  assert.match(source, /\? "error"/)
  assert.match(source, /\? "unavailable"/)
})

test('normalized documents inherit the authenticated owner rather than a fake identity', () => {
  assert.match(source, /function normalizeEvent\(id: string, data: DocumentData, ownerId = ""\)/)
  assert.match(source, /userId: typeof data\.userId === "string" \? data\.userId : ownerId/)
  assert.match(source, /normalizeEvent\(doc\.id, doc\.data\(\), resolvedUserId\)/)
  assert.match(source, /normalizeEra\(doc\.id, doc\.data\(\), resolvedUserId\)/)
})


test('signed-out Life Map never auto-opens disclosed demo content', () => {
  assert.doesNotMatch(accessGate, /setTimeout\(onOpenDemo/)
  assert.doesNotMatch(accessGate, /USER_ID_KEY|urai:userId/)
  assert.doesNotMatch(accessGate, /localStorage\.getItem/)
  assert.match(accessGate, /listen: \(onIdentity, onFailure\) => onAuthStateChanged\(getAuth\(app\), user => onIdentity\(user\?\.uid \?\? null\), onFailure\)/)
  assert.match(accessGate, /setMode\(userId \? "private" : "signed-out"\)/)
  assert.match(accessGate, /current\.get\("demo"\) === "1"/)
  assert.match(accessGate, /onClick=\{onOpenDemo\}/)
})

test('private Life Map data is loaded only from the Firebase-authenticated UID threaded by the access gate', () => {
  assert.match(accessGate, /setAuthenticatedUserId\(userId\)/)
  assert.match(accessGate, /return subscribeLifeMapAuth\(\{/)
  assert.match(accessGate, /authenticatedUserId=\{mode === "private" \? authenticatedUserId : null\}/)
  assert.match(accessGate, /authenticatedUserId=\{mode === "private" \? authenticatedUserId : null\}/)
  assert.doesNotMatch(source, /urai:userId/)
})


test('semantic Life Map navigation uses authenticated ownership and remains available without WebGL', () => {
  assert.match(semanticNavigator, /authenticatedUserId/)
  assert.match(semanticNavigator, /useLifeMapEvents\(explicitDemo \? 'demo-user' : authenticatedUserId \?\? undefined\)/)
  assert.match(routeBoundary, /<LifeMapSemanticNavigator authenticatedUserId=\{authenticatedUserId\}/)
  assert.match(accessGate, /if \(!webglAvailable\) \{/)
  assert.match(accessGate, /if \(mode === "signed-out"\) \{[\s\S]*<LifeMapSemanticNavigator authenticatedUserId=\{null\} \/><\/\>;/)
  assert.match(accessGate, /return <><LifeMapLoading label="WebGL is unavailable\. Semantic navigation remains available" \/><LifeMapSemanticNavigator authenticatedUserId=\{mode === "private" \? authenticatedUserId : null\} \/><\/\>;/)
  assert.doesNotMatch(semanticNavigator, /localStorage\.getItem/)
})


test('semantic Life Map fallback preserves the Focus and Replay journey without inventing replay availability', () => {
  assert.match(semanticNavigator, /destinationHref\('focus', selected\)/)
  assert.match(semanticNavigator, /destinationHref\('replay', selected\)/)
  assert.match(semanticNavigator, /next\.set\('from', 'life-map-semantic'\)/)
  assert.match(semanticNavigator, /disabled=\{!lifeMapPhysicalReplayAllowed\(selected, sourceMode\)\}/)
  assert.match(semanticNavigator, /locale.text\('lifeMap.enterFocus'\)/)
  const messages = fs.readFileSync(new URL('../src/lib/i18n/journeyMessages.ts', import.meta.url), 'utf8')
  assert.match(messages, /'lifeMap.enterFocus':\s*\{\s*id:'lifeMap.enterFocus',\s*source:"Enter Focus"/)
  assert.match(semanticNavigator, /locale.text\('nav.replay'\)/)
})


test('persistent Life Map route transactions use Firebase auth rather than implicit browser identity', () => {
  assert.match(routeTransactionBridge, /onAuthStateChanged\(getAuth\(app\)/)
  assert.match(routeTransactionBridge, /setIdentity\(\{ location, userId: user\?\.uid \?\? null \}\)/)
  assert.match(routeTransactionBridge, /identity\.location === location \? identity\.userId : null/)
  assert.match(routeTransactionBridge, /setIdentity\(\{ location, userId: null \}\)/)
  assert.match(routeTransactionBridge, /useLifeMapEvents\(explicitDemo \? 'demo-user' : authenticatedUserId \?\? undefined\)/)
  assert.doesNotMatch(routeTransactionBridge, /localStorage\.getItem/)
})

test('a changed Firebase actor never renders previously cached private Life Map stars or eras', () => {
  // Firestore unsubscribe happens after render. The current-actor fence must
  // apply synchronously on render, before useEffect cleanup can run.
  assert.match(source, /const currentOwner = explicitDemo \? 'demo-user' : resolvedUserId;/)
  assert.match(source, /const currentNodes = nodesOwner === currentOwner \? nodes : \[\];/)
  assert.match(source, /const currentEras = erasOwner === currentOwner \? eras : \[\];/)
  assert.match(source, /return \{ nodes: resolvedNodes, eras: visibleEras, loading, error, usingSeedData: explicitDemo, sourceMode \};/)
  assert.match(source, /setNodesOwner\(resolvedUserId\)/)
  assert.match(source, /setErasOwner\(resolvedUserId\)/)
  // Demo mode must be its own explicit source, never inherited from an owner.
  assert.match(source, /setNodesOwner\('demo-user'\)/)
  assert.match(source, /setErasOwner\('demo-user'\)/)
})

test('private Life Map joins only currently consented, owner-verified canonical memories', () => {
  assert.match(source, /memoryId: sanitizeMemoryId\(typeof data\.memoryId === "string" \? data\.memoryId : null\)/)
  assert.match(source, /collection\(getFirebaseDb\(\), "users", resolvedUserId, "memories"\)/)
  assert.match(source, /parseSelectedMemory\(doc\.data\(\), resolvedUserId, doc\.id/)
  assert.match(source, /if \(parsed\.status === 'ready' && parsed\.memory\.privacy !== 'hidden'\) accepted\.set\(doc\.id, parsed\.memory\)/)
  assert.match(source, /const memoryId = sanitizeMemoryId\(node\.memoryId\)/)
  assert.match(source, /memoryId && node\.type === "memory" \? visibleMemories\.get\(memoryId\)/)
  // A deleted, revoked or missing canonical memory is never a spatial landmark:
  // not even a redacted shell may reveal its former position or relationships.
  assert.match(source, /if \(node\.privacyLevel === 'hidden'\) return \[\]/)
  assert.match(source, /if \(node\.type === 'memory' && !authoritative\) return \[\]/)
  assert.doesNotMatch(source, /if \(node\.type === 'memory' && !authoritative\) return \[\{/)
  // Unlinked contextual signals carry neither a memory pointer nor Replay authority.
  assert.match(source, /if \(!authoritative\) return \[\{ \.\.\.node, authorizedMemory: false,/)
  assert.match(source, /memoryId: undefined, replayAvailable: false, replayManifestId: undefined/)
  assert.match(source, /id: node\.id, memoryId: authoritative\.id/)
  assert.match(source, /replayManifestId: authoritative\.replayManifest\.id/)
  // Projecting a canonical memory without a separate event requires all
  // consent-revision source streams to have been freshly verified.
  assert.match(source, /nodesAuthority !== authorityKey \|\| erasAuthority !== authorityKey \|\| memoriesAuthority !== authorityKey\) return fromEvents/)
  assert.match(source, /memory\.privacy === 'hidden' \|\| memory\.demo \|\| memory\.ownerId !== resolvedUserId/)
  assert.match(source, /eventMemoryIds\.has\(memory\.id\)\) continue/)
})


test('visible Life Map projection denies both current and legacy hidden privacy, including demo and keyboard paths', () => {
  assert.match(source, /privacyLevel: lifeMapEventPrivacyLevel\(data\)/);
  assert.match(source, /const visibleNodes = lifeMapFilterVisibleNodes\(/);
  assert.match(semanticNavigator, /const candidates = visibleNodes.length \? visibleNodes : lifeMapFilterVisibleNodes\(nodes\)/);
  assert.match(semanticNavigator, /const selected = nodes.find\(\(node\) => node.id === selectedId && !lifeMapNodeIsHidden\(node\)\)/);
  assert.match(semanticNavigator, /if \(lifeMapNodeIsHidden\(node\) \|\| node.locked\) return/);
});

test('canonical fallback requires a complete unordered owner event query, including undated legacy hidden events', () => {
  assert.match(source, /const coverageQuery = query\(collection\(getFirebaseDb\(\), "users", owner, "lifeMapEvents"\), limit\(240\)\)/)
  assert.match(source, /lifeMapEventCoverageComplete\(snapshot\.docs\.length, snapshot\.metadata\.fromCache\)/)
  assert.match(source, /unorderedEventCoverage\.authority !== authorityKey \|\| !unorderedEventCoverage\.complete/)
  assert.match(source, /const hiddenEventMemoryIds = new Set\(lifeMapHiddenEventMemoryIds\(currentNodes\)\)/)
  assert.match(source, /for \(const id of unorderedEventCoverage\.hiddenIds\) hiddenEventMemoryIds\.add\(id\)/)
})

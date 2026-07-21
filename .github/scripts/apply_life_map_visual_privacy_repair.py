from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one regex match, found {count}")
    return updated


adaptive_path = Path("urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx")
events_path = Path("urai-tier1/src/components/lifemap/useLifeMapEvents.ts")
canonical_path = Path("urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx")
scene_test_path = Path("urai-tier1/tests/lifemap-scene-behavior.test.mjs")
data_test_path = Path("urai-tier1/tests/lifemap-data-boundary.test.mjs")
trust_test_path = Path("urai-tier1/tests/lifemap-trust-loop.test.mjs")
proof_path = Path("scripts/capture-continuous-spatial-proof.mjs")
proof_test_path = Path("urai-tier1/tests/continuous-spatial-restoration-contract.test.mjs")

adaptive = adaptive_path.read_text()
adaptive = replace_once(
    adaptive,
    '  const profile = useAdaptiveSpatialQuality();\n  const { nodes, loading, error, usingSeedData } = useLifeMapEvents();',
    '  const profile = useAdaptiveSpatialQuality();\n  const explicitDemoRequested = params.get("demo") === "1";\n  const { nodes, loading, error, usingSeedData, sourceMode } = useLifeMapEvents(explicitDemoRequested ? "demo-user" : undefined);',
    "explicit demo source selection",
)

identity_pair = '    next.set("manifestId", manifestId);\n    next.set("node", node.id);'
if adaptive.count(identity_pair) != 2:
    raise SystemExit(f"demo identity propagation: expected two matches, found {adaptive.count(identity_pair)}")
adaptive = adaptive.replace(
    identity_pair,
    '    next.set("manifestId", manifestId);\n    if (explicitDemoRequested) next.set("demo", "1");\n    next.set("node", node.id);',
)
adaptive = replace_once(
    adaptive,
    '    if (manifestId) next.set("manifestId", manifestId);\n    next.set("overview", "1");',
    '    if (manifestId) next.set("manifestId", manifestId);\n    if (explicitDemoRequested) next.set("demo", "1");\n    next.set("overview", "1");',
    "overview demo propagation",
)
adaptive = replace_once(adaptive, '  }, [cameraIntent.position, manifestId]);', '  }, [cameraIntent.position, explicitDemoRequested, manifestId]);', "identity dependencies")
adaptive = replace_once(adaptive, '  }, [manifestId, router]);', '  }, [explicitDemoRequested, manifestId, router]);', "selection dependencies")
adaptive = replace_once(adaptive, '  }, [manifestId, queryNodeId, router, selectedId]);', '  }, [explicitDemoRequested, manifestId, queryNodeId, router, selectedId]);', "overview dependencies")

persistence = '''  useEffect(() => {
    try {
      window.localStorage.setItem(LIFE_MAP_STATE_KEY, JSON.stringify({ selectedId, cameraIntent }));
    } catch {
      // State restoration is best-effort when storage is unavailable.
    }
  }, [cameraIntent, selectedId]);'''
truthful_state = persistence + '''

  useEffect(() => {
    if (loading || selectedNode || nodes.length > 0) return;
    if (sourceMode === "signed-out") {
      setNarratorText("Sign in to open your private memories. The visible universe contains no personal data.");
      return;
    }
    if (sourceMode === "empty") {
      setNarratorText("Your private constellation is ready for its first memory.");
      return;
    }
    if (sourceMode === "unavailable") {
      setNarratorText("The visual universe is available while the private memory service rests safely.");
      return;
    }
    setNarratorText("The visual universe is available, but private memory data could not be opened.");
  }, [loading, nodes.length, selectedNode, sourceMode]);'''
adaptive = replace_once(adaptive, persistence, truthful_state, "truthful empty state narration")

weather_start = adaptive.index("function EmotionalWeather")
weather_end = adaptive.index("\nfunction MemoryPath", weather_start)
weather_repair = '''function createSoftWeatherTexture() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const glow = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  glow.addColorStop(0, "rgba(255,255,255,.82)");
  glow.addColorStop(0.2, "rgba(255,255,255,.42)");
  glow.addColorStop(0.56, "rgba(255,255,255,.12)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function EmotionalWeather({ profile }: { profile: SpatialQualityProfile }) {
  const group = useRef<THREE.Group>(null);
  const texture = useMemo(() => createSoftWeatherTexture(), []);
  const veils = useMemo(() => [
    { position: [-3.6, 1.1, -1.1] as [number, number, number], scale: [6.8, 3.2, 1] as [number, number, number], color: "#4fdfff", opacity: 0.12 },
    { position: [-0.8, -0.2, -2.3] as [number, number, number], scale: [5.4, 2.5, 1] as [number, number, number], color: "#7adfff", opacity: 0.075 },
    { position: [3.7, -0.35, -2.1] as [number, number, number], scale: [7.2, 3.4, 1] as [number, number, number], color: "#b177ff", opacity: 0.115 },
    { position: [1.4, 2.5, -4.4] as [number, number, number], scale: [5.8, 2.2, 1] as [number, number, number], color: "#fff1bd", opacity: 0.055 },
    { position: [0.2, -2.2, -3.7] as [number, number, number], scale: [8.4, 2.7, 1] as [number, number, number], color: "#5aaeff", opacity: 0.045 },
  ], []);

  useEffect(() => () => texture?.dispose(), [texture]);

  useFrame(({ clock }) => {
    if (!group.current || profile.reducedMotion || !profile.documentVisible) return;
    group.current.position.x = Math.sin(clock.elapsedTime * 0.035) * 0.8;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.022) * 0.04;
  });

  return (
    <group ref={group} position={[0, 0.3, -8]} name="life-map-emotional-weather">
      {veils.map((veil, index) => (
        <sprite key={index} position={veil.position} scale={veil.scale} name="life-map-soft-weather-veil">
          <spriteMaterial
            map={texture || undefined}
            color={veil.color}
            transparent
            opacity={texture ? veil.opacity * (profile.tier === "low" ? 0.72 : 1) : 0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}
'''
adaptive = adaptive[:weather_start] + weather_repair + adaptive[weather_end:]
adaptive = replace_once(
    adaptive,
    '      data-life-map-source={usingSeedData ? "explicit-sample" : "private"}',
    '      data-life-map-source={sourceMode}',
    "source-mode disclosure",
)
realm_marker = '  const semanticRecoveryVisible = webglState === "lost" || webglState === "recovering" || webglState === "failed";'
realm = realm_marker + '''
  const realmTitle = selectedNode
    ? selectedNode.title
    : loading
      ? "Opening the constellation"
      : sourceMode === "explicit-demo"
        ? "Protected sample field"
        : sourceMode === "signed-out"
          ? "Private constellation locked"
          : sourceMode === "empty"
            ? "Private constellation ready"
            : sourceMode === "unavailable"
              ? "Private constellation resting"
              : sourceMode === "error"
                ? "Private constellation unavailable"
                : "Private constellation";'''
adaptive = replace_once(adaptive, realm_marker, realm, "truthful realm title")
adaptive = replace_once(
    adaptive,
    '        <p>{selectedNode ? selectedNode.title : loading ? "Opening the constellation" : error ? usingSeedData ? "Protected sample field" : "Private constellation unavailable" : "Private constellation"}</p>',
    '        <p>{realmTitle}</p>',
    "whisper title",
)
adaptive_path.write_text(adaptive)

events = events_path.read_text()
events = replace_regex_once(
    events,
    r'function explicitDemoEnabled\(explicitUserId\?: string\) \{.*?\n\}',
    'function explicitDemoEnabled(explicitUserId?: string) {\n  return explicitUserId === "demo-user";\n}',
    "strict explicit demo boundary",
)
events_path.write_text(events)

canonical = canonical_path.read_text()
canonical = canonical.replace('const DEMO_MODE_KEY = "urai:lifeMapDemoMode";\n', "")
old_effect = '''  useEffect(() => {
    const current = new URLSearchParams(query);
    const explicitDemo = current.get("demo") === "1";
    try {
      const storedUserId = window.localStorage.getItem(USER_ID_KEY)?.trim();
      const retainedDemo = window.localStorage.getItem(DEMO_MODE_KEY) === "true";
      const demoContinuation = retainedDemo && current.get("manifestId") === DEMO_MANIFEST_ID;
      if (explicitDemo || demoContinuation) {
        window.localStorage.setItem(DEMO_MODE_KEY, "true");
        setMode("explicit-demo");
        return;
      }
      setMode(storedUserId ? "private" : "signed-out");
    } catch {
      setMode(explicitDemo ? "explicit-demo" : "signed-out");
    }
  }, [query]);'''
new_effect = '''  useEffect(() => {
    const current = new URLSearchParams(query);
    if (current.get("demo") === "1") {
      setMode("explicit-demo");
      return;
    }
    try {
      const storedUserId = window.localStorage.getItem(USER_ID_KEY)?.trim();
      setMode(storedUserId ? "private" : "signed-out");
    } catch {
      setMode("signed-out");
    }
  }, [query]);'''
canonical = replace_once(canonical, old_effect, new_effect, "canonical access effect")
old_open = '''  const openDemo = () => {
    try {
      window.localStorage.setItem(DEMO_MODE_KEY, "true");
    } catch {
      // Query identity still explicitly discloses the sample when storage is unavailable.
    }
    const next = new URLSearchParams(query);'''
canonical = replace_once(canonical, old_open, '  const openDemo = () => {\n    const next = new URLSearchParams(query);', "canonical demo action")
canonical = replace_once(
    canonical,
    'export default function SpatialLifeMapCanonical() {\n  return <LifeMapAccessGate />;\n}',
    'export default function SpatialLifeMapCanonical() {\n  return (\n    <Suspense fallback={<LifeMapLoading label="Checking the private threshold" />}>\n      <LifeMapAccessGate />\n    </Suspense>\n  );\n}',
    "outer Suspense ownership",
)
canonical_path.write_text(canonical)

proof = proof_path.read_text()
demo_route_anchor = '''  {
    id: 'life-map',
    path: '/life-map/',
    ready: '[data-testid="urai-true-3d-life-map"] canvas','''
signed_and_demo = '''  {
    id: 'life-map-signed-out',
    path: '/life-map/',
    ready: '[data-testid="urai-life-map-signed-out-threshold"]',
    waitForScene: waitForStableAnimationFrames,
    verify: async (page) => {
      const threshold = page.locator('[data-testid="urai-life-map-signed-out-threshold"]')
      const thresholdVisible = await threshold.first().isVisible()
      const privateCanvasAbsent = await page.locator('[data-testid="urai-true-3d-life-map"] canvas').count() === 0
      const noPrivateMount = await threshold.first().getAttribute('data-private-memory-mounted') === 'false'
      const privacyDisclosureVisible = await page.getByText('Signed out · no personal data displayed').isVisible()
      const disclosedSampleActionVisible = await page.getByRole('button', { name: 'Open disclosed sample' }).isVisible()
      const returnHomeActionVisible = await page.getByRole('button', { name: 'Return Home' }).isVisible()
      return { thresholdVisible, privateCanvasAbsent, noPrivateMount, privacyDisclosureVisible, disclosedSampleActionVisible, returnHomeActionVisible }
    },
  },
  {
    id: 'life-map',
    path: '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1',
    ready: '[data-testid="urai-true-3d-life-map"] canvas','''
proof = replace_once(proof, demo_route_anchor, signed_and_demo, "signed-out and demo visual proof routes")
proof = replace_once(
    proof,
    "    path: '/life-map/?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset',",
    "    path: '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset',",
    "selected visual proof demo identity",
)
proof_path.write_text(proof)

scene_tests = scene_test_path.read_text()
scene_tests = replace_once(
    scene_tests,
    "  assert.ok(source.includes('useLifeMapEvents()'), 'Life Map must load private or explicit sample-backed memory nodes.')",
    "  assert.ok(source.includes('useLifeMapEvents(explicitDemoRequested ? \\\"demo-user\\\" : undefined)'), 'Life Map must load sample nodes only from explicit demo query identity.')",
    "scene source assertion",
)
scene_tests = replace_once(
    scene_tests,
    "  assert.ok(source.includes('data-life-map-source={usingSeedData ? \\\"explicit-sample\\\" : \\\"private\\\"}'))",
    "  assert.ok(source.includes('data-life-map-source={sourceMode}'))",
    "scene source-mode assertion",
)
scene_tests = replace_once(
    scene_tests,
    "  assert.ok(source.includes('error ? usingSeedData ? \\\"Protected sample field\\\" : \\\"Private constellation unavailable\\\"'), 'Unavailable private data must never be described as sample data.')",
    "  assert.ok(source.includes('sourceMode === \\\"signed-out\\\"'), 'Signed-out state must remain distinct from disclosed sample data.')\n  assert.ok(source.includes('sourceMode === \\\"unavailable\\\"'), 'Unavailable service state must remain distinct from signed-out and sample data.')",
    "scene private-state truth assertion",
)
visual_anchor = '''  assert.doesNotMatch(nexus, /#5ce8ff|#90f5ff/)
  assert.match(source, /const textureKey = texture\?\.uuid/)'''
visual_replacement = '''  assert.doesNotMatch(nexus, /#5ce8ff|#90f5ff/)
  const weatherStart = source.indexOf('function createSoftWeatherTexture')
  const weatherEnd = source.indexOf('function MemoryPath', weatherStart)
  const weather = source.slice(weatherStart, weatherEnd)
  assert.match(weather, /new THREE\.CanvasTexture/)
  assert.match(weather, /life-map-soft-weather-veil/)
  assert.match(weather, /spriteMaterial/)
  assert.doesNotMatch(weather, /planeGeometry|boxGeometry/)
  assert.match(source, /const textureKey = texture\?\.uuid/)'''
scene_tests = replace_once(scene_tests, visual_anchor, visual_replacement, "weather visual regression")
overview_anchor = "test('LifeMap Overview preserves URL identity without restoring selected semantic controls', () => {"
demo_test = '''test('LifeMap explicit demo identity survives selection, Focus, Replay, and Overview navigation', () => {
  assert.ok(source.includes('const explicitDemoRequested = params.get("demo") === "1"'))
  assert.ok(source.includes('useLifeMapEvents(explicitDemoRequested ? "demo-user" : undefined)'))
  assert.ok(source.includes('if (explicitDemoRequested) next.set("demo", "1")'))
  assert.match(source, /cameraIntent\.position, explicitDemoRequested, manifestId/)
  assert.match(source, /explicitDemoRequested, manifestId, queryNodeId, router, selectedId/)
})

test('LifeMap signed-out threshold owns privacy without mounting the private canvas', () => {
  assert.ok(canonical.includes('data-testid="urai-life-map-signed-out-threshold"'))
  assert.ok(canonical.includes('data-private-memory-mounted="false"'))
  assert.ok(canonical.includes('Open disclosed sample'))
  assert.ok(canonical.includes('next.set("demo", "1")'))
  assert.ok(canonical.includes('<Suspense fallback={<LifeMapLoading label="Checking the private threshold" />}'))
})

''' + overview_anchor
scene_tests = replace_once(scene_tests, overview_anchor, demo_test, "demo continuity and signed-out tests")
scene_test_path.write_text(scene_tests)

data_tests = data_test_path.read_text()
data_tests = replace_once(
    data_tests,
    '''  assert.match(source, /NEXT_PUBLIC_URAI_EXPLICIT_DEMO/)
  assert.match(source, /urai:lifeMapDemoMode/)
  assert.match(source, /explicitUserId === "demo-user"/)''',
    '''  assert.match(source, /return explicitUserId === "demo-user"/)
  assert.doesNotMatch(source, /NEXT_PUBLIC_URAI_EXPLICIT_DEMO/)
  assert.doesNotMatch(source, /urai:lifeMapDemoMode/)''',
    "strict demo data-boundary test",
)
data_test_path.write_text(data_tests)

trust_tests = trust_test_path.read_text()
trust_tests = replace_once(
    trust_tests,
    '  assert.ok(sceneSource.includes(\'data-life-map-source={usingSeedData ? "explicit-sample" : "private"}\'))',
    '  assert.ok(sceneSource.includes(\'data-life-map-source={sourceMode}\'))',
    "trust source-mode assertion",
)
trust_test_path.write_text(trust_tests)

proof_tests = proof_test_path.read_text()
proof_tests = replace_once(
    proof_tests,
    "    'navigationPillsStyled', 'activeGroundLinkVisible', 'navigationRailContained', 'life-map-selected',",
    "    'navigationPillsStyled', 'activeGroundLinkVisible', 'navigationRailContained', 'life-map-signed-out', 'life-map-selected',",
    "proof signed-out marker",
)
proof_assert_anchor = "  assert.doesNotMatch(proof, /waitForTimeout/)"
proof_assertions = '''  assert.match(proof, /path: '\/life-map\/\?demo=1&manifestId=replay-recovery-thread&overview=1'/)
  assert.match(proof, /path: '\/life-map\/\?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset'/)
  assert.match(proof, /data-private-memory-mounted/)
  assert.match(proof, /privateCanvasAbsent/)
  assert.match(proof, /Open disclosed sample/)

''' + proof_assert_anchor
proof_tests = replace_once(proof_tests, proof_assert_anchor, proof_assertions, "proof URL and privacy assertions")
proof_test_path.write_text(proof_tests)

print("Life Map visual/privacy patch applied successfully")

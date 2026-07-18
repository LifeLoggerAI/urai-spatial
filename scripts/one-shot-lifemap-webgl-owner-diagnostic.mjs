import fs from 'node:fs'

const path = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
let source = fs.readFileSync(path, 'utf8')

function replaceOnce(before, after) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found: ${before.slice(0, 100)}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected source duplicated: ${before.slice(0, 100)}`)
  source = source.slice(0, first) + after + source.slice(first + before.length)
}

replaceOnce(
`function LifeMapWorld({ nodes, selectedNode, profile, cameraIntent, onSelect, onEnterFocus, onEnterReplay, onOverview }: {
  nodes: LifeMapNode[];
  selectedNode: LifeMapNode | null;
  profile: SpatialQualityProfile;
  cameraIntent: CameraIntent;
  onSelect: (node: LifeMapNode) => void;
} & MemoryPortalHandlers) {`,
`function LifeMapWorld({ nodes, selectedNode, profile, cameraIntent, debugScene, onSelect, onEnterFocus, onEnterReplay, onOverview }: {
  nodes: LifeMapNode[];
  selectedNode: LifeMapNode | null;
  profile: SpatialQualityProfile;
  cameraIntent: CameraIntent;
  debugScene: string;
  onSelect: (node: LifeMapNode) => void;
} & MemoryPortalHandlers) {`,
)

replaceOnce(
`      <EmotionalWeather profile={profile} />
      <ContinuityNexus profile={profile} />
      <GoalMonuments />
      <PrivateVaults />
      <ChapterRegions nodes={nodes} selectedId={selectedNode?.id || null} />`,
`      {debugScene !== "minimal" && debugScene !== "no-weather" ? <EmotionalWeather profile={profile} /> : null}
      {debugScene !== "minimal" && debugScene !== "no-nexus" ? <ContinuityNexus profile={profile} /> : null}
      {debugScene !== "minimal" && debugScene !== "no-goals" ? <GoalMonuments /> : null}
      {debugScene !== "minimal" && debugScene !== "no-vaults" ? <PrivateVaults /> : null}
      {debugScene !== "minimal" && debugScene !== "no-chapters" ? <ChapterRegions nodes={nodes} selectedId={selectedNode?.id || null} /> : null}`,
)

replaceOnce(
`      <group rotation={[-0.11, 0.05, -0.02]} position={[0, -0.05, -0.4]} name="life-map-memory-field">
        {edges.map(({ from, to, key }) => (
          <MemoryPath
            key={key}
            from={from}
            to={to}
            active={!selectedNode || related.has(from.id) || related.has(to.id)}
            profile={profile}
          />
        ))}
        {nodes.map((node) => (
          <MemoryArtifact
            key={node.id}
            node={node}
            selected={selectedNode?.id === node.id}
            related={related.has(node.id)}
            overview={!selectedNode}
            profile={profile}
            onSelect={onSelect}
            onEnterFocus={onEnterFocus}
            onEnterReplay={onEnterReplay}
            onOverview={onOverview}
          />
        ))}
      </group>

      <ForegroundDepthCrossings profile={profile} />`,
`      {debugScene !== "minimal" && debugScene !== "no-memory" ? (
        <group rotation={[-0.11, 0.05, -0.02]} position={[0, -0.05, -0.4]} name="life-map-memory-field">
          {edges.map(({ from, to, key }) => (
            <MemoryPath
              key={key}
              from={from}
              to={to}
              active={!selectedNode || related.has(from.id) || related.has(to.id)}
              profile={profile}
            />
          ))}
          {nodes.map((node) => (
            <MemoryArtifact
              key={node.id}
              node={node}
              selected={selectedNode?.id === node.id}
              related={related.has(node.id)}
              overview={!selectedNode}
              profile={profile}
              onSelect={onSelect}
              onEnterFocus={onEnterFocus}
              onEnterReplay={onEnterReplay}
              onOverview={onOverview}
            />
          ))}
        </group>
      ) : null}

      {debugScene !== "minimal" && debugScene !== "no-foreground" ? <ForegroundDepthCrossings profile={profile} /> : null}`,
)

replaceOnce(
`      {profile.postprocessing && !profile.reducedMotion ? (`,
`      {debugScene !== "minimal" && debugScene !== "no-post" && profile.postprocessing && !profile.reducedMotion ? (`,
)

replaceOnce(
`  const params = useSearchParams();
  const profile = useAdaptiveSpatialQuality();`,
`  const params = useSearchParams();
  const debugScene = safeToken(params.get("debugScene"));
  const profile = useAdaptiveSpatialQuality();`,
)

replaceOnce(
`          cameraIntent={cameraIntent}
          onSelect={selectNode}`,
`          cameraIntent={cameraIntent}
          debugScene={debugScene}
          onSelect={selectNode}`,
)

fs.writeFileSync(path, source)

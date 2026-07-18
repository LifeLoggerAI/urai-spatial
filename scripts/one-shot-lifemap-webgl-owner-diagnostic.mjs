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
`      <fog attach="fog" args={["#01030a", selectedNode ? 5.5 : 8, selectedNode ? 30 : 44]} />`,
`      {debugScene !== "blank" && debugScene !== "no-fog" ? <fog attach="fog" args={["#01030a", selectedNode ? 5.5 : 8, selectedNode ? 30 : 44]} /> : null}`,
)

replaceOnce(
`      <Stars radius={120} depth={92} count={profile.tier === "high" ? 5200 : profile.tier === "medium" ? 3200 : 1600} factor={4.2} saturation={0.42} fade speed={profile.reducedMotion ? 0 : 0.14} />`,
`      {debugScene !== "blank" && debugScene !== "no-stars" ? <Stars radius={120} depth={92} count={profile.tier === "high" ? 5200 : profile.tier === "medium" ? 3200 : 1600} factor={4.2} saturation={0.42} fade speed={profile.reducedMotion ? 0 : 0.14} /> : null}`,
)

replaceOnce(
`      <ParallaxLayer profile={profile} countMultiplier={1.1} radius={9} depth={7} opacity={0.62} size={0.034} seed={1} />
      <ParallaxLayer profile={profile} countMultiplier={1.65} radius={17} depth={19} opacity={0.34} size={0.052} seed={3} />
      <ParallaxLayer profile={profile} countMultiplier={2.1} radius={31} depth={42} opacity={0.2} size={0.075} seed={5} />`,
`      {debugScene !== "blank" && debugScene !== "no-parallax" ? (
        <>
          <ParallaxLayer profile={profile} countMultiplier={1.1} radius={9} depth={7} opacity={0.62} size={0.034} seed={1} />
          <ParallaxLayer profile={profile} countMultiplier={1.65} radius={17} depth={19} opacity={0.34} size={0.052} seed={3} />
          <ParallaxLayer profile={profile} countMultiplier={2.1} radius={31} depth={42} opacity={0.2} size={0.075} seed={5} />
        </>
      ) : null}`,
)

replaceOnce(
`      <EmotionalWeather profile={profile} />
      <ContinuityNexus profile={profile} />
      <GoalMonuments />
      <PrivateVaults />
      <ChapterRegions nodes={nodes} selectedId={selectedNode?.id || null} />`,
`      {debugScene !== "minimal" && debugScene !== "blank" && debugScene !== "no-weather" ? <EmotionalWeather profile={profile} /> : null}
      {debugScene !== "minimal" && debugScene !== "blank" && debugScene !== "no-nexus" ? <ContinuityNexus profile={profile} /> : null}
      {debugScene !== "minimal" && debugScene !== "blank" && debugScene !== "no-goals" ? <GoalMonuments /> : null}
      {debugScene !== "minimal" && debugScene !== "blank" && debugScene !== "no-vaults" ? <PrivateVaults /> : null}
      {debugScene !== "minimal" && debugScene !== "blank" && debugScene !== "no-chapters" ? <ChapterRegions nodes={nodes} selectedId={selectedNode?.id || null} /> : null}`,
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
`      {debugScene !== "minimal" && debugScene !== "blank" && debugScene !== "no-memory" ? (
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

      {debugScene !== "minimal" && debugScene !== "blank" && debugScene !== "no-foreground" ? <ForegroundDepthCrossings profile={profile} /> : null}`,
)

replaceOnce(
`      {profile.postprocessing && !profile.reducedMotion ? (`,
`      {debugScene !== "minimal" && debugScene !== "blank" && debugScene !== "no-post" && profile.postprocessing && !profile.reducedMotion ? (`,
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

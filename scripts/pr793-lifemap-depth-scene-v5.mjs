import fs from 'node:fs'

const path = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
const read = () => fs.readFileSync(path, 'utf8')
const write = (value) => fs.writeFileSync(path, value)

function replaceOnce(before, after) {
  const source = read()
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found: ${before.slice(0, 80)}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected source duplicated: ${before.slice(0, 80)}`)
  write(source.slice(0, first) + after + source.slice(first + before.length))
}

function replaceBetween(startMarker, endMarker, replacement) {
  const source = read()
  const start = source.indexOf(startMarker)
  if (start < 0) throw new Error(`Start marker not found: ${startMarker}`)
  const end = source.indexOf(endMarker, start)
  if (end < 0) throw new Error(`End marker not found: ${endMarker}`)
  if (source.indexOf(startMarker, start + startMarker.length) >= 0) throw new Error(`Start marker duplicated: ${startMarker}`)
  write(source.slice(0, start) + replacement + source.slice(end))
}

replaceBetween('function GoalMonuments() {', '\n\nfunction PrivateVaults()', `function GoalMonuments() {
  const beacons = useMemo(() => [
    { color: "#b7efff", points: [[-7.4, -1.8, -19.5], [-7, 0.2, -19.9], [-7.55, 2.1, -20.4], [-6.9, 4.4, -21.1]] },
    { color: "#fff0b8", points: [[6.8, -2, -22.5], [6.3, 0.7, -22.8], [7.1, 3.2, -23.4], [6.6, 6.1, -24.1]] },
    { color: "#c7b7ff", points: [[2.6, -2.4, -26.5], [2.1, -0.2, -26.9], [2.9, 2, -27.5], [2.4, 4.8, -28.2]] },
  ].map((item) => ({
    ...item,
    curve: new THREE.CatmullRomCurve3(item.points.map((point) => new THREE.Vector3(...point as [number, number, number]))),
    crown: item.points.at(-1) as [number, number, number],
  })), []);

  return (
    <group name="life-map-far-goal-beacons">
      {beacons.map((beacon, index) => (
        <group key={beacon.color}>
          <mesh name="life-map-goal-thread">
            <tubeGeometry args={[beacon.curve, 64, index === 1 ? 0.045 : 0.03, 8, false]} />
            <meshBasicMaterial color={beacon.color} transparent opacity={index === 1 ? 0.28 : 0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh position={beacon.crown} name="life-map-goal-crown">
            <sphereGeometry args={[index === 1 ? 0.14 : 0.1, 20, 20]} />
            <meshBasicMaterial color={beacon.color} transparent opacity={0.78} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <pointLight position={beacon.crown} color={beacon.color} intensity={index === 1 ? 0.7 : 0.35} distance={5.5} />
        </group>
      ))}
    </group>
  );
}\n\n`)

replaceBetween('function PrivateVaults() {', '\n\nfunction EmotionalWeather', `function PrivateVaults() {
  const vaults = [
    { position: [-5.6, -2.4, -7.2] as [number, number, number], rotation: [0.08, 0.44, -0.06] as [number, number, number], color: "#8ddfff", radius: 0.94 },
    { position: [5.7, -2.05, -9.2] as [number, number, number], rotation: [-0.04, -0.38, 0.04] as [number, number, number], color: "#c3a2ff", radius: 0.72 },
  ];

  return (
    <group name="life-map-private-vaults">
      {vaults.map((vault, index) => (
        <group key={vault.color} position={vault.position} rotation={vault.rotation} name="life-map-private-vault-arc">
          <mesh rotation={[Math.PI / 2, 0, index ? -0.22 : 0.18]}>
            <torusGeometry args={[vault.radius, 0.025, 10, 88, Math.PI * 1.62]} />
            <meshBasicMaterial color={vault.color} transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0.18, index ? 0.34 : -0.28]} scale={0.72}>
            <torusGeometry args={[vault.radius, 0.014, 8, 72, Math.PI * 1.28]} />
            <meshBasicMaterial color="#e8fbff" transparent opacity={0.08} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color={vault.color} transparent opacity={0.52} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </group>
  );
}\n\n`)

replaceBetween('function EmotionalWeather({ profile }: { profile: SpatialQualityProfile }) {', '\n\nfunction MemoryPath', `function EmotionalWeather({ profile }: { profile: SpatialQualityProfile }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const clouds = [
      [-3.4, 1.1, -8.8, "#4fdfff", 4.2, 1.8, 2.4],
      [3.5, -0.4, -9.8, "#b177ff", 4.8, 2, 2.8],
      [0.8, 2.4, -12.2, "#fff1bd", 3.6, 1.4, 2.2],
    ] as const;
    const perCloud = profile.tier === "high" ? 180 : profile.tier === "medium" ? 120 : 72;
    const positions = new Float32Array(clouds.length * perCloud * 3);
    const colors = new Float32Array(clouds.length * perCloud * 3);
    clouds.forEach((cloud, cloudIndex) => {
      const color = new THREE.Color(cloud[3]);
      for (let index = 0; index < perCloud; index += 1) {
        const offset = (cloudIndex * perCloud + index) * 3;
        const angle = index * 2.399963229728653 + cloudIndex * 0.82;
        const radial = Math.sqrt((index + 1) / perCloud);
        const light = 0.45 + (index % 7) * 0.045;
        positions[offset] = cloud[0] + Math.cos(angle) * radial * cloud[4];
        positions[offset + 1] = cloud[1] + Math.sin(angle * 1.37) * radial * cloud[5];
        positions[offset + 2] = cloud[2] + Math.cos(angle * 0.73) * radial * cloud[6];
        colors[offset] = color.r * light;
        colors[offset + 1] = color.g * light;
        colors[offset + 2] = color.b * light;
      }
    });
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    next.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return next;
  }, [profile.tier]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }) => {
    if (!group.current || profile.reducedMotion || !profile.documentVisible) return;
    group.current.position.x = Math.sin(clock.elapsedTime * 0.035) * 0.34;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.022) * 0.018;
  });

  return (
    <group ref={group} name="life-map-emotional-weather">
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial size={profile.tier === "high" ? 0.17 : 0.13} vertexColors transparent opacity={0.18} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <pointLight position={[-3.2, 1.3, -8.4]} color="#4fdfff" intensity={0.34} distance={7} />
      <pointLight position={[3.4, -0.2, -9.4]} color="#b177ff" intensity={0.28} distance={7} />
    </group>
  );
}\n\n`)

replaceBetween('function ForegroundDepthCrossings({ profile }: { profile: SpatialQualityProfile }) {', '\n\nfunction LifeMapWorld', `function ForegroundDepthCrossings({ profile }: { profile: SpatialQualityProfile }) {
  const group = useRef<THREE.Group>(null);
  const crossings = useMemo(() => [
    { color: "#79dfff", curve: new THREE.CatmullRomCurve3([[-8.4, -4.1, 4.2], [-7.9, -1.4, 3.2], [-8.5, 1.7, 2.2], [-7.6, 4.6, 1.1]].map((point) => new THREE.Vector3(...point as [number, number, number]))) },
    { color: "#b68cff", curve: new THREE.CatmullRomCurve3([[8.6, 4.5, 3.4], [7.9, 2, 2.5], [8.5, -0.7, 1.6], [7.8, -3.8, 0.6]].map((point) => new THREE.Vector3(...point as [number, number, number]))) },
  ], []);

  useFrame(({ clock }) => {
    if (!group.current || profile.reducedMotion || !profile.documentVisible) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.04) * 0.018;
  });

  return (
    <group ref={group} name="life-map-near-depth-crossings">
      {crossings.map((crossing) => (
        <mesh key={crossing.color} name="life-map-near-crossing-thread">
          <tubeGeometry args={[crossing.curve, 52, 0.018, 7, false]} />
          <meshBasicMaterial color={crossing.color} transparent opacity={0.09} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}\n\n`)

replaceOnce(
  '  const { nodes, loading, error, usingSeedData } = useLifeMapEvents();',
  '  const requestedDemo = params.get("demo") === "1";\n  const { nodes, loading, error, usingSeedData } = useLifeMapEvents(requestedDemo ? "demo-user" : undefined);',
)

replaceOnce(
  `  const selectNode = useCallback((node: LifeMapNode) => {\n    setSelectedId(node.id);`,
  `  const selectNode = useCallback((node: LifeMapNode) => {\n    document.querySelectorAll<HTMLDetailsElement>(".life-map-accessibility-menu").forEach((controls) => {\n      controls.open = false;\n      controls.removeAttribute("open");\n    });\n    setSelectedId(node.id);`,
)

replaceOnce(
  `  }, [manifestId, router]);\n\n  const recenter = useCallback(() => {`,
  `  }, [manifestId, router]);\n\n  useEffect(() => {\n    if (!selectedId) return;\n    const frame = window.requestAnimationFrame(() => {\n      document.querySelectorAll<HTMLDetailsElement>(".life-map-accessibility-menu").forEach((controls) => {\n        controls.open = false;\n        controls.removeAttribute("open");\n      });\n    });\n    return () => window.cancelAnimationFrame(frame);\n  }, [selectedId]);\n\n  const recenter = useCallback(() => {`,
)

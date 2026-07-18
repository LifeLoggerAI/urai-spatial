import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const write = (path, value) => fs.writeFileSync(path, value)
function replaceOnce(path, before, after) {
  const source = read(path)
  const index = source.indexOf(before)
  if (index < 0) throw new Error(`Expected source not found in ${path}`)
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Expected source duplicated in ${path}`)
  write(path, source.slice(0, index) + after + source.slice(index + before.length))
}

const scene = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
replaceOnce(scene,
`  const aura = node.aura || "#8adfff";
  const deep = ctx.createLinearGradient(80, 40, 688, 728);
  deep.addColorStop(0, "rgba(230,250,255,.96)");
  deep.addColorStop(0.08, hexToRgba(aura, 0.92));
  deep.addColorStop(0.46, "rgba(8,20,48,.98)");`,
`  const aura = node.aura || "#8adfff";
  const compact = resolution < 192;
  const deep = ctx.createLinearGradient(80, 40, 688, 728);
  deep.addColorStop(0, compact ? "rgba(1,5,16,.98)" : "rgba(230,250,255,.96)");
  deep.addColorStop(0.08, hexToRgba(aura, compact ? 0.26 : 0.92));
  deep.addColorStop(0.46, compact ? "rgba(3,12,28,.99)" : "rgba(8,20,48,.98)");`)

replaceOnce(scene,
`    ctx.fillStyle = index % 4 === 0 ? "rgba(255,255,255,.78)" : hexToRgba(aura, 0.48);`,
`    ctx.fillStyle = index % 4 === 0 ? compact ? "rgba(255,255,255,.38)" : "rgba(255,255,255,.78)" : hexToRgba(aura, compact ? 0.32 : 0.48);`)

replaceOnce(scene,
`  ctx.fillStyle = "rgba(235,250,255,.72)";
  ctx.font = "700 22px system-ui, sans-serif";
  ctx.fillText(lifeMapTypeLabels[node.type].toUpperCase(), 108, 552);

  ctx.fillStyle = "rgba(255,255,255,.98)";
  ctx.font = "800 40px system-ui, sans-serif";
  const title = node.title.length > 28 ? \`${'${node.title.slice(0, 26)}'}…\` : node.title;
  ctx.fillText(title, 108, 608);

  ctx.fillStyle = "rgba(219,241,255,.72)";
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText(node.dateLabel, 108, 648);`,
`  if (!compact) {
    ctx.fillStyle = "rgba(235,250,255,.72)";
    ctx.font = "700 22px system-ui, sans-serif";
    ctx.fillText(lifeMapTypeLabels[node.type].toUpperCase(), 108, 552);

    ctx.fillStyle = "rgba(255,255,255,.98)";
    ctx.font = "800 40px system-ui, sans-serif";
    const title = node.title.length > 28 ? \`${'${node.title.slice(0, 26)}'}…\` : node.title;
    ctx.fillText(title, 108, 608);

    ctx.fillStyle = "rgba(219,241,255,.72)";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillText(node.dateLabel, 108, 648);
  }`)

replaceOnce(scene,
`  ctx.strokeStyle = "rgba(235,252,255,.42)";`,
`  ctx.strokeStyle = compact ? hexToRgba(aura, 0.58) : "rgba(235,252,255,.42)";`)
replaceOnce(scene,
`      group.current.scale.setScalar(selected ? breath * 1.26 : related ? breath : breath * 0.78);`,
`      group.current.scale.setScalar(selected ? breath * 1.26 : overview ? breath * 0.72 : related ? breath : breath * 0.72);`)
replaceOnce(scene,
`    if (glass.current) glass.current.opacity = selected ? 0.34 : related ? 0.16 : 0.06;`,
`    if (glass.current) glass.current.opacity = selected ? 0.34 : overview ? 0.06 : related ? 0.16 : 0.05;`)
replaceOnce(scene,
`        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 1 : related ? 0.88 : 0.42} toneMapped={false} />`,
`        <meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 1 : overview ? 0.68 : related ? 0.88 : 0.42} toneMapped={false} />`)

const contract = 'urai-tier1/tests/lifemap-scene-behavior.test.mjs'
replaceOnce(contract,
`  assert.ok(source.includes('function createMemorySurface(node: LifeMapNode, resolution: number)'), 'Memory surfaces must accept an explicit allocation size.')`,
`  assert.ok(source.includes('function createMemorySurface(node: LifeMapNode, resolution: number)'), 'Memory surfaces must accept an explicit allocation size.')
  assert.ok(source.includes('const compact = resolution < 192'), 'Low-resolution memories must use a compact visual mode.')
  assert.ok(source.includes('compact ? "rgba(1,5,16,.98)"'), 'Compact memories must begin from a dark spatial field rather than a pale slab.')
  assert.ok(source.includes('if (!compact)'), 'Compact memories must not downsample title-card text into blank-looking rectangles.')
  assert.ok(source.includes('overview ? breath * 0.72'), 'Overview memories must remain subordinate to the galaxy.')`)

from pathlib import Path
import re

path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionSacred.tsx')
source = path.read_text()
if 'HOME_PHOTOGRAPHIC_PBR_V16' in source:
    print('V16 photographic material promotion already present.')
    raise SystemExit(0)

source, count = re.subn(
    r"import \{ ContactShadows, Environment, Lightformer, Stars, useAnimations, useGLTF \} from '@react-three/drei'",
    "import { ContactShadows, Environment, Stars, useAnimations, useGLTF, useTexture } from '@react-three/drei'",
    source,
    count=1,
)
assert count == 1, 'expected V15 drei import'

anchor = "const FERN_MODEL = '/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb'\n"
assert source.count(anchor) == 1
source = source.replace(anchor, anchor + "const ROCK_DIFFUSE = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.png'\nconst ROCK_NORMAL = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.png'\nconst ROCK_ARM = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.png'\nconst ROCK_DISPLACEMENT = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-displacement-1k.png'\nconst HOME_HDR = '/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr'\nconst HOME_PHOTOGRAPHIC_PBR_V16 = 'polyhaven-rock-tile-floor-plus-studio-small-08'\n", 1)

old_type = "type SurfacePack = { color: THREE.DataTexture; height: THREE.DataTexture; roughness: THREE.DataTexture }"
assert source.count(old_type) == 1
source = source.replace(old_type, "type SurfacePack = { color: THREE.Texture; normal: THREE.Texture; arm: THREE.Texture; displacement: THREE.Texture }", 1)

pattern = re.compile(r"function configureSurfaceTexture\([\s\S]*?function useWeatheredStonePack\([\s\S]*?\n}\n\nfunction cloneAuthoredMaterial", re.M)
replacement = '''function configurePhotographicTexture(texture: THREE.Texture, repeat: number, color = false) {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 8
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

function usePhotographicStonePack(repeat = 4) {
  const [sourceColor, sourceNormal, sourceArm, sourceDisplacement] = useTexture([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM, ROCK_DISPLACEMENT])
  const pack = useMemo(() => ({
    color: configurePhotographicTexture(sourceColor.clone(), repeat, true),
    normal: configurePhotographicTexture(sourceNormal.clone(), repeat),
    arm: configurePhotographicTexture(sourceArm.clone(), repeat),
    displacement: configurePhotographicTexture(sourceDisplacement.clone(), repeat),
  }), [repeat, sourceArm, sourceColor, sourceDisplacement, sourceNormal])
  useEffect(() => () => { pack.color.dispose(); pack.normal.dispose(); pack.arm.dispose(); pack.displacement.dispose() }, [pack])
  return pack
}

function cloneAuthoredMaterial'''
source, count = pattern.subn(replacement, source, count=1)
assert count == 1, 'expected V15 procedural texture block'

old_material = '''function StoneMaterial({ pack, color = '#363c3a', bumpScale = 0.065 }: { pack: SurfacePack; color?: string; bumpScale?: number }) {
  return <meshPhysicalMaterial
    color={color}
    map={pack.color}
    bumpMap={pack.height}
    bumpScale={bumpScale}
    roughnessMap={pack.roughness}
    roughness={0.84}
    metalness={0.035}
    clearcoat={0.055}
    clearcoatRoughness={0.82}
    envMapIntensity={0.68}
  />
}'''
new_material = '''function StoneMaterial({ pack, color = '#8b8f8c', bumpScale = 0.04 }: { pack: SurfacePack; color?: string; bumpScale?: number }) {
  const relief = Math.min(bumpScale, 0.052)
  return <meshPhysicalMaterial
    color={color}
    map={pack.color}
    normalMap={pack.normal}
    normalScale={new THREE.Vector2(0.58, 0.58)}
    roughnessMap={pack.arm}
    displacementMap={pack.displacement}
    displacementScale={relief}
    displacementBias={-relief * 0.42}
    roughness={0.91}
    metalness={0.012}
    clearcoat={0.035}
    clearcoatRoughness={0.88}
    envMapIntensity={0.78}
  />
}'''
assert source.count(old_material) == 1, 'expected V15 StoneMaterial'
source = source.replace(old_material, new_material, 1)

source = source.replace('useWeatheredStonePack(', 'usePhotographicStonePack(')
source = source.replace("color={index % 2 ? '#393e3b' : '#313735'}", "color={index % 2 ? '#777b78' : '#696e6b'}")
source = source.replace('color="#303735" bumpScale={0.075}', 'color="#747976" bumpScale={0.046}')
source = source.replace('color="#292f2d" bumpScale={0.052}', 'color="#555a57" bumpScale={0.034}')
source = source.replace('color="#353a38" bumpScale={0.042}', 'color="#626763" bumpScale={0.028}')

environment_pattern = re.compile(r"function PhysicalEnvironment\(\) \{[\s\S]*?\n}\n\nfunction RecessedPractical", re.M)
environment_replacement = '''function PhysicalEnvironment() {
  return <Environment files={HOME_HDR} background={false} environmentIntensity={0.82} />
}

function RecessedPractical'''
source, count = environment_pattern.subn(environment_replacement, source, count=1)
assert count == 1, 'expected V15 Lightformer environment block'

source = source.replace('weathered-obsidian-microdetail-v15', 'photographic-rock-pbr-v16')
source = source.replace('hand-laid-weathered-stone-v15', 'hand-laid-photographic-stone-v16')
source = source.replace('photographic-obsidian-ritual-platform-v15', 'photographic-obsidian-ritual-platform-v16')
source = source.replace('data-home-visual-grade="cinematic-pbr-v15-photographic-sanctuary"', 'data-home-visual-grade="cinematic-pbr-v16-photographic-cc0-sanctuary"')
source = source.replace('data-home-pbr-environment="local-lightformer-ibl"', 'data-home-pbr-environment="local-cc0-hdri-studio-small-08"')
source = source.replace('weathered-obsidian-microdetail-v15 fog-carried-horizon-v15 low-density-depth-mist-v15', 'polyhaven-rock-tile-floor-pbr-v1 studio-small-08-hdri-v1 fog-carried-horizon-v15 low-density-depth-mist-v15')

assert 'new THREE.DataTexture' not in source
assert 'makeWeatheredStonePack' not in source
assert '<Lightformer' not in source
assert 'rock-tile-floor-diff-1k.png' in source
assert 'studio-small-08-1k.hdr' in source
path.write_text(source)
print('Promoted Sacred Home to V16 photographic PBR + HDR inputs.')

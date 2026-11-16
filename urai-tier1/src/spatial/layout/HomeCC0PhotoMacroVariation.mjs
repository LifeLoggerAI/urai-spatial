// World-space photographic PBR macro variation for the EXISTING UrAi Home.
// Real Poly Haven CC0 diffuse/normal/roughness sources are left unchanged.
// Local review ONLY: NONPRODUCTION_CANDIDATE_UNAPPROVED.
export const HOME_CC0_MACRO_SHADER_VERSION = 'urai-home-cc0-photo-macro-v1'

export function homeCC0MacroProgramKey() {
  return HOME_CC0_MACRO_SHADER_VERSION
}

export function applyHomeCC0MacroVariation(shader) {
  if (!shader || typeof shader.vertexShader !== 'string' || typeof shader.fragmentShader !== 'string') {
    throw new Error('HOME_CC0_SHADER_INVALID')
  }
  for (const [source, chunks] of [
    [shader.vertexShader, ['#include <common>', '#include <begin_vertex>']],
    [shader.fragmentShader, ['#include <common>', '#include <color_fragment>']],
  ]) {
    for (const chunk of chunks) {
      if (!source.includes(chunk)) throw new Error('HOME_CC0_SHADER_MISSING_CHUNK:' + chunk)
    }
  }

  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', [
      '#include <common>',
      'varying vec3 vHomeCC0Position;',
    ].join('\n'))
    .replace('#include <begin_vertex>', [
      '#include <begin_vertex>',
      'vec4 homeCC0LocalPoint = vec4(transformed, 1.0);',
      '#ifdef USE_INSTANCING',
      'homeCC0LocalPoint = instanceMatrix * homeCC0LocalPoint;',
      '#endif',
      'vHomeCC0Position = (modelMatrix * homeCC0LocalPoint).xyz;',
    ].join('\n'))

  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', [
      '#include <common>',
      'varying vec3 vHomeCC0Position;',
      'float homeCC0Hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float homeCC0Noise(vec2 p) {',
      '  vec2 i = floor(p), f = fract(p);',
      '  f = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(homeCC0Hash(i), homeCC0Hash(i + vec2(1.0, 0.0)), f.x),',
      '    mix(homeCC0Hash(i + vec2(0.0, 1.0)), homeCC0Hash(i + vec2(1.0, 1.0)), f.x), f.y);',
      '}',
    ].join('\n'))
    .replace('#include <color_fragment>', [
      '#include <color_fragment>',
      '// Restrained, non-photographic color irregularity over authentic PBR maps.',
      '// Keep source diffuse, real normal and roughness maps authoritative.',
      'float homeCC0Macro = homeCC0Noise(vHomeCC0Position.xz * 0.18 + vec2(7.17, -3.11));',
      'float homeCC0Meso = homeCC0Noise(vHomeCC0Position.xz * 0.68 + vec2(-2.6, 8.3));',
      'float homeCC0Light = clamp(0.94 + 0.105 * homeCC0Macro + 0.025 * (homeCC0Meso - 0.5), 0.92, 1.07);',
      'diffuseColor.rgb *= homeCC0Light;',
    ].join('\n'))
}
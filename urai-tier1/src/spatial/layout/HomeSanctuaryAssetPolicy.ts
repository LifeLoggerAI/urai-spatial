import type { Object3D } from 'three'

// Retain the governed GLB's ground topology while the authored runtime owns its
// sanctuary, vegetation and companion. GLTFLoader may put a mesh without a
// useful name beneath a named node, so exclusions belong to the whole subtree.
const EXCLUDED_RETAINED_HOME_NODES = /mirror-basin|portal|ring|threshold|village|mannequin|avatar|debug|marker|label|embodied|presence|memory-place-anchor|living-growth|sanctuary-growth(?:-|$)|sanctuary-heart-light|vault|monolith|bridge|grove|firefly|alcove|veil|waterfall|sculpture|pedestal|rib|mountain|ridge|peak|horizon|low[-_ ]?poly|prototype|blockout|proof/i
const RETAINED_HOME_GROUND = /basin|path|ground|terrain|stone|floor|earth/i

export function classifyRetainedHomeMesh(object: Pick<Object3D, 'name' | 'parent'>): 'excluded' | 'ground' | 'retained' {
  let grounded = false
  for (let node: Pick<Object3D, 'name' | 'parent'> | null = object; node; node = node.parent) {
    if (EXCLUDED_RETAINED_HOME_NODES.test(node.name)) return 'excluded'
    grounded ||= RETAINED_HOME_GROUND.test(node.name)
  }
  return grounded ? 'ground' : 'retained'
}

// packages/spatial-core/src/index.ts

/**
 * Represents the core scene graph for URAI Spatial.
 * Manages worlds, scenes, entities, and their relationships.
 */
export class SceneGraph {
  constructor() {
    console.log("SceneGraph initialized");
  }

  // TODO: Implement methods for managing the scene graph
}

/**
 * Base class for all entities in a scene.
 */
export class Entity {
  constructor(public id: string) {
    console.log(`Entity ${id} created`);
  }
}

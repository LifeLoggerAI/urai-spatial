// URAI Spatial - XR Renderer Bridge
// Maps XRRuntimeView frames into a generic render scene interface

import type { XRFrame } from "./XRRuntimeView";

export class XRWebRenderer {
  private scene: any;
  private objects = new Map<string, any>();

  constructor(scene: any) {
    this.scene = scene;
  }

  applyFrame(frame: XRFrame) {
    const active = new Set<string>();

    for (const obj of frame.objects) {
      active.add(obj.id);

      let node = this.objects.get(obj.id);

      if (!node) {
        node = this.createNode(obj.type);
        this.scene.add(node);
        this.objects.set(obj.id, node);
      }

      node.position = {
        x: obj.position.x,
        y: obj.position.y,
        z: obj.position.z,
      };

      node.meta = obj.meta;
    }

    for (const [id, node] of this.objects.entries()) {
      if (!active.has(id)) {
        this.scene.remove(node);
        this.objects.delete(id);
      }
    }
  }

  private createNode(type: string) {
    return {
      type,
      position: { x: 0, y: 0, z: 0 },
      meta: {},
    };
  }

  render() {
    console.log("[XRWebRenderer] objects:", this.objects.size);
  }
}

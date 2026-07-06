// URAI Spatial - Three.js XR Renderer Bridge
// Maps Simulation XR frames into a Three.js scene

import * as THREE from "three";

export class ThreeXRRenderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    container.appendChild(this.renderer.domElement);

    this.camera.position.z = 5;

    const light = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(light);
  }

  applyFrame(frame: any) {
    if (!frame) return;

    const nodes = frame.memoryNodes || [];

    nodes.forEach((n: any, i: number) => {
      let obj = this.scene.getObjectByName(`mem-${n.id}`);

      if (!obj) {
        const geo = new THREE.SphereGeometry(0.1, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        obj = new THREE.Mesh(geo, mat);
        obj.name = `mem-${n.id}`;
        this.scene.add(obj);
      }

      obj.position.set(
        (n.x || i) * 0.5,
        (n.y || 0) * 0.5,
        (n.z || 0) * 0.5
      );
    });

    const preds = frame.predictions || [];

    preds.forEach((p: any, i: number) => {
      let obj = this.scene.getObjectByName(`pred-${i}`);

      if (!obj) {
        const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        obj = new THREE.Mesh(geo, mat);
        obj.name = `pred-${i}`;
        this.scene.add(obj);
      }

      obj.position.set(p.x || 0, p.y || 0, p.z || 0);
    });
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      this.renderer.render(this.scene, this.camera);
    };

    loop();
  }
}

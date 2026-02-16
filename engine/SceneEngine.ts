
import * as THREE from "three";
import { SceneMode } from "./modes";
import { HomeLayer } from "./layers/HomeLayer";
import { LifeMapLayer } from "./layers/LifeMapLayer";
import { ReplayLayer } from "./layers/ReplayLayer";

/**
 * The master controller for the entire URAI-SPATIAL experience.
 * It owns the renderer, scene, and camera, and manages the state machine
 * that controls transitions between different visual "layers".
 */
export class SceneEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;

  private mode: SceneMode = SceneMode.HOME;

  // Layers
  private home: HomeLayer;
  private lifeMap: LifeMapLayer;
  private replay: ReplayLayer;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    // --- Core Setup ---
    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // --- Layers Initialization ---
    this.home = new HomeLayer(this.scene);
    this.lifeMap = new LifeMapLayer(this.scene, this.camera, this.renderer);
    this.replay = new ReplayLayer(this.scene);

    // Initial visibility state
    this.lifeMap.setVisible(false);
    this.replay.setVisible(false);

    // --- Event Listeners ---
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    window.addEventListener('pointermove', this.onPointerMove.bind(this), false);

    // Start the animation loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private animate() {
    const delta = this.clock.getDelta();

    // The core update loop, driven by the current SceneMode
    this.update(delta);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }

  /**
   * This is the heart of the state machine. It calls the correct update
   * function based on the current mode.
   */
  private update(delta: number) {
    switch (this.mode) {
      case SceneMode.HOME:
        this.home.update(delta);
        break;

      case SceneMode.HOME_MORPH:
        // The updateMorph function returns `true` when its animation is complete.
        if (this.home.updateMorph(delta)) {
          this.enterLifeMap();
        }
        break;
        
      case SceneMode.LIFEMAP_REVEAL:
        if (this.lifeMap.updateReveal(delta)) {
            this.mode = SceneMode.LIFEMAP_IDLE;
        }
        break;

      case SceneMode.LIFEMAP_IDLE:
        this.raycaster.setFromCamera(this.pointer, this.camera);
        this.lifeMap.handleInteractions(this.raycaster);
        this.lifeMap.update(delta);
        break;

      case SceneMode.REPLAY_ACTIVE:
        this.replay.update(delta);
        break;

      case SceneMode.REPLAY_ENTER:
        if (this.lifeMap.updateEnterReplay(delta)) {
          this.enterReplay();
        }
        break;

      case SceneMode.REPLAY_EXIT:
        if (this.replay.updateExit(delta)) {
          this.returnToLifeMap();
        }
        break;
    }
  }

  // --- Public API for state transitions ---

  public triggerLifeMap() {
    if (this.mode === SceneMode.HOME) {
        this.mode = SceneMode.HOME_MORPH;
    }
  }

  public triggerReplay(memoryId: string) {
    if (this.mode === SceneMode.LIFEMAP_IDLE) {
        this.lifeMap.prepareReplay(memoryId);
        this.mode = SceneMode.REPLAY_ENTER;
    }
  }

  public exitReplay() {
    if (this.mode === SceneMode.REPLAY_ACTIVE) {
        this.mode = SceneMode.REPLAY_EXIT;
    }
  }

  // --- Private methods for handling state changes ---

  private enterLifeMap() {
    this.home.setVisible(false);
    this.lifeMap.setVisible(true);
    this.mode = SceneMode.LIFEMAP_REVEAL;
  }

  private enterReplay() {
    this.replay.setVisible(true);
    this.lifeMap.freezeBackground(true);
    this.mode = SceneMode.REPLAY_ACTIVE;
  }

  private returnToLifeMap() {
    this.replay.setVisible(false);
    this.lifeMap.freezeBackground(false);
    this.mode = SceneMode.LIFEMAP_IDLE;
  }

  // --- Event Handlers ---

  private onWindowResize() {
    const container = this.renderer.domElement.parentElement;
    if (container) {
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
  }

  private onPointerMove(event: PointerEvent) {
    // Normalize pointer coordinates to -1 -> +1
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
}

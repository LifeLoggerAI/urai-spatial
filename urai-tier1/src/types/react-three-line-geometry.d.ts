import type * as THREE from "three";

declare module "react" {
  interface SVGLineElementAttributes<T> {
    geometry?: THREE.BufferGeometry;
  }
}

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";

const LERP_FACTOR = 0.05;

export const CameraControls = () => {
  const { camera } = useThree();
  const targetPosition = useRef(new Vector3(0, 0, 15));

  // Scroll to zoom
  window.addEventListener("wheel", (e) => {
    targetPosition.current.z += e.deltaY * 0.01;
    targetPosition.current.z = Math.max(5, Math.min(100, targetPosition.current.z));
  });

  // Pan
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  window.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });
  window.addEventListener("mouseup", () => {
    isDragging = false;
  });
  window.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;

      targetPosition.current.x -= deltaX * 0.01;
      targetPosition.current.y += deltaY * 0.01;

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  });

  useFrame(() => {
    camera.position.lerp(targetPosition.current, LERP_FACTOR);
  });

  return null;
};

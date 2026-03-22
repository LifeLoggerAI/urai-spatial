import { useEffect } from "react";
import { useSceneStore } from "../state/sceneStore";

export default function useGestures() {
  const returnHome = useSceneStore((s) => s.returnHomeFromLifemap);
  const mode = useSceneStore((s) => s.mode);

  useEffect(() => {
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY;
      if (mode === "lifemap" && Math.abs(dy) > 60) {
        returnHome();
      }
    };

    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [mode, returnHome]);
}

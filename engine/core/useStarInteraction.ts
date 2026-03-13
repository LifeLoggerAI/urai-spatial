import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { selectionController } from "./selection-controller";
import { useSpatialStore } from "../state/spatialStore";

export const useStarInteraction = () => {
  const { scene } = useThree();
  const { 
    setSelectedStarId,
    setHoveredStarId,
    setCameraMode 
  } = useSpatialStore();

  useEffect(() => {
    const onStarClick = (e: any) => {
      if (selectionController.isLocked()) return;

      const { object } = e;
      const starId = object.userData.starId;

      if (starId) {
        setSelectedStarId(starId);
        selectionController.selectStar(starId, object.getWorldPosition(object.position));
        setCameraMode("star");
      }
    };

    const onStarHover = (e: any) => {
      if (selectionController.isLocked()) return;

      const { object } = e;
      const starId = object.userData.starId;

      if (starId) {
        setHoveredStarId(starId);
      }
    };

    const onStarLeave = () => {
        setHoveredStarId(null);
    };

    scene.addEventListener("click", onStarClick);
    scene.addEventListener("pointermove", onStarHover);
    scene.addEventListener("pointerleave", onStarLeave);

    return () => {
      scene.removeEventListener("click", onStarClick);
      scene.removeEventListener("pointermove", onStarHover);
      scene.removeEventListener("pointerleave", onStarLeave);
    };
  }, [scene, setSelectedStarId, setHoveredStarId, setCameraMode]);
};
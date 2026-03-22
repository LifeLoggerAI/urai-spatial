import { useCallback } from "react";

export type GestureHandlers = {
  onPointerDown: (e: PointerEvent | MouseEvent | TouchEvent) => void;
  onPointerMove: (e: PointerEvent | MouseEvent | TouchEvent) => void;
  onPointerUp: (e: PointerEvent | MouseEvent | TouchEvent) => void;
};

export function useGestures(): GestureHandlers {
  const noop = useCallback((_e: PointerEvent | MouseEvent | TouchEvent) => {}, []);
  return {
    onPointerDown: noop,
    onPointerMove: noop,
    onPointerUp: noop,
  };
}

export default useGestures;

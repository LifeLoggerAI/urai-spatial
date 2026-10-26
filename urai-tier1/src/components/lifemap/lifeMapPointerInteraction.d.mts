export function installLifeMapPointerInteraction(args: {
  canvas: HTMLCanvasElement;
  hostWindow: Window;
  blocked: () => boolean;
  onLook: (deltaX: number, deltaY: number) => void;
}): () => void;

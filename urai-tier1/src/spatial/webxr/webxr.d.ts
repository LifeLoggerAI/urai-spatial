export {};

declare global {
  interface XRSystem {
    isSessionSupported(mode: XRSessionMode): Promise<boolean>;
    requestSession(mode: XRSessionMode, options?: XRSessionInit): Promise<XRSession>;
  }

  interface Navigator {
    xr?: XRSystem;
  }

  type XRSessionMode = "inline" | "immersive-vr" | "immersive-ar";

  interface XRSessionInit {
    optionalFeatures?: string[];
    requiredFeatures?: string[];
  }

  interface XRSession {
    end(): Promise<void>;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  }
}

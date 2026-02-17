
import { ARButton } from '@react-three/xr';

export function XRToggleButton() {
  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      right: '24px',
      zIndex: 1000,
    }}>
      <ARButton
        sessionInit={{
          optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'],
        }}
      />
    </div>
  );
}

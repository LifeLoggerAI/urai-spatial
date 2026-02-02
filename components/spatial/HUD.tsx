'use client';

import { Text } from '@react-three/drei';

export default function HUD({ mode }: { mode: string }) {
  return (
    <Text position={[0, -2, -5]} fontSize={0.2} color="white">
      Mode: {mode}
    </Text>
  );
}

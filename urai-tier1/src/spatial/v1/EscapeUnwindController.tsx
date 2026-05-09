'use client';

import { useEffect } from 'react';
import type { SpatialEvent } from './spatialStateMachine';

export function EscapeUnwindController({ dispatch }: { dispatch: (event: SpatialEvent) => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'ESCAPE' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return <span className="urai-v1-sr" data-testid="urai-v1-escape-unwind">Escape unwinds the spatial layer.</span>;
}

'use client';

import type { ReplayPath } from './lifeMapTypes';

export function ReplayPathEngine({ path, active }: { path: ReplayPath; active: boolean }) {
  return (
    <div className="urai-v1-replay" data-testid="urai-v1-replay-overlay" data-active={active ? 'true' : 'false'} aria-label="Replay path animation">
      <div className="urai-v1-replay__thread" aria-hidden="true" />
      <div className="urai-v1-replay__captions" aria-live="polite">
        {path.captionLines.map((line, index) => (
          <span key={line} style={{ animationDelay: `${index * 1.2}s` }}>{line}</span>
        ))}
      </div>
    </div>
  );
}

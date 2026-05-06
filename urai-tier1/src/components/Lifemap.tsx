import React, { useState, useEffect } from 'react';
import { CodexService } from '../services/codexService';

export const Lifemap = ({ userId }: { userId: string }) => {
  const [isLocked, setIsLocked] = useState(false);
  
  useEffect(() => {
    const handleUnwind = async (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLocked) {
        setIsLocked(true);
        await CodexService.escUnwind(userId);
        setIsLocked(false);
      }
    };
    window.addEventListener('keydown', handleUnwind);
    return () => window.removeEventListener('keydown', handleUnwind);
  }, [userId, isLocked]);

  return (
    <div style={{ opacity: isLocked ? 0.5 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
      <button onClick={() => CodexService.homeAscent(userId)}>Home Ascent</button>
      {isLocked && <div>[TIER-1 LOCKED: PROCESSING CANON CHAIN]</div>}
    </div>
  );
};

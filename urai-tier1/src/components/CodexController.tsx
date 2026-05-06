import React, { useState, useEffect } from 'react';
import { CodexService } from '../services/codexService';

export const CodexController = ({ userId }: { userId: string }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [activeFocus, setActiveFocus] = useState("Home");

  useEffect(() => {
    const handleGlobalKeys = async (e: KeyboardEvent) => {
      // ESC UNWIND Trigger
      if (e.key === 'Escape' && !isLocked) {
        setIsLocked(true); // LOCK Tier-1
        const restoredState = await CodexService.executeEscUnwind(userId);
        if (restoredState) {
          setActiveFocus("Unwound to Previous State");
        }
        setIsLocked(false); // RELEASE Tier-1
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [userId, isLocked]);

  const handleAscent = async (worldId: string) => {
    setIsLocked(true);
    await CodexService.performCameraAscent(userId, worldId);
    setActiveFocus(`Ascended: ${worldId}`);
    setIsLocked(false);
  };

  return (
    <div style={{ 
      opacity: isLocked ? 0.4 : 1, 
      pointerEvents: isLocked ? 'none' : 'auto',
      transition: 'opacity 0.2s ease-in-out'
    }}>
      <div className="status-bar">
        Focus: <strong>{activeFocus}</strong>
        {isLocked && <span> [SYSTEM LOCKED]</span>}
      </div>
      
      <div className="controls">
        <button onClick={() => handleAscent('main_canon')}>Trigger Home Ascent</button>
        <button onClick={() => CodexService.updateLifemapFocus(userId, 'replay_node_1')}>Focus Lifemap</button>
      </div>
      
      <p className="hint">Press [ESC] to Unwind the Canon Chain</p>
    </div>
  );
};

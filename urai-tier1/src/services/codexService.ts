import { CodexRepository } from "../repositories/codexRepository";

export const CodexService = {
  // CAMERA & HOME ASCENT: Logic for entering the spatial perspective
  async performCameraAscent(userId: string, worldId: string) {
    console.log("[Tier 2] Initiating Camera Ascent into world:", worldId);
    await CodexRepository.logReplayEvent(userId, { 
      type: 'CAMERA_ASCENT', 
      data: { worldId, startTime: Date.now() } 
    });
    return { focus: worldId, zoom: "ascent" };
  },

  // LIFEMAP FOCUS: Transitions the UI focus to specific spatial coordinates
  async updateLifemapFocus(userId: string, targetId: string) {
    console.log("[Tier 2] Focusing Lifemap on:", targetId);
    await CodexRepository.logReplayEvent(userId, { type: 'FOCUS_CHANGE', data: { targetId } });
  },

  // ESC UNWIND: Logic to unwind the Canon Chain
  async executeEscUnwind(userId: string) {
    const chain = await CodexRepository.getCanonChain(userId);
    if (chain.length < 2) return null;
    
    const targetState = chain[1];
    await CodexRepository.logReplayEvent(userId, { 
      type: 'ESC_UNWIND', 
      data: { targetTimestamp: targetState.timestamp } 
    });
    return targetState;
  }
};

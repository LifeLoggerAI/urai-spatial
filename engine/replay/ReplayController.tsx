'use client'

import { useEffect } from "react"
import { useSpatialStore } from "../state/spatialStore"
import { useReplayTimelineStore } from "../state/useReplayTimelineStore"

// A more robust ReplayController that manages playback
export default function ReplayController() {
  const { 
    inReplayMode, 
    setReplayMode, 
    setSelectedStarId, 
    setCameraMode, 
    clearSelection 
  } = useSpatialStore();

  const { 
    timeline, 
    currentIndex, 
    isPlaying, 
    play, 
    pause, 
    next, 
    reset 
  } = useReplayTimelineStore();

  // Exit replay mode with Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (inReplayMode) {
          pause();
          reset();
          clearSelection();
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [inReplayMode, clearSelection, pause, reset]);

  // This effect drives the replay playback
  useEffect(() => {
    if (inReplayMode && isPlaying && timeline) {
      if (currentIndex < timeline.length) {
        const starId = timeline[currentIndex];
        setSelectedStarId(starId);
        setCameraMode("star");

        // Advance to the next star after a delay
        const timer = setTimeout(() => {
          next();
        }, 5000); // 5-second delay at each star

        return () => clearTimeout(timer);
      } else {
        // Timeline finished
        pause();
        reset();
        clearSelection();
      }
    }
  }, [inReplayMode, isPlaying, timeline, currentIndex, setSelectedStarId, setCameraMode, next, pause, reset, clearSelection]);

  return null;
}

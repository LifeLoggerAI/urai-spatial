'use client'

import { useSpatialStore } from "@/engine/state/spatialStore";
import { starData } from "@/engine/data/starPositions";

export default function Starfield() {
    const { spatialMode, selectedStarId, actions } = useSpatialStore();

    // The interaction handler is now conditional on the spatialMode.
    const handleStarClick = (starId: string) => {
        // Prevent star selection if we are not in the default 'lifemap' mode.
        // This locks the interaction during camera glides and memory replays.
        if (spatialMode !== 'lifemap') {
            return;
        }
        actions.selectStar(starId);
    };

    return (
        <>
            {starData.map((star) => {

                const isSelected = selectedStarId === star.id;
                const dim = selectedStarId !== null && !isSelected;

                return (
                    <mesh
                        key={star.id}
                        position={star.position}
                        scale={isSelected ? 2.2 : 1}
                        onClick={() => handleStarClick(star.id)} // Use the new conditional handler
                    >
                        <sphereGeometry args={[star.size, 10, 10]} />
                        <meshBasicMaterial
                            color={isSelected ? '#ffffff' : '#cccccc'}
                            transparent
                            opacity={dim ? 0.15 : 1}
                        />
                    </mesh>
                );
            })}
        </>
    );
}
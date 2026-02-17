
import { useMemo } from "react";
import { useUser } from "reactfire";
import { collection, doc, query, orderBy, limit } from "firebase/firestore";
import { useFirestoreCollectionData, useFirestoreDocumentData } from "reactfire";
import { firestore } from "../apps/spatial-web/src/firebase"; // Assuming you have a firebase initialization file

// I. Data Structures & Enums

export enum StarType {
  Neutral = "neutral",
  Explorer = "explorer",      // Was EmotionalSpike
  Protector = "protector",    // Was RelationshipCluster
  Dormant = "dormant",        // Was TraumaPeriod
  Awakening = "awakening",    // Was RecoveryBloom
  Settling = "settling",      // Was RitualEvent
}

export interface MemoryNode {
  id: string;
  timestamp: number;
  // emotionalScore is now represented by emotionVector in the backend
  // significanceScore is still present
  significanceScore: number;
  type: StarType; // This will now be derived from the user's archetype
  position: [number, number, number];
  // clusterId is a frontend concept, can be re-introduced if needed
}

export interface NarrativeArc {
  arc: string;
  from: string;
  to: string;
  startDate: { seconds: number; nanoseconds: number; };
  endDate: { seconds: number; nanoseconds: number; };
}

export interface UserState {
  seasonalArchetype?: string;
  selfArchetype?: string;
}

// II. Archetype to StarType Mapping

const archetypeToStarType: Record<string, StarType> = {
  Explorer: StarType.Explorer,
  Protector: StarType.Protector,
  Dormant: StarType.Dormant,
  // Add other archetypes as they are defined
  Primordial: StarType.Neutral, // Default for new users
};

// III. The Main Hook

export function useLifeMapData() {
  const { data: user } = useUser();

  // 1. Define Firestore references
  const memoryNodesRef = collection(firestore, `users/${user?.uid}/memoryNodes`);
  const narrativeArcsRef = collection(firestore, `users/${user?.uid}/narrativeArcs`);
  const userStateRef = doc(firestore, `users/${user?.uid}/state/current`);

  // 2. Fetch real-time data
  const { data: memoryNodesData } = useFirestoreCollectionData(query(memoryNodesRef, orderBy("timestamp", "desc"), limit(1000)), { idField: 'id' });
  const { data: narrativeArcsData } = useFirestoreCollectionData(query(narrativeArcsRef, orderBy("startDate", "desc")), { idField: 'id' });
  const { data: userStateData } = useFirestoreDocumentData(userStateRef);

  // 3. Process and memoize the data
  const data = useMemo(() => {
    if (!memoryNodesData || !userStateData) {
      // Return empty state while loading
      return { nodes: [], arcs: [], state: { seasonalArchetype: 'Primordial' } };
    }

    const state = userStateData as UserState;
    const currentArchetype = state.seasonalArchetype || 'Primordial';
    const starType = archetypeToStarType[currentArchetype] || StarType.Neutral;

    const nodes: MemoryNode[] = memoryNodesData.map((node: any) => ({
      id: node.id,
      timestamp: node.timestamp.toMillis(), // Convert Firestore Timestamp to ms
      significanceScore: node.significanceScore,
      type: starType, // Apply the current archetype's StarType to all nodes
      position: [node.spiralPosition.x, node.spiralPosition.y, node.spiralPosition.z],
    }));

    const arcs = (narrativeArcsData as NarrativeArc[]) || [];

    return { nodes, arcs, state };

  }, [memoryNodesData, narrativeArcsData, userStateData]);

  return data;
}

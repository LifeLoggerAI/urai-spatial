import { useMemo } from "react";
import type { SpatialMemoryNode, SpatialMemorySource } from "./spatialMemoryTypes";

const SEED: SpatialMemoryNode[] = [
  { id:"m-first-signal", title:"First signal", timestamp:"2026-01-11", emotionalTone:"focus", auraColor:"#8fdcff", intensity:0.86, nodeType:"memory", position:[-10,14,-52], narratorLine:"The first emotional marker stabilized here.", source:"seed", privacyLevel:"private", tags:["origin"] },
  { id:"m-quiet-recovery", title:"A quiet recovery", timestamp:"2026-01-18", emotionalTone:"recovery", auraColor:"#89f0b8", intensity:0.63, nodeType:"recovery", position:[8,12,-60], narratorLine:"Recovery patterns softened the field.", source:"seed" },
  { id:"m-threshold-night", title:"Threshold night", timestamp:"2026-02-03", emotionalTone:"tense", auraColor:"#f8b278", intensity:0.79, nodeType:"threshold", position:[3,20,-68], narratorLine:"A threshold formed before integration." , source:"seed"},
  { id:"m-dream-fragment", title:"Dream fragment", timestamp:"2026-02-14", emotionalTone:"awe", auraColor:"#c5a9ff", intensity:0.58, nodeType:"dream", position:[-15,17,-72], narratorLine:"A symbolic dream left this imprint.", source:"seed" },
  { id:"m-pattern-returned", title:"The pattern returned", timestamp:"2026-03-02", emotionalTone:"grief", auraColor:"#ff9ec4", intensity:0.74, nodeType:"insight", position:[14,18,-78], narratorLine:"A recurring theme re-entered awareness.", source:"seed" },
  { id:"m-relationship-echo", title:"A relationship echo", timestamp:"2026-03-10", emotionalTone:"neutral", auraColor:"#aac1ff", intensity:0.56, nodeType:"relationship", position:[-3,10,-56], narratorLine:"A social constellation resonated here.", source:"seed" },
  { id:"m-new-chapter", title:"A new chapter opened", timestamp:"2026-03-22", emotionalTone:"joy", auraColor:"#ffd98a", intensity:0.81, nodeType:"ritual", position:[0,24,-84], narratorLine:"A ritualized shift opened a new chapter.", source:"seed" },
];

export function useSpatialMemoryNodes(): { nodes: SpatialMemoryNode[]; loading: boolean; error: Error | null; source: SpatialMemorySource } {
  const nodes = useMemo(() => SEED, []);
  return { nodes, loading: false, error: null, source: "seed" };
}

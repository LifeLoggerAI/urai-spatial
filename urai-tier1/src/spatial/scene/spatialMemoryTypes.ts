export type SpatialMemoryNodeType = "memory"|"ritual"|"dream"|"relationship"|"threshold"|"recovery"|"insight";
export type SpatialMemorySource = "real"|"demo"|"seed";
export type SpatialMemoryNode = { id:string; title:string; timestamp:string; emotionalTone:string; auraColor:string; intensity:number; nodeType:SpatialMemoryNodeType; position:[number,number,number]; narratorLine:string; source?:SpatialMemorySource; privacyLevel?:"private"|"shared"|"anonymous"; tags?:string[] };

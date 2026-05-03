export type LifeMapIntelligence = {
label: string;
confidence: number;
};

export function resolveLifeMapIntelligence(confidence = 0.5): LifeMapIntelligence {
return {
label: "LifeMap Intelligence",
confidence,
};
}

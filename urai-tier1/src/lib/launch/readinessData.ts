export type ReadinessState = "GREEN" | "YELLOW" | "RED";

export const launchReadiness = {
  version: "V1 Foundation",
  areas: [
    {
      name: "Engineering",
      state: "GREEN" as ReadinessState,
      evidence: "Build and verification pipeline",
    },
    {
      name: "Assets",
      state: "YELLOW" as ReadinessState,
      evidence: "Premium media integration",
    },
    {
      name: "Documentation",
      state: "GREEN" as ReadinessState,
      evidence: "Launch documentation system",
    },
    {
      name: "Deployment",
      state: "YELLOW" as ReadinessState,
      evidence: "Hosted certification receipts",
    },
  ],
};

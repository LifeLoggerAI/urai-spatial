import { runProductionOrchestrator } from "../../../automation/productionOrchestrator";

export async function GET() {
  const snapshot = {
    worlds: [],
    memoryGraph: { nodes: [] },
    interactions: { messages: [] },
    emergence: {
      globalCoherence: 0.5,
      entropy: 0.2
    }
  };

  const result = runProductionOrchestrator(snapshot);

  return Response.json({ result });
}

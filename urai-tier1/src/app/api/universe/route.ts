export async function GET() {
  const result = {
    worlds: [],
    memoryGraph: { nodes: [], edges: [] },
    interactions: { messages: [] },
    emergence: {
      globalCoherence: 0.5,
      entropy: 0.2
    },
    mode: "fallback-demo",
    generatedAt: new Date().toISOString()
  };

  return Response.json({ result });
}

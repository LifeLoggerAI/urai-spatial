import { runProductionOrchestrator } from "../../../../automation/productionOrchestrator";

export const dynamic = "force-static";

function createSnapshot(tick = 0) {
  return {
    worlds: [],
    memoryGraph: { nodes: [] },
    interactions: { messages: [] },
    emergence: {
      globalCoherence: 0.5,
      entropy: 0.2,
    },
    tick,
  };
}

// SIMPLE SSE STREAM (REAL-TIME SIMULATION FEED)
export async function GET() {
  if (process.env.URAI_FIREBASE_STATIC_EXPORT === "true") {
    return Response.json({
      result: runProductionOrchestrator(createSnapshot()),
      mode: "static-preview",
    });
  }

  const encoder = new TextEncoder();
  let tick = 0;

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        tick++;

        const result = runProductionOrchestrator(createSnapshot(tick));

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(result)}\n\n`),
        );

        if (tick > 50) {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);

      return () => clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

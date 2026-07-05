import { runProductionOrchestrator } from "../../../../automation/productionOrchestrator";

// SIMPLE SSE STREAM (REAL-TIME SIMULATION FEED)
export async function GET() {
  const encoder = new TextEncoder();

  let tick = 0;

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        tick++;

        const snapshot = {
          worlds: [],
          memoryGraph: { nodes: [] },
          interactions: { messages: [] },
          emergence: {
            globalCoherence: Math.random(),
            entropy: Math.random()
          },
          tick
        };

        const result = runProductionOrchestrator(snapshot);

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(result)}\n\n`)
        );

        if (tick > 50) {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}

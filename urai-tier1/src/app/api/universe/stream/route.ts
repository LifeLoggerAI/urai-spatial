export const dynamic = "force-static";

export function GET() {
  return Response.json({
    service: "universe-stream",
    available: false,
    transport: "client-local-simulation",
    reason: "The canonical Firebase export is static and does not host server-sent events.",
    productionData: false,
    providerCalls: 0
  });
}

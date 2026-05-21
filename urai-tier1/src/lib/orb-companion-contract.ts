export type OrbRouteHint =
  | "home"
  | "brain-synapses"
  | "chest-heart"
  | "arms-device"
  | "legs-movement"
  | "sky-life-map"
  | "ground-world"
  | "object-memory"
  | "lifemap";

export type OrbCompanionResponse = {
  ok: true;
  service: "urai-spatial";
  userId: string;
  userIdSource: "default-demo" | "client-demo";
  identityMode: "public-demo";
  reply: string;
  mode: "local-fallback" | "memory-grounded";
  routeHint?: OrbRouteHint;
  confidenceLabel: "fallback" | "routed";
  isDemoFallback: boolean;
  sources: string[];
};

const DEFAULT_USER_ID = "adamclamp";
const PUBLIC_DEMO_USER_ID_PATTERN = /^[a-z0-9_-]{1,64}$/i;

const HOME_ROUTE_COMMANDS = ["go home", "back home", "wind back", "close chat", "close orb", "return home", "take me home"];

function inferRouteHint(message: string): OrbRouteHint | undefined {
  const text = message.toLowerCase();
  if (!text.trim()) return undefined;
  if (HOME_ROUTE_COMMANDS.some((command) => text.includes(command)) || text === "home" || text === "back") return "home";
  if (text.includes("brain") || text.includes("head") || text.includes("focus")) return "brain-synapses";
  if (text.includes("heart") || text.includes("chest") || text.includes("breath")) return "chest-heart";
  if (text.includes("arm") || text.includes("device") || text.includes("strain")) return "arms-device";
  if (text.includes("leg") || text.includes("movement") || text.includes("grounding")) return "legs-movement";
  if (text.includes("sky") || text.includes("forecast") || text.includes("weather")) return "sky-life-map";
  if (text.includes("ground") || text.includes("room") || text.includes("object")) return "ground-world";
  if (text.includes("life") || text.includes("map") || text.includes("star")) return "lifemap";
  return undefined;
}

function replyFor(routeHint?: OrbRouteHint) {
  if (routeHint === "home") return "I can wind us back home, close the chat layer, and keep the orb passive.";
  if (routeHint === "brain-synapses") return "That belongs in the head layer. I can open brain synapses and focus load.";
  if (routeHint === "chest-heart") return "That belongs in the chest-heart layer. I can open the torso signals.";
  if (routeHint === "arms-device") return "That belongs in the arms/device layer. I can open device strain.";
  if (routeHint === "legs-movement") return "That belongs in the legs movement layer. I can open grounding.";
  if (routeHint === "sky-life-map") return "That belongs in the sky LifeMap preview. I can open memory threads and forecast paths.";
  if (routeHint === "ground-world") return "That belongs in the ground world. I can open room anchors and object memory.";
  if (routeHint === "lifemap") return "I can guide you into the full LifeMap starfield.";
  return "URAI Spatial is listening in local fallback mode. Ask for home, brain, heart, arms, legs, sky, ground, or LifeMap.";
}

function normalizePublicDemoUserId(userId: unknown) {
  if (typeof userId !== "string") return { userId: DEFAULT_USER_ID, userIdSource: "default-demo" as const };
  const trimmed = userId.trim();
  if (!PUBLIC_DEMO_USER_ID_PATTERN.test(trimmed)) return { userId: DEFAULT_USER_ID, userIdSource: "default-demo" as const };
  return { userId: trimmed, userIdSource: "client-demo" as const };
}

export function buildOrbCompanionResponse(input: { userId?: unknown; message?: unknown }): OrbCompanionResponse {
  const identity = normalizePublicDemoUserId(input.userId);
  const message = typeof input.message === "string" ? input.message.slice(0, 500) : "";
  const routeHint = inferRouteHint(message);
  return {
    ok: true,
    service: "urai-spatial",
    userId: identity.userId,
    userIdSource: identity.userIdSource,
    identityMode: "public-demo",
    reply: replyFor(routeHint),
    mode: "local-fallback",
    routeHint,
    confidenceLabel: routeHint ? "routed" : "fallback",
    isDemoFallback: identity.userIdSource === "default-demo",
    sources: routeHint ? ["local-route-intent"] : [],
  };
}

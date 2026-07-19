export type WorkforceState =
  | "idle"
  | "observing-locally"
  | "preparing"
  | "awaiting-owner-approval"
  | "executing"
  | "completed"
  | "blocked"
  | "revoked";
export type ServiceAvailability = "available" | "degraded" | "offline";
export type GroundChamberForm =
  | "pavilion"
  | "sanctuary"
  | "council"
  | "transit"
  | "restorative"
  | "archive"
  | "reflection"
  | "vault"
  | "observatory"
  | "aperture"
  | "theater";
export type GroundLayer = "threshold" | "civic" | "continuity" | "deep";

export type GroundDestination = {
  id: string;
  label: string;
  detail: string;
  href: string;
  color: string;
  position: [number, number, number];
  camera: [number, number, number];
  lookAt: [number, number, number];
  workforceState: WorkforceState;
  availability: ServiceAvailability;
  chamberForm: GroundChamberForm;
  layer: GroundLayer;
  signature: string;
  emotionalSentence: string;
  ownerBoundary: boolean;
};

export const DESTINATIONS: readonly GroundDestination[] = [
  {
    id: "reception",
    label: "Reception",
    detail: "Today and arrivals",
    href: "/ground?district=reception",
    color: "#67e8f9",
    position: [-6.6, 0, -5.1],
    camera: [-3.8, 1.9, 0.1],
    lookAt: [-6.6, 1.35, -5.1],
    workforceState: "observing-locally",
    availability: "available",
    chamberForm: "pavilion",
    layer: "threshold",
    signature: "Arrival Horizon",
    emotionalSentence: "What has arrived may wait until you are ready.",
    ownerBoundary: false,
  },
  {
    id: "privacy",
    label: "Privacy Sanctuary",
    detail: "Consent and local control",
    href: "/privacy-controls?from=ground",
    color: "#a78bfa",
    position: [6.8, 0.15, -5.8],
    camera: [3.8, 2.05, -0.1],
    lookAt: [6.8, 1.55, -5.8],
    workforceState: "awaiting-owner-approval",
    availability: "available",
    chamberForm: "sanctuary",
    layer: "threshold",
    signature: "Boundary Model",
    emotionalSentence: "Nothing crosses this threshold without you.",
    ownerBoundary: true,
  },
  {
    id: "council",
    label: "Council",
    detail: "Approvals and decisions",
    href: "/ground?district=council",
    color: "#facc6b",
    position: [0, 0.7, -10.2],
    camera: [0, 2.75, -3.6],
    lookAt: [0, 1.65, -10.2],
    workforceState: "preparing",
    availability: "available",
    chamberForm: "council",
    layer: "civic",
    signature: "Decision Field",
    emotionalSentence: "Many voices may advise. Only the owner decides.",
    ownerBoundary: true,
  },
  {
    id: "logistics",
    label: "Logistics",
    detail: "Tasks and movement",
    href: "/ground?district=logistics&service=jobs",
    color: "#fb7185",
    position: [-9.4, 0.45, -14.5],
    camera: [-5.8, 2.25, -8.2],
    lookAt: [-9.4, 1.55, -14.5],
    workforceState: "blocked",
    availability: "degraded",
    chamberForm: "transit",
    layer: "civic",
    signature: "Movement Table",
    emotionalSentence: "Nothing claims completion without proof.",
    ownerBoundary: false,
  },
  {
    id: "wellness",
    label: "Wellness",
    detail: "Recovery and body signals",
    href: "/ground?district=wellness",
    color: "#86efac",
    position: [9.4, 0.35, -15],
    camera: [5.8, 2.15, -8.4],
    lookAt: [9.4, 1.45, -15],
    workforceState: "idle",
    availability: "available",
    chamberForm: "restorative",
    layer: "civic",
    signature: "Quiet Pool",
    emotionalSentence:
      "You may recover here without having to perform recovery.",
    ownerBoundary: false,
  },
  {
    id: "archive",
    label: "Archive",
    detail: "Memory and provenance",
    href: "/life-map?from=ground",
    color: "#93c5fd",
    position: [0, 1.15, -19.4],
    camera: [0, 3.05, -11.6],
    lookAt: [0, 2.15, -19.4],
    workforceState: "idle",
    availability: "available",
    chamberForm: "archive",
    layer: "continuity",
    signature: "Provenance Spine",
    emotionalSentence: "What remains should remain with its truth attached.",
    ownerBoundary: false,
  },
  {
    id: "mirror",
    label: "Reflection Realm",
    detail: "Mirror and rewind",
    href: "/mirror?from=ground",
    color: "#e9d5ff",
    position: [-7.2, 2.45, -23],
    camera: [-4.5, 3.9, -16.4],
    lookAt: [-7.2, 3.15, -23],
    workforceState: "idle",
    availability: "available",
    chamberForm: "reflection",
    layer: "continuity",
    signature: "Many-Sided Mirror",
    emotionalSentence:
      "A reflection may help you look. It does not define you.",
    ownerBoundary: false,
  },
  {
    id: "passport",
    label: "Ownership Vault",
    detail: "Identity and export",
    href: "/passport?from=ground",
    color: "#fde68a",
    position: [7.2, 2.45, -23],
    camera: [4.5, 3.9, -16.4],
    lookAt: [7.2, 3.15, -23],
    workforceState: "awaiting-owner-approval",
    availability: "available",
    chamberForm: "vault",
    layer: "continuity",
    signature: "Sovereignty Ledger",
    emotionalSentence: "The system may hold your life. It may never own it.",
    ownerBoundary: true,
  },
  {
    id: "consent",
    label: "Consent Sanctuary",
    detail: "Permissions and revocation",
    href: "/privacy-controls?from=ground&panel=consent",
    color: "#c084fc",
    position: [-9.8, 3.6, -28.5],
    camera: [-6.3, 4.75, -21],
    lookAt: [-9.8, 4.25, -28.5],
    workforceState: "awaiting-owner-approval",
    availability: "available",
    chamberForm: "sanctuary",
    layer: "deep",
    signature: "Consent Thread",
    emotionalSentence: "Yes must be specific. No must remain complete.",
    ownerBoundary: true,
  },
  {
    id: "atlas",
    label: "Emotional Atlas",
    detail: "Consent-aware place memory",
    href: "/location-map?from=ground",
    color: "#5eead4",
    position: [-3.4, 4.25, -30.2],
    camera: [-2.1, 5.05, -22.7],
    lookAt: [-3.4, 4.85, -30.2],
    workforceState: "observing-locally",
    availability: "available",
    chamberForm: "observatory",
    layer: "deep",
    signature: "Relational Weather Field",
    emotionalSentence:
      "A community may reveal what it carries without surrendering its people.",
    ownerBoundary: false,
  },
  {
    id: "focus",
    label: "Focus Chamber",
    detail: "Selected-memory attention",
    href: "/focus?demo=1&memoryId=demo:ground-focus&manifestId=demo-manifest&node=demo:ground-focus&from=ground",
    color: "#c4b5fd",
    position: [3.4, 4.25, -30.2],
    camera: [2.1, 5.05, -22.7],
    lookAt: [3.4, 4.85, -30.2],
    workforceState: "preparing",
    availability: "available",
    chamberForm: "aperture",
    layer: "deep",
    signature: "Memory Aperture",
    emotionalSentence: "One memory. Enough space to meet it honestly.",
    ownerBoundary: false,
  },
  {
    id: "replay",
    label: "Replay Theater",
    detail: "Entered-memory cinema",
    href: "/replay?demo=1&memoryId=demo:ground-replay&manifestId=demo-manifest&node=demo:ground-replay&from=ground",
    color: "#f9a8d4",
    position: [9.8, 3.6, -28.5],
    camera: [6.3, 4.75, -21],
    lookAt: [9.8, 4.25, -28.5],
    workforceState: "idle",
    availability: "available",
    chamberForm: "theater",
    layer: "deep",
    signature: "Replay Gate",
    emotionalSentence: "Enter the memory without surrendering the present.",
    ownerBoundary: false,
  },
];

export const STATE_LABEL: Record<WorkforceState, string> = {
  idle: "Idle",
  "observing-locally": "Observing locally",
  preparing: "Preparing",
  "awaiting-owner-approval": "Awaiting your approval",
  executing: "Executing",
  completed: "Completed",
  blocked: "Blocked",
  revoked: "Revoked",
};

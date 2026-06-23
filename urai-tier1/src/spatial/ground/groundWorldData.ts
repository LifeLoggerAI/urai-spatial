export type GroundCouncilId = "archivist" | "guardian" | "strategist" | "builder" | "witness";

export type GroundObjectId =
  | "truck-key"
  | "work-laptop"
  | "medicine-bottle"
  | "family-photo"
  | "document-chest"
  | "calendar-stone"
  | "tool-crate"
  | "home-model";

export type GroundZoneId = "council-ring" | "artifact-path" | "private-grove" | "daily-yard";

export type GroundCouncilMember = {
  id: GroundCouncilId;
  name: string;
  role: string;
  zone: GroundZoneId;
  position: { x: number; y: number };
  walkDelay: string;
  signal: string;
  description: string;
  guidance: string;
};

export type GroundLifeObject = {
  id: GroundObjectId;
  label: string;
  type: string;
  zone: GroundZoneId;
  position: { x: number; y: number };
  councilId: GroundCouncilId;
  privacy: "private" | "protected" | "active" | "daily";
  meaning: string;
  connectedTo: string[];
  actions: string[];
};

export const groundZones: Array<{
  id: GroundZoneId;
  label: string;
  description: string;
}> = [
  {
    id: "council-ring",
    label: "Council Ring",
    description: "The living advisors move here before they walk into the rest of the world.",
  },
  {
    id: "artifact-path",
    label: "Artifact Path",
    description: "Real-life objects become touchable anchors instead of dashboard cards.",
  },
  {
    id: "private-grove",
    label: "Private Grove",
    description: "Protected objects, documents, and consent boundaries stay visibly guarded.",
  },
  {
    id: "daily-yard",
    label: "Daily Yard",
    description: "Routines, tools, health, schedule, and active life systems live close to the user.",
  },
];

export const groundCouncil: GroundCouncilMember[] = [
  {
    id: "archivist",
    name: "Archivist",
    role: "Remembers what each object has carried over time.",
    zone: "artifact-path",
    position: { x: 22, y: 49 },
    walkDelay: "-2s",
    signal: "old stories, photos, objects, receipts, notes",
    description:
      "The Archivist walks near shelves, keepsakes, photos, and old traces. They explain what a real-life object connects to and why it keeps showing up.",
    guidance: "Ask what this object remembers and what part of your life it is attached to.",
  },
  {
    id: "guardian",
    name: "Guardian",
    role: "Protects private objects, identity, consent, and boundaries.",
    zone: "private-grove",
    position: { x: 78, y: 52 },
    walkDelay: "-5s",
    signal: "privacy, documents, permissions, safe access",
    description:
      "The Guardian stays near locked chests, identity markers, and private zones. They make sure the world feels personal without becoming exposed.",
    guidance: "Ask what should stay private, what should be locked, and what can safely be shared.",
  },
  {
    id: "strategist",
    name: "Strategist",
    role: "Turns the world into next steps without flattening it into tasks.",
    zone: "daily-yard",
    position: { x: 58, y: 63 },
    walkDelay: "-8s",
    signal: "plans, routes, blockers, this week",
    description:
      "The Strategist walks the paths between daily objects. They help turn life pressure into a direction the user can actually move through.",
    guidance: "Ask what the next grounded move should be and what object is blocking motion.",
  },
  {
    id: "builder",
    name: "Builder",
    role: "Stands near projects, tools, prototypes, and unfinished systems.",
    zone: "artifact-path",
    position: { x: 39, y: 67 },
    walkDelay: "-11s",
    signal: "projects, prototypes, tools, making things real",
    description:
      "The Builder does not turn projects into generic cards. They stands near the tools and partial structures that show what is being made.",
    guidance: "Ask what is unfinished, what has enough shape to ship, and what needs hands on it next.",
  },
  {
    id: "witness",
    name: "Witness",
    role: "Notices the emotional pattern without forcing a dashboard answer.",
    zone: "council-ring",
    position: { x: 49, y: 43 },
    walkDelay: "-14s",
    signal: "pattern, pressure, grief, pride, presence",
    description:
      "The Witness moves slowly through the center of the ground world. They help the user see what the world feels like before deciding what to do.",
    guidance: "Ask what this place is trying to show you and what deserves attention without judgment.",
  },
];

export const groundObjects: GroundLifeObject[] = [
  {
    id: "truck-key",
    label: "Truck Key",
    type: "real-life object",
    zone: "daily-yard",
    position: { x: 30, y: 68 },
    councilId: "strategist",
    privacy: "daily",
    meaning: "movement, responsibility, freedom, errands, repair, getting back out into the world",
    connectedTo: ["mobility", "appointments", "work runs", "repair loops"],
    actions: ["Add note", "Ask Strategist", "Mark important", "Attach related memory"],
  },
  {
    id: "work-laptop",
    label: "Work Laptop",
    type: "project object",
    zone: "artifact-path",
    position: { x: 43, y: 58 },
    councilId: "builder",
    privacy: "active",
    meaning: "making, pressure, launch work, unfinished systems, creative fire",
    connectedTo: ["URAI", "current build", "ship list", "proof of work"],
    actions: ["Ask Builder", "Open project note", "Set active", "Record progress"],
  },
  {
    id: "medicine-bottle",
    label: "Medicine Bottle",
    type: "health object",
    zone: "daily-yard",
    position: { x: 64, y: 70 },
    councilId: "guardian",
    privacy: "protected",
    meaning: "care, routine, body signal, safety, remembering what the body needs",
    connectedTo: ["health routine", "body state", "appointments", "protected notes"],
    actions: ["Protect details", "Add routine note", "Ask Guardian", "Mark sensitive"],
  },
  {
    id: "family-photo",
    label: "Family Photo",
    type: "personal artifact",
    zone: "artifact-path",
    position: { x: 18, y: 61 },
    councilId: "archivist",
    privacy: "private",
    meaning: "family, memory, love, history, old rooms, people who shaped the world",
    connectedTo: ["family", "old stories", "keepsakes", "protected memories"],
    actions: ["Ask Archivist", "Add story", "Protect artifact", "Attach memory"],
  },
  {
    id: "document-chest",
    label: "Document Chest",
    type: "protected object",
    zone: "private-grove",
    position: { x: 82, y: 63 },
    councilId: "guardian",
    privacy: "protected",
    meaning: "identity, paperwork, consent, access, things that should not float loose",
    connectedTo: ["passport", "privacy", "important files", "permissions"],
    actions: ["Ask Guardian", "Review access", "Lock item", "Add document note"],
  },
  {
    id: "calendar-stone",
    label: "Calendar Stone",
    type: "daily system",
    zone: "daily-yard",
    position: { x: 70, y: 55 },
    councilId: "strategist",
    privacy: "daily",
    meaning: "time, appointments, commitments, rhythm, remembering where life is pulling",
    connectedTo: ["today", "this week", "appointments", "promises"],
    actions: ["Ask Strategist", "Add reminder", "Mark pressure", "Review week"],
  },
  {
    id: "tool-crate",
    label: "Tool Crate",
    type: "making object",
    zone: "artifact-path",
    position: { x: 51, y: 72 },
    councilId: "builder",
    privacy: "active",
    meaning: "what can be made with what is already here",
    connectedTo: ["assets", "ship tools", "terminal work", "repairs"],
    actions: ["Ask Builder", "List next tool", "Mark ready", "Add build note"],
  },
  {
    id: "home-model",
    label: "Home Model",
    type: "place object",
    zone: "council-ring",
    position: { x: 50, y: 51 },
    councilId: "witness",
    privacy: "private",
    meaning: "the place the life world starts from, not a menu and not a dashboard",
    connectedTo: ["home", "body", "identity", "daily environment"],
    actions: ["Ask Witness", "Name this place", "Add context", "Protect home layer"],
  },
];

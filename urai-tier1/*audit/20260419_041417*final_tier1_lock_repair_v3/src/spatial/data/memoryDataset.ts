import { toCanonicalSelectedStar } from "../state/toCanonicalSelectedStar";
export type MemoryRecord = {
  key: string;
  title: string;
  label: string;
  signature: string;
  chapter: string;
  timeband: string;
  dateLabel: string;
  summary: string;
  detail: string;
  tags: string[];
  transcript: string;
};

export const memoryDataset: MemoryRecord[] = [
  {
    key: "origin-001",
    title: "First Signal",
    label: "Memory Node 001",
    signature: "Solar Memory",
    chapter: "Origins",
    timeband: "Dawn Era",
    dateLabel: "Early Arc",
    summary: "A first internal signal, recorded before the map had structure.",
    detail:
      "This memory represents the earliest point of narrative organization: a bright fragment that carries origin energy, curiosity, and raw direction before the system fully coheres.",
    tags: ["origin", "signal", "first-light"],
    transcript:
      "I could feel the shape before I could explain it. Something was already forming, even if the language for it had not arrived yet.",
  },
  {
    key: "origin-002",
    title: "Naming the Pattern",
    label: "Memory Node 002",
    signature: "White Signal",
    chapter: "Origins",
    timeband: "Dawn Era",
    dateLabel: "Early Arc",
    summary: "The point where instinct became language.",
    detail:
      "This memory marks the transition from vague perception into explicit naming. It is the moment the system begins turning intuition into a repeatable model.",
    tags: ["naming", "pattern", "language"],
    transcript:
      "Once it had a name, it stopped being fog. It became something I could return to, refine, and build around.",
  },
  {
    key: "threshold-003",
    title: "Crossing the Interface",
    label: "Memory Node 003",
    signature: "Blue Echo",
    chapter: "Threshold",
    timeband: "First Arc",
    dateLabel: "Threshold Phase",
    summary: "The boundary between idea and embodied system.",
    detail:
      "A threshold memory records crossing into a more serious layer of commitment. The scene changes from imagining a system to living inside it and letting it reshape the work.",
    tags: ["threshold", "interface", "entry"],
    transcript:
      "This stopped being hypothetical the moment I had to make it work in front of me, not just in theory.",
  },
  {
    key: "threshold-004",
    title: "The Turn Toward Scale",
    label: "Memory Node 004",
    signature: "Verdant Pulse",
    chapter: "Threshold",
    timeband: "First Arc",
    dateLabel: "Threshold Phase",
    summary: "A local concept starts behaving like infrastructure.",
    detail:
      "This is the point where the work becomes larger than a single scene. The memory captures the realization that the architecture must hold weight over time.",
    tags: ["scale", "architecture", "threshold"],
    transcript:
      "I realized I was not building a feature. I was building the conditions that future features would have to survive inside.",
  },
  {
    key: "drift-005",
    title: "Signal Loss",
    label: "Memory Node 005",
    signature: "Rose Thread",
    chapter: "Drift",
    timeband: "Middle Arc",
    dateLabel: "Drift Window",
    summary: "Momentum remains, but clarity thins.",
    detail:
      "Drift memories capture productive motion without clean alignment. The energy is still there, but the path feels scattered and context starts to fracture.",
    tags: ["drift", "ambiguity", "scatter"],
    transcript:
      "I was moving fast enough to stay in motion, but not cleanly enough to know whether motion alone was progress.",
  },
  {
    key: "drift-006",
    title: "Fragment Pressure",
    label: "Memory Node 006",
    signature: "Blue Echo",
    chapter: "Drift",
    timeband: "Middle Arc",
    dateLabel: "Drift Window",
    summary: "Too many live branches, not enough consolidation.",
    detail:
      "This memory represents structural fragmentation: multiple partial paths, each carrying value, but none yet folded into a single coherent route.",
    tags: ["fragmentation", "branches", "pressure"],
    transcript:
      "Every path contained a piece of the answer, but the answer itself was still split across too many rooms.",
  },
  {
    key: "recovery-007",
    title: "Return to Canon",
    label: "Memory Node 007",
    signature: "White Signal",
    chapter: "Recovery",
    timeband: "Middle Arc",
    dateLabel: "Recovery Window",
    summary: "The moment dead paths stop competing with the real one.",
    detail:
      "A recovery memory marks the return to a verified route. Noise drops, the canonical path sharpens, and the system becomes honest about what is truly live.",
    tags: ["recovery", "canon", "clarity"],
    transcript:
      "The breakthrough was not adding more. It was finally admitting which path was actually real and letting the rest fall silent.",
  },
  {
    key: "recovery-008",
    title: "Clean Build",
    label: "Memory Node 008",
    signature: "Solar Memory",
    chapter: "Recovery",
    timeband: "Middle Arc",
    dateLabel: "Recovery Window",
    summary: "Verification replaces assumption.",
    detail:
      "This memory is anchored in proof. The system compiles, renders, and survives the basic acceptance path, transforming confidence from speculation into evidence.",
    tags: ["verification", "build", "proof"],
    transcript:
      "Once the build passed, the story changed. It was no longer a hope about what the system might be. It was evidence of what it already was.",
  },
  {
    key: "signal-009",
    title: "Focus Lock",
    label: "Memory Node 009",
    signature: "Rose Thread",
    chapter: "Signal",
    timeband: "Late Arc",
    dateLabel: "Signal Window",
    summary: "Attention narrows around a single active node.",
    detail:
      "Signal memories represent clarity through focus. A node becomes central enough that context reorganizes itself around it and the rest of the map falls back.",
    tags: ["FOCUS", "node", "attention"],
    transcript:
      "When the node came into focus, everything else stopped asking to be first. The scene finally had a center.",
  },
  {
    key: "signal-010",
    title: "Reading the Map",
    label: "Memory Node 010",
    signature: "Blue Echo",
    chapter: "Signal",
    timeband: "Late Arc",
    dateLabel: "Signal Window",
    summary: "The interface starts behaving like interpretation, not just display.",
    detail:
      "This memory marks the shift from visual layout to meaningful navigation. The map begins to feel like a readable structure rather than a decorative one.",
    tags: ["map", "reading", "interpretation"],
    transcript:
      "The stars stopped being dots and started becoming decisions. That was the moment the map turned into a system of meaning.",
  },
  {
    key: "constellation-011",
    title: "Relational Thread",
    label: "Memory Node 011",
    signature: "Verdant Pulse",
    chapter: "Constellation",
    timeband: "Night Archive",
    dateLabel: "Constellation Phase",
    summary: "One node implies the existence of several others.",
    detail:
      "Constellation memories encode relation. They suggest that no memory is isolated and that narrative power increases when nodes are read in context.",
    tags: ["relation", "constellation", "thread"],
    transcript:
      "The important thing about this node was not only what it was. It was what else it pointed to.",
  },
  {
    key: "constellation-012",
    title: "Pattern Field",
    label: "Memory Node 012",
    signature: "White Signal",
    chapter: "Constellation",
    timeband: "Night Archive",
    dateLabel: "Constellation Phase",
    summary: "The map reveals itself as a field of repeating structure.",
    detail:
      "This memory captures the emergence of recurrence: repeated motifs, repeated returns, repeated chapters with new weight each time they reappear.",
    tags: ["pattern", "field", "recurrence"],
    transcript:
      "It was no longer a collection. It had become a field, and the field had rules.",
  },
  {
    key: "origin-013",
    title: "Quiet Source",
    label: "Memory Node 013",
    signature: "Solar Memory",
    chapter: "Origins",
    timeband: "Dawn Era",
    dateLabel: "Foundational Recall",
    summary: "A low-noise origin point that continues to shape later decisions.",
    detail:
      "Not every foundational memory arrives loudly. This record represents a subtle origin source whose influence becomes clearer only in retrospect.",
    tags: ["source", "quiet", "foundation"],
    transcript:
      "I did not notice how early it began until much later, when I saw how many later decisions still bent around it.",
  },
  {
    key: "threshold-014",
    title: "System Weight",
    label: "Memory Node 014",
    signature: "Blue Echo",
    chapter: "Threshold",
    timeband: "First Arc",
    dateLabel: "Commitment Point",
    summary: "The work starts carrying consequence.",
    detail:
      "This memory holds the shift from experimentation to responsibility. It is where the system begins to matter enough that failure has texture.",
    tags: ["commitment", "weight", "system"],
    transcript:
      "Once the system had weight, every decision inside it started carrying more than local consequences.",
  },
  {
    key: "drift-015",
    title: "Noise Saturation",
    label: "Memory Node 015",
    signature: "Rose Thread",
    chapter: "Drift",
    timeband: "Middle Arc",
    dateLabel: "Noise Phase",
    summary: "Input volume exceeds interpretive stability.",
    detail:
      "A memory of overload: too many active signals arriving simultaneously, producing churn rather than synthesis.",
    tags: ["noise", "saturation", "overload"],
    transcript:
      "There was too much signal to be signal. Past a certain point it all collapsed back into noise.",
  },
  {
    key: "recovery-016",
    title: "Surgical Repair",
    label: "Memory Node 016",
    signature: "Verdant Pulse",
    chapter: "Recovery",
    timeband: "Middle Arc",
    dateLabel: "Repair Window",
    summary: "Precision work restores trust in the path.",
    detail:
      "A recovery record centered on disciplined repair. Small, exact changes are made in the canonical route until the whole system becomes trustworthy again.",
    tags: ["repair", "surgical", "trust"],
    transcript:
      "The return came from precision, not force. Each exact repair made the path a little more believable.",
  },
  {
    key: "signal-017",
    title: "Viewport Certainty",
    label: "Memory Node 017",
    signature: "White Signal",
    chapter: "Signal",
    timeband: "Late Arc",
    dateLabel: "Signal Window",
    summary: "The scene reads clearly from a user point of view.",
    detail:
      "This is the user-facing clarity memory: when the system not only works internally, but also presents itself in a way that can be felt immediately.",
    tags: ["viewport", "clarity", "user"],
    transcript:
      "It finally looked like what it was trying to be. That changed everything about how it could be judged.",
  },
  {
    key: "constellation-018",
    title: "Living Archive",
    label: "Memory Node 018",
    signature: "Solar Memory",
    chapter: "Constellation",
    timeband: "Night Archive",
    dateLabel: "Archive Phase",
    summary: "Memory becomes navigable architecture.",
    detail:
      "This record marks the point where memory is no longer passive storage. It becomes an active, explorable archive with its own topology.",
    tags: ["archive", "navigation", "living-system"],
    transcript:
      "The archive stopped feeling like the past and started feeling like terrain.",
  },
  {
    key: "origin-019",
    title: "First Coherence",
    label: "Memory Node 019",
    signature: "Blue Echo",
    chapter: "Origins",
    timeband: "Dawn Era",
    dateLabel: "Foundational Recall",
    summary: "A first stable glimpse of internal order.",
    detail:
      "This memory captures early coherence: the sense that separate fragments are beginning to align into a readable form.",
    tags: ["coherence", "alignment", "early-order"],
    transcript:
      "For the first time, the fragments were not just adjacent. They were starting to agree with one another.",
  },
  {
    key: "threshold-020",
    title: "Entering the Frame",
    label: "Memory Node 020",
    signature: "Rose Thread",
    chapter: "Threshold",
    timeband: "First Arc",
    dateLabel: "Commitment Point",
    summary: "The operator steps fully into the system they are shaping.",
    detail:
      "This record is about immersion. The system ceases to be outside the builder and begins to surround the builder instead.",
    tags: ["frame", "immersion", "entry"],
    transcript:
      "I was no longer standing next to the system. I was operating from inside its frame.",
  },
  {
    key: "drift-021",
    title: "False Branch Proliferation",
    label: "Memory Node 021",
    signature: "Verdant Pulse",
    chapter: "Drift",
    timeband: "Middle Arc",
    dateLabel: "Noise Phase",
    summary: "Non-canonical paths multiply faster than truth can stabilize them.",
    detail:
      "A drift memory focused on branch sprawl: compelling alternatives appear everywhere, but they compete against coherence.",
    tags: ["branches", "sprawl", "non-canonical"],
    transcript:
      "Every branch seemed plausible enough to steal time, but not solid enough to deserve the whole path.",
  },
  {
    key: "recovery-022",
    title: "Proof Over Promise",
    label: "Memory Node 022",
    signature: "White Signal",
    chapter: "Recovery",
    timeband: "Middle Arc",
    dateLabel: "Repair Window",
    summary: "Evidence becomes the operating rule.",
    detail:
      "This memory anchors the decision to stop treating intention as completion. The system is judged by verification, not aspiration.",
    tags: ["evidence", "verification", "truth"],
    transcript:
      "The turning point was simple: if it could not be proven, it would no longer be treated as real.",
  },
  {
    key: "signal-023",
    title: "Focused Return",
    label: "Memory Node 023",
    signature: "Solar Memory",
    chapter: "Signal",
    timeband: "Late Arc",
    dateLabel: "Signal Window",
    summary: "The system learns to leave focus cleanly and come back without damage.",
    detail:
      "A signal memory about controlled transitions. Focus is no longer a trap; it is a reversible, stable state.",
    tags: ["FOCUS", "return", "stability"],
    transcript:
      "What mattered was not only reaching focus. It was being able to leave it cleanly and return when needed.",
  },
  {
    key: "constellation-024",
    title: "Narrative Topology",
    label: "Memory Node 024",
    signature: "Blue Echo",
    chapter: "Constellation",
    timeband: "Night Archive",
    dateLabel: "Archive Phase",
    summary: "The shape of the memory field becomes legible as narrative structure.",
    detail:
      "This record describes the emergence of topology: not just nodes and links, but a meaningful arrangement of narrative terrain.",
    tags: ["topology", "narrative", "map-logic"],
    transcript:
      "The map did not just contain memories. It had started to explain how memory itself was arranged.",
  },
];

export function getMemoryMetadata(index: number): MemoryRecord {
  return memoryDataset[index % memoryDataset.length];
}

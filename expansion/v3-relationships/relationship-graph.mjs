const ALLOWED_KINDS = new Set(["family","friend","mentor","partner","colleague","caregiver","legacy","other"]);
const VISIBILITY = new Set(["private","shared_by_consent","vaulted"]);
const PROHIBITED_KEYS = new Set(["score","relationshipScore","hiddenScore","affinityScore","rank"]);

function clone(value) {
  return structuredClone(value);
}

function assertNoScores(value, path = "root") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (PROHIBITED_KEYS.has(key)) throw new Error("Prohibited relationship scoring field at " + path + "." + key);
    assertNoScores(child, path + "." + key);
  }
}

export function validateRelationshipGraph(graph) {
  if (graph?.version !== "1.0.0") throw new Error("Unsupported relationship graph version");
  if (!Array.isArray(graph.people) || !Array.isArray(graph.edges) || !Array.isArray(graph.memoryLinks)) {
    throw new Error("people, edges, and memoryLinks are required arrays");
  }

  assertNoScores(graph);

  const people = new Set();
  for (const person of graph.people) {
    if (!person.personId) throw new Error("personId required");
    if (people.has(person.personId)) throw new Error("duplicate personId");
    if (!ALLOWED_KINDS.has(person.kind)) throw new Error("invalid relationship kind");
    if (!VISIBILITY.has(person.visibility)) throw new Error("invalid visibility");
    if (!["active","hidden","vaulted","deleted"].includes(person.status)) throw new Error("invalid person status");
    if (!Array.isArray(person.provenance) || person.provenance.length === 0) {
      throw new Error("person provenance required");
    }
    people.add(person.personId);
  }

  const edges = new Set();
  for (const edge of graph.edges) {
    if (!edge.edgeId || edges.has(edge.edgeId)) throw new Error("unique edgeId required");
    if (!people.has(edge.fromPersonId) || !people.has(edge.toPersonId)) throw new Error("edge endpoint missing");
    if (edge.fromPersonId === edge.toPersonId) throw new Error("self edge prohibited");
    if (!["active","hidden","vaulted","deleted","revoked"].includes(edge.status)) throw new Error("invalid edge status");
    if (!Array.isArray(edge.provenance) || edge.provenance.length === 0) throw new Error("edge provenance required");
    edges.add(edge.edgeId);
  }

  for (const link of graph.memoryLinks) {
    if (!link.linkId || !link.memoryId || !people.has(link.personId)) throw new Error("invalid memory link");
    if (!["active","hidden","vaulted","deleted","revoked"].includes(link.status)) throw new Error("invalid memory link status");
    if (!Array.isArray(link.provenance) || link.provenance.length === 0) throw new Error("memory link provenance required");
  }

  return true;
}

function nextRevision(graph, operation) {
  const copy = clone(graph);
  copy.revision = (Number(copy.revision) || 0) + 1;
  copy.history = [...(copy.history ?? []), operation];
  validateRelationshipGraph(copy);
  return copy;
}

export function applyRelationshipOperation(graph, operation) {
  validateRelationshipGraph(graph);
  if (!operation?.type || !operation.actorId || !operation.at) throw new Error("audited operation required");

  const op = {
    operationId: operation.operationId ?? "op-" + String((graph.history?.length ?? 0) + 1).padStart(4, "0"),
    type: operation.type,
    actorId: operation.actorId,
    at: operation.at,
    targetId: operation.targetId,
    reason: operation.reason ?? "user_control",
  };

  const copy = clone(graph);

  if (operation.type === "CORRECT_PERSON") {
    const person = copy.people.find((x) => x.personId === operation.targetId);
    if (!person) throw new Error("person not found");
    const allowed = new Set(["displayName","kind","visibility","notes"]);
    for (const key of Object.keys(operation.patch ?? {})) {
      if (!allowed.has(key)) throw new Error("correction field not allowed: " + key);
    }
    Object.assign(person, operation.patch);
    person.provenance.push({ type:"user_correction", ref:op.operationId, at:op.at });
  } else if (["HIDE_PERSON","VAULT_PERSON","DELETE_PERSON"].includes(operation.type)) {
    const person = copy.people.find((x) => x.personId === operation.targetId);
    if (!person) throw new Error("person not found");
    const state = { HIDE_PERSON:"hidden", VAULT_PERSON:"vaulted", DELETE_PERSON:"deleted" }[operation.type];
    person.status = state;
    for (const edge of copy.edges) {
      if (edge.fromPersonId === person.personId || edge.toPersonId === person.personId) edge.status = state;
    }
    for (const link of copy.memoryLinks) {
      if (link.personId === person.personId) link.status = state;
    }
  } else if (operation.type === "UNLINK_MEMORY") {
    const link = copy.memoryLinks.find((x) => x.linkId === operation.targetId);
    if (!link) throw new Error("memory link not found");
    link.status = "revoked";
  } else if (operation.type === "REVOKE_EDGE") {
    const edge = copy.edges.find((x) => x.edgeId === operation.targetId);
    if (!edge) throw new Error("edge not found");
    edge.status = "revoked";
  } else {
    throw new Error("unsupported relationship operation: " + operation.type);
  }

  return nextRevision(copy, op);
}

export function exportRelationshipGraph(graph) {
  validateRelationshipGraph(graph);
  return {
    version: graph.version,
    graphId: graph.graphId,
    revision: graph.revision,
    people: graph.people.filter((x) => x.status !== "deleted"),
    edges: graph.edges.filter((x) => x.status !== "deleted"),
    memoryLinks: graph.memoryLinks.filter((x) => x.status !== "deleted"),
    history: graph.history ?? [],
    exportSemantics: {
      relationshipScoresPresent: false,
      syntheticFixtureSafe: Boolean(graph.synthetic),
    },
  };
}

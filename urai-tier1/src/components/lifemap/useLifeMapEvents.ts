"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query, type DocumentData } from "firebase/firestore";
import { parseSelectedMemory, sanitizeMemoryId, type SelectedMemory } from "@/spatial/memory/selectedMemoryContract";
import { isConsentPolicy } from "@/app/privacy-controls/consentModel";
import { firebasePublicEnvReady, getFirebaseDb } from "../../lib/firebase/client";
import { canonicalLifeMapDemoNodes } from "./canonicalLifeMapDemoNodes";
import { lifeMapEventPrivacyLevel, lifeMapFilterVisibleNodes, lifeMapHiddenEventMemoryIds, lifeMapEventCoverageComplete } from "./lifeMapPhysicalStarAction.mjs";
import { lifeMapDisplayPosition } from "./lifeMapLayout";
import {
  lifeMapEras,
  mapLifeMapEventToNode,
  type LifeMapEra,
  type LifeMapEraType,
  type LifeMapEvent,
  type LifeMapEventSourceType,
  type LifeMapNode,
  type LifeMapNodeType,
} from "./lifeMapData";

export type LifeMapSourceMode = "private" | "explicit-demo" | "signed-out" | "unavailable" | "empty" | "error";

type LifeMapEventState = {
  nodes: LifeMapNode[];
  eras: LifeMapEra[];
  loading: boolean;
  error: string | null;
  usingSeedData: boolean;
  sourceMode: LifeMapSourceMode;
};

const NODE_TYPES = ["memory", "season", "ritual", "forecast", "threshold", "relationship", "recovery", "legacy"] as const satisfies readonly LifeMapNodeType[];
const SOURCE_TYPES = ["audio", "conversation", "ritual", "forecast", "manual_seed", "system_generated", "relationship", "recovery", "legacy"] as const satisfies readonly LifeMapEventSourceType[];
const ERA_TYPES = ["all", "season", "relationship", "recovery", "work", "family", "threshold", "custom", "system_generated"] as const satisfies readonly LifeMapEraType[];
const positionedDemoNodes = canonicalLifeMapDemoNodes.map((node) => ({ ...node, position: lifeMapDisplayPosition(node) }));

function asNodeType(value: unknown): LifeMapNodeType {
  return typeof value === "string" && NODE_TYPES.includes(value as LifeMapNodeType) ? value as LifeMapNodeType : "memory";
}

function asSourceType(value: unknown): LifeMapEventSourceType {
  return typeof value === "string" && SOURCE_TYPES.includes(value as LifeMapEventSourceType) ? value as LifeMapEventSourceType : "system_generated";
}

function asEraType(value: unknown): LifeMapEraType {
  return typeof value === "string" && ERA_TYPES.includes(value as LifeMapEraType) ? value as LifeMapEraType : "system_generated";
}

function asPosition(value: unknown): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 3 || !value.every((entry) => typeof entry === "number" && Number.isFinite(entry))) return undefined;
  return value as [number, number, number];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function normalizeEvent(id: string, data: DocumentData, ownerId = ""): LifeMapEvent {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : ownerId,
    title: typeof data.title === "string" ? data.title : "Life Map Signal",
    subtitle: typeof data.subtitle === "string" ? data.subtitle : undefined,
    summary: typeof data.summary === "string" ? data.summary : "A private URAI Life Map signal ready for spatial rendering.",
    type: asNodeType(data.type),
    sourceType: asSourceType(data.sourceType),
    sourceId: typeof data.sourceId === "string" ? data.sourceId : undefined,
    memoryId: sanitizeMemoryId(typeof data.memoryId === "string" ? data.memoryId : null) ?? undefined,
    occurredAt: data.occurredAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    intensity: typeof data.intensity === "number" ? data.intensity : .5,
    aura: typeof data.aura === "string" ? data.aura : undefined,
    position: asPosition(data.position),
    clusterId: typeof data.clusterId === "string" ? data.clusterId : undefined,
    eraId: typeof data.eraId === "string" ? data.eraId : undefined,
    replayAvailable: Boolean(data.replayAvailable),
    locked: Boolean(data.locked),
    connectedTo: asStringArray(data.connectedTo),
    privacyLevel: lifeMapEventPrivacyLevel(data),
    narratorHint: typeof data.narratorHint === "string" ? data.narratorHint : undefined,
    tags: Array.isArray(data.tags) ? asStringArray(data.tags) : undefined,
  };
}

function normalizeEra(id: string, data: DocumentData, ownerId = ""): LifeMapEra {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : ownerId,
    title: typeof data.title === "string" ? data.title : "Life Map Era",
    subtitle: typeof data.subtitle === "string" ? data.subtitle : undefined,
    startLabel: typeof data.startLabel === "string" ? data.startLabel : "Now",
    endLabel: typeof data.endLabel === "string" ? data.endLabel : undefined,
    type: asEraType(data.type),
    summary: typeof data.summary === "string" ? data.summary : "A private URAI Life Map era.",
    dominantAura: typeof data.dominantAura === "string" ? data.dominantAura : "#8adfff",
    nodeIds: asStringArray(data.nodeIds),
  };
}

function explicitDemoEnabled(explicitUserId?: string) {
  return explicitUserId === "demo-user";
}

function resolveUserId(explicitUserId?: string): string | null {
  if (explicitUserId && explicitUserId !== "demo-user") return explicitUserId;
  return null;
}

export function useLifeMapEvents(userId?: string): LifeMapEventState {
  const explicitDemo = useMemo(() => explicitDemoEnabled(userId), [userId]);
  const resolvedUserId = useMemo(() => resolveUserId(userId), [userId]);
  const [consent, setConsent] = useState<{ owner: string | null; revision: number; allowed: boolean; checked: boolean }>(
    { owner: null, revision: -1, allowed: false, checked: false },
  );
  const consentAllowed = !explicitDemo && Boolean(resolvedUserId) && consent.owner === resolvedUserId && consent.allowed;
  // Revision owns loaded private data, not just the account. A new grant must
  // re-observe memory/event/era documents before anything becomes visible.
  const authorityKey = consentAllowed ? `${resolvedUserId}:${consent.revision}` : null;
  const [nodes, setNodes] = useState<LifeMapNode[]>(() => explicitDemo ? positionedDemoNodes : []);
  const [eras, setEras] = useState<LifeMapEra[]>(() => explicitDemo ? lifeMapEras : []);
  const [canonicalMemories, setCanonicalMemories] = useState<Map<string, SelectedMemory>>(new Map());
  const [memoriesOwner, setMemoriesOwner] = useState<string | null>(null);
  const [memoriesLoading, setMemoriesLoading] = useState(!explicitDemo);
  const [memoriesError, setMemoriesError] = useState<string | null>(null);
  // Identity changes can render before the old Firestore listener's useEffect
  // cleanup runs. Fence previously loaded private data synchronously during
  // render, rather than briefly showing another actor's Life Map.
  const [nodesOwner, setNodesOwner] = useState<string | null>(() => explicitDemo ? 'demo-user' : null);
  const [erasOwner, setErasOwner] = useState<string | null>(() => explicitDemo ? 'demo-user' : null);
  const [nodesAuthority, setNodesAuthority] = useState<string | null>(null);
  const [erasAuthority, setErasAuthority] = useState<string | null>(null);
  const [memoriesAuthority, setMemoriesAuthority] = useState<string | null>(null);
  const currentOwner = explicitDemo ? 'demo-user' : resolvedUserId;
  const currentNodes = nodesOwner === currentOwner ? nodes : [];
  const currentMemories = memoriesOwner === currentOwner ? canonicalMemories : new Map<string, SelectedMemory>();
  const visibleNodes = lifeMapFilterVisibleNodes(explicitDemo || (authorityKey !== null && nodesAuthority === authorityKey) ? currentNodes : []);
  const visibleMemories = authorityKey !== null && memoriesAuthority === authorityKey ? currentMemories : new Map<string, SelectedMemory>();
  // A limited/cached event query cannot prove that no older hidden event exists.
  // Never create fallback stars until a complete server-confirmed event snapshot.
  const [eventsSnapshotComplete, setEventSnapshotComplete] = useState(false);
  // Unlike the ordered display query, this owner-scoped audit includes legacy
  // documents without occurredAt. The second source is a privacy VETO, never
  // a permission to render records or bypass the canonical memory contract.
  const [unorderedEventCoverage, setUnorderedEventCoverage] = useState<{
    owner: string; authority: string; complete: boolean; hiddenIds: ReadonlySet<string>;
  } | null>(null);
  const resolvedNodes = useMemo(() => {
    if (explicitDemo) return visibleNodes;
    const fromEvents: LifeMapNode[] = visibleNodes.flatMap((node): LifeMapNode[] => {
      // A hidden event is not a visible landmark even if an older client
      // retained its coordinates, metadata or connections in a snapshot.
      if (node.privacyLevel === 'hidden') return [];
      const memoryId = sanitizeMemoryId(node.memoryId);
      const authoritative = memoryId && node.type === "memory" ? visibleMemories.get(memoryId) : undefined;
      // A revoked/deleted/absent canonical memory must leave NO event-backed
      // Memory Star, not even a redacted marker at its old coordinates.
      // Directly navigating to an unavailable memory still has its own truthful
      // accessible Focus/Replay fallback; the private galaxy cannot reveal it.
      if (node.type === 'memory' && !authoritative) return [];
      if (!authoritative) return [{ ...node, authorizedMemory: false,
        // A contextual signal is not authority for another private memory.
        memoryId: undefined, replayAvailable: false, replayManifestId: undefined,
        locked: Boolean(node.locked) }];
      return [{ ...node, id: node.id, memoryId: authoritative.id,
        // Event identity owns the constellation, graph links and camera anchor;
        // the separately verified memory owns personal historical content.
        title: authoritative.title, summary: authoritative.summary,
        replayAvailable: Boolean(node.replayAvailable), locked: Boolean(node.locked),
        authorizedMemory: true, replayManifestId: authoritative.replayManifest.id }];
    });
    // Source/event pipelines do not always materialize a separate lifeMapEvents
    // document. Admit an already owner-verified canonical memory as a real
    // Memory Star once all three private streams are current for this consent revision.
    // This projects stored evidence; it does not invent graph links or claims.
    if (authorityKey === null || nodesAuthority !== authorityKey || erasAuthority !== authorityKey || memoriesAuthority !== authorityKey) return fromEvents;
    if (!eventsSnapshotComplete) return fromEvents;
    if (!unorderedEventCoverage || unorderedEventCoverage.owner !== resolvedUserId
      || unorderedEventCoverage.authority !== authorityKey || !unorderedEventCoverage.complete) return fromEvents;
    const hiddenEventMemoryIds = new Set(lifeMapHiddenEventMemoryIds(currentNodes));
    for (const id of unorderedEventCoverage.hiddenIds) hiddenEventMemoryIds.add(id);
    const eventMemoryIds = new Set(visibleNodes.filter(node => node.type === 'memory')
      .map(node => sanitizeMemoryId(node.memoryId)).filter((id): id is string => Boolean(id)));
    const usedNodeIds = new Set(fromEvents.map(node => node.id));
    for (const memory of visibleMemories.values()) {
      if (fromEvents.length >= 240) break;
      if (memory.privacy === 'hidden' || memory.demo || memory.ownerId !== resolvedUserId
        || !memory.star || !Array.isArray(memory.star.position)
        || hiddenEventMemoryIds.has(memory.id) || eventMemoryIds.has(memory.id)) continue;
      const id = `canonical-memory:${memory.id}`;
      if (usedNodeIds.has(id)) continue;
      fromEvents.push({
        id, type: 'memory', memoryId: memory.id, authorizedMemory: true,
        replayManifestId: memory.replayManifest.id,
        title: memory.title, summary: memory.summary, subtitle: 'Your memory',
        occurredAt: memory.occurredAt, dateLabel: memory.occurredAt.slice(0, 10),
        position: memory.star.position,
        intensity: Math.min(1, Math.max(0.2, memory.star.scale)),
        aura: memory.star.aura, replayAvailable: memory.replayManifest.segments.length > 0,
        locked: false, privacyLevel: memory.privacy, connectedTo: [],
      });
      usedNodeIds.add(id);
    }
    return fromEvents;
  }, [visibleNodes, visibleMemories, currentNodes, explicitDemo, authorityKey, nodesAuthority, erasAuthority, memoriesAuthority, eventsSnapshotComplete, unorderedEventCoverage, resolvedUserId]);
  const currentEras = erasOwner === currentOwner ? eras : [];
  const visibleEras = explicitDemo || (authorityKey !== null && erasAuthority === authorityKey) ? currentEras : [];
  const [eventsLoading, setEventsLoading] = useState(!explicitDemo);
  const [erasLoading, setErasLoading] = useState(!explicitDemo);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [erasError, setErasError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (explicitDemo || !resolvedUserId || !firebasePublicEnvReady) {
      setConsent({ owner: null, revision: -1, allowed: false, checked: false });
      return () => { cancelled = true; };
    }
    const owner = resolvedUserId;
    let revision = -1;
    let deniedRevision: number | null = null;
    const publish = (allowed: boolean, checked = true) => {
      if (!cancelled) setConsent({ owner, revision, allowed, checked });
    };
    publish(false, false);
    try {
      const unsubscribe = onSnapshot(doc(getFirebaseDb(), 'users', owner, 'privacyPolicy', 'current'), snapshot => {
        if (cancelled) return;
        const raw = snapshot.exists() ? snapshot.data() : null;
        if (!isConsentPolicy(raw, owner)) { deniedRevision = Math.max(deniedRevision ?? -1, revision); publish(false); return; }
        if (raw.revision < revision) { deniedRevision = revision; publish(false); return; }
        revision = raw.revision;
        const memory = raw.domains.memory;
        const permitted = raw.enforcement.state === 'fully-enforced'
          && (memory.mode === 'granted' || memory.mode === 'limited') && memory.lifeMapVisible;
        if (!permitted) { deniedRevision = revision; publish(false); return; }
        if (deniedRevision !== null && revision <= deniedRevision) { publish(false); return; }
        publish(true);
      }, () => { deniedRevision = Math.max(deniedRevision ?? -1, revision); publish(false); });
      return () => { cancelled = true; unsubscribe(); };
    } catch {
      deniedRevision = Math.max(deniedRevision ?? -1, revision);
      publish(false);
      return () => { cancelled = true; };
    }
  }, [explicitDemo, resolvedUserId]);

  useEffect(() => {
    let cancelled = false;
    if (explicitDemo) {
      setNodes(positionedDemoNodes);
      setEventSnapshotComplete(false);
      setNodesOwner('demo-user');
      setEventsLoading(false);
      setEventsError(null);
      return () => { cancelled = true; };
    }
    if (!resolvedUserId) {
      setNodes([]);
      setEventSnapshotComplete(false);
      setNodesOwner(null);
      setEventsLoading(false);
      setEventsError("Sign in to open your private Life Map.");
      return () => { cancelled = true; };
    }
    if (!firebasePublicEnvReady) {
      setNodes([]);
      setEventSnapshotComplete(false);
      setNodesOwner(resolvedUserId);
      setEventsLoading(false);
      setEventsError("Your private Life Map is temporarily unavailable.");
      return () => { cancelled = true; };
    }
    if (!authorityKey) {
      setNodes([]); setNodesOwner(resolvedUserId); setNodesAuthority(null);
      setEventSnapshotComplete(false);
      setEventsLoading(false); setEventsError(null);
      return () => { cancelled = true; };
    }
    setEventsLoading(true);
    setEventSnapshotComplete(false);
    try {
      const eventsQuery = query(collection(getFirebaseDb(), "users", resolvedUserId, "lifeMapEvents"), orderBy("occurredAt", "desc"), limit(240));
      const unsubscribe = onSnapshot(eventsQuery, { includeMetadataChanges: true }, (snapshot) => {
        if (cancelled) return;
        setNodes(snapshot.docs.map((doc) => mapLifeMapEventToNode(normalizeEvent(doc.id, doc.data(), resolvedUserId))));
        setEventSnapshotComplete(snapshot.docs.length < 240 && snapshot.metadata.fromCache === false);
        setNodesOwner(resolvedUserId);
        setNodesAuthority(authorityKey);
        setEventsLoading(false);
        setEventsError(null);
      }, (snapshotError) => {
        if (cancelled) return;
        setNodes([]);
        setEventSnapshotComplete(false);
        setNodesOwner(resolvedUserId);
        setNodesAuthority(authorityKey);
        setEventsLoading(false);
        setEventsError(snapshotError instanceof Error ? snapshotError.message : "Life Map events could not be loaded.");
      });
      return () => { cancelled = true; unsubscribe(); };
    } catch (caught) {
      setNodes([]);
      setEventSnapshotComplete(false);
      setNodesOwner(resolvedUserId);
      setNodesAuthority(authorityKey);
      setEventsLoading(false);
      setEventsError(caught instanceof Error ? caught.message : "Life Map events could not be loaded.");
      return () => { cancelled = true; };
    }
  }, [explicitDemo, resolvedUserId, authorityKey]);

  useEffect(() => {
    let cancelled = false;
    setUnorderedEventCoverage(null);
    if (explicitDemo || !resolvedUserId || !firebasePublicEnvReady || !authorityKey) {
      return () => { cancelled = true; };
    }
    const owner = resolvedUserId, authority = authorityKey;
    try {
      // The recent-events query orders by occurredAt, which excludes legacy
      // documents missing that field. This complementary unordered query
      // proves whether ALL owner events, including hidden legacy ones, were
      // observed. At a 240-document cap or on cached/error data, fail closed.
      const coverageQuery = query(collection(getFirebaseDb(), "users", owner, "lifeMapEvents"), limit(240));
      const unsubscribe = onSnapshot(coverageQuery, { includeMetadataChanges: true }, snapshot => {
        if (cancelled) return;
        try {
          const normalized = snapshot.docs.map(doc => normalizeEvent(doc.id, doc.data(), owner));
          setUnorderedEventCoverage({
            owner, authority,
            complete: lifeMapEventCoverageComplete(snapshot.docs.length, snapshot.metadata.fromCache),
            hiddenIds: lifeMapHiddenEventMemoryIds(normalized),
          });
        } catch {
          setUnorderedEventCoverage(null);
        }
      }, () => { if (!cancelled) setUnorderedEventCoverage(null); });
      return () => { cancelled = true; unsubscribe(); };
    } catch {
      setUnorderedEventCoverage(null);
      return () => { cancelled = true; };
    }
  }, [explicitDemo, resolvedUserId, authorityKey]);

  useEffect(() => {
    let cancelled = false;
    if (explicitDemo) {
      setEras(lifeMapEras);
      setErasOwner('demo-user');
      setErasLoading(false);
      setErasError(null);
      return () => { cancelled = true; };
    }
    if (!resolvedUserId || !firebasePublicEnvReady) {
      setEras([]);
      setErasOwner(resolvedUserId);
      setErasLoading(false);
      setErasError(null);
      return () => { cancelled = true; };
    }
    if (!authorityKey) {
      setEras([]); setErasOwner(resolvedUserId); setErasAuthority(null);
      setErasLoading(false); setErasError(null);
      return () => { cancelled = true; };
    }
    setErasLoading(true);
    try {
      const erasQuery = query(collection(getFirebaseDb(), "users", resolvedUserId, "lifeMapEras"), limit(80));
      const unsubscribe = onSnapshot(erasQuery, (snapshot) => {
        if (cancelled) return;
        setEras(snapshot.docs.map((doc) => normalizeEra(doc.id, doc.data(), resolvedUserId)));
        setErasOwner(resolvedUserId);
        setErasAuthority(authorityKey);
        setErasLoading(false);
        setErasError(null);
      }, (snapshotError) => {
        if (cancelled) return;
        setEras([]);
        setErasOwner(resolvedUserId);
        setErasAuthority(authorityKey);
        setErasLoading(false);
        setErasError(snapshotError instanceof Error ? snapshotError.message : "Life Map eras could not be loaded.");
      });
      return () => { cancelled = true; unsubscribe(); };
    } catch (caught) {
      setEras([]);
      setErasOwner(resolvedUserId);
      setErasAuthority(authorityKey);
      setErasLoading(false);
      setErasError(caught instanceof Error ? caught.message : "Life Map eras could not be loaded.");
      return () => { cancelled = true; };
    }
  }, [explicitDemo, resolvedUserId, authorityKey]);

  useEffect(() => {
    let cancelled = false;
    if (explicitDemo || !resolvedUserId || !firebasePublicEnvReady) {
      setCanonicalMemories(new Map());
      setMemoriesOwner(explicitDemo ? 'demo-user' : resolvedUserId);
      setMemoriesLoading(false);
      setMemoriesError(null);
      return () => { cancelled = true; };
    }
    if (!authorityKey) {
      setCanonicalMemories(new Map()); setMemoriesOwner(resolvedUserId);
      setMemoriesAuthority(null); setMemoriesLoading(false);
      setMemoriesError(null);
      return () => { cancelled = true; };
    }
    setMemoriesLoading(true);
    setMemoriesError(null);
    // Canonical private memory documents are server-authored, owner-readable.
    // No data from this subscription is made accessible across account changes.
    // A Firestore subscription can throw while being constructed, and a
    // malformed persisted document can throw while its snapshot is parsed.
    // Both must clear cached private bytes/metadata and end the spinner.
    const memoryUnavailable = () => {
      if (cancelled) return;
      setCanonicalMemories(new Map());
      setMemoriesOwner(resolvedUserId);
      setMemoriesAuthority(authorityKey);
      setMemoriesLoading(false);
      setMemoriesError("Private memories could not be verified.");
    };
    try {
      const unsub = onSnapshot(
        query(collection(getFirebaseDb(), "users", resolvedUserId, "memories"), limit(240)),
        snapshot => {
          if (cancelled) return;
          try {
            const accepted = new Map<string, SelectedMemory>();
            for (const doc of snapshot.docs) {
              const parsed = parseSelectedMemory(doc.data(), resolvedUserId, doc.id, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
              if (parsed.status === 'ready' && parsed.memory.privacy !== 'hidden') accepted.set(doc.id, parsed.memory);
            }
            setCanonicalMemories(accepted);
            setMemoriesOwner(resolvedUserId);
            setMemoriesAuthority(authorityKey);
            setMemoriesLoading(false);
            setMemoriesError(null);
          } catch {
            memoryUnavailable();
          }
        },
        memoryUnavailable,
      );
      return () => { cancelled = true; unsub(); };
    } catch {
      memoryUnavailable();
      return () => { cancelled = true; };
    }
  }, [explicitDemo, resolvedUserId, authorityKey]);

  const loading = (Boolean(resolvedUserId) && !explicitDemo && (!consent.checked || consent.owner !== resolvedUserId))
    || (authorityKey !== null && (nodesAuthority !== authorityKey || erasAuthority !== authorityKey || memoriesAuthority !== authorityKey))
    || eventsLoading || erasLoading || memoriesLoading || (Boolean(resolvedUserId) && consentAllowed && (nodesOwner !== currentOwner || erasOwner !== currentOwner || memoriesOwner !== currentOwner));
  const error = eventsError || erasError || memoriesError;
  const sourceMode: LifeMapSourceMode = explicitDemo ? "explicit-demo" : !resolvedUserId ? "signed-out" : !firebasePublicEnvReady || (!consentAllowed && consent.checked) ? "unavailable" : error ? "error" : !loading && resolvedNodes.length === 0 ? "empty" : "private";
  return { nodes: resolvedNodes, eras: visibleEras, loading, error, usingSeedData: explicitDemo, sourceMode };
}

export const __lifeMapEventNormalizationForTests = {
  asLifeMapNodeType: asNodeType,
  asLifeMapEventSourceType: asSourceType,
  asLifeMapEraType: asEraType,
  normalizeEvent,
  normalizeEra,
  resolveUserId,
  explicitDemoEnabled,
};

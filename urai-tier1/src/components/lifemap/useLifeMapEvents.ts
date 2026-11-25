"use client";

import { useEffect, useMemo, useState } from "react";
import type { DocumentData } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { firebasePublicEnvReady, getUrAiAuth } from "../../lib/firebase/client";
import { getOperationalLifeMapSnapshot } from "../../lib/privacy/operationalPrivacyClient";
import { MANUAL_WEATHER_RESET_EVENT } from "../../lib/uraiEmotion/manualWeatherSession";
import { canonicalLifeMapDemoNodes } from "./canonicalLifeMapDemoNodes";
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

export type LifeMapSourceMode = "private" | "explicit-demo" | "signed-out" | "unavailable" | "empty" | "denied" | "error";

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
    privacyLevel: data.privacyLevel === "hidden" || data.privacyLevel === "shareable" ? data.privacyLevel : "private",
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

const retryEvent = "urai:retry-private-life-map";

export function retryPrivateLifeMap() {
  window.dispatchEvent(new Event(retryEvent));
}

export function useLifeMapEvents(userId?: string): LifeMapEventState {
  const explicitDemo = useMemo(() => explicitDemoEnabled(userId), [userId]);
  const resolvedUserId = useMemo(() => resolveUserId(userId), [userId]);
  const [nodes, setNodes] = useState<LifeMapNode[]>(() => explicitDemo ? positionedDemoNodes : []);
  const [eras, setEras] = useState<LifeMapEra[]>(() => explicitDemo ? lifeMapEras : []);
  const [eventsLoading, setEventsLoading] = useState(!explicitDemo);
  const [erasLoading, setErasLoading] = useState(!explicitDemo);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [erasError, setErasError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [denied, setDenied] = useState(false);
  const [dataOwner, setDataOwner] = useState<object | null>(null);

  useEffect(() => {
    if (!resolvedUserId) return;
    // The scene, navigator and route bridge each own an existing subscription.
    // Retry all three from the same gesture without reloading the page.
    function retry() {
      setNodes([]);
      setDataOwner(null);
      setEras([]);
      setEventsLoading(true);
      setErasLoading(true);
      setEventsError(null);
      setErasError(null);
      setDenied(false);
      setAttempt((previous) => previous + 1);
    }
    window.addEventListener(retryEvent, retry);
    return () => window.removeEventListener(retryEvent, retry);
  }, [resolvedUserId]);

  useEffect(() => {
    let cancelled = false;
    let requestEpoch = 0;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    setNodes([]);
    setDataOwner(null);
    setEras([]);
    setDenied(false);
    setEventsError(null);
    setErasError(null);
    if (explicitDemo) {
      setNodes(positionedDemoNodes);
      setEras(lifeMapEras);
      setEventsLoading(false);
      setErasLoading(false);
      setEventsError(null);
      return () => { cancelled = true; };
    }
    if (!resolvedUserId) {
      setNodes([]);
      setEventsLoading(false);
      setErasLoading(false);
      setEventsError("Sign in to open your private Life Map.");
      return () => { cancelled = true; };
    }
    if (!firebasePublicEnvReady) {
      setNodes([]);
      setEventsLoading(false);
      setErasLoading(false);
      setEventsError("Your private Life Map is temporarily unavailable.");
      return () => { cancelled = true; };
    }
    setEventsLoading(true);
    setErasLoading(false);
    const owner = getUrAiAuth().currentUser;
    const current = () => !cancelled && owner?.uid === resolvedUserId && getUrAiAuth().currentUser === owner;
    function revoke() {
      ++requestEpoch;
      clearTimeout(refreshTimer);
      clearTimeout(expiryTimer);
      setNodes([]);
      setEras([]);
      setDataOwner(null);
      setDenied(true);
      setEventsLoading(false);
      // A local withdrawal clears immediately and cannot regrant itself before
      // the server mutation completes. A fresh explicit retry rechecks authority.
    }
    async function refresh() {
      const epoch = ++requestEpoch;
      const startedAt = performance.now();
      try {
        if (!current()) throw new Error("Life Map owner changed.");
        const snapshot = await getOperationalLifeMapSnapshot();
        if (!current() || requestEpoch !== epoch) return;
        if (snapshot.view !== 'life-map' || snapshot.owner !== resolvedUserId
          || !['available', 'denied'].includes(snapshot.state) || !Array.isArray(snapshot.events)
          || snapshot.events.length > 240 || !Array.isArray(snapshot.eras) || snapshot.eras.length !== 0
          || snapshot.events.some(event => !event || typeof event.id !== 'string' || event.userId !== resolvedUserId
            || event.replayAvailable !== false || event.locked !== false)) throw new Error('Invalid Life Map projection.');
        const lifetime = Number(snapshot.validUntil) - Number(snapshot.issuedAt);
        // Compare server timestamps to each other, then subtract the entire
        // client-observed request duration. Wall-clock skew cannot extend a lease.
        const remaining = lifetime - (performance.now() - startedAt);
        if (snapshot.state === 'available' && (!Number.isFinite(lifetime) || lifetime > 30_000 || !Number.isFinite(remaining) || remaining <= 0)) throw new Error('Expired Life Map projection.');
        setDenied(snapshot.state === 'denied');
        setDataOwner(owner);
        setNodes(snapshot.state === 'available' ? snapshot.events.map(event => mapLifeMapEventToNode(normalizeEvent(event.id, event, resolvedUserId))) : []);
        setEventsError(null);
        setEventsLoading(false);
        // Bounded display lease: an offline refresh may not retain private rows.
        clearTimeout(expiryTimer);
        if (snapshot.state === 'available') expiryTimer = setTimeout(() => { if (current()) { setNodes([]); setEventsError('Life Map access needs to be checked again.'); } }, remaining);
        refreshTimer = setTimeout(() => void refresh(), 15_000);
      } catch {
        if (cancelled || requestEpoch !== epoch) return;
        setDenied(false);
        setNodes([]);
        setEras([]);
        setEventsLoading(false);
        setEventsError('Life Map memories could not be loaded.');
      }
    }
    window.addEventListener(MANUAL_WEATHER_RESET_EVENT, revoke);
    const unsubscribeAuth = onAuthStateChanged(getUrAiAuth(), user => { if (user !== owner) revoke(); });
    void refresh();
    return () => {
      cancelled = true;
      ++requestEpoch;
      clearTimeout(refreshTimer);
      clearTimeout(expiryTimer);
      window.removeEventListener(MANUAL_WEATHER_RESET_EVENT, revoke);
      unsubscribeAuth();
    };
  }, [explicitDemo, resolvedUserId, attempt]);

  const loading = eventsLoading || erasLoading;
  const error = eventsError || erasError;
  const sourceMode: LifeMapSourceMode = explicitDemo ? "explicit-demo" : !resolvedUserId ? "signed-out" : !firebasePublicEnvReady ? "unavailable" : denied ? "denied" : error ? "error" : !loading && nodes.length === 0 ? "empty" : "private";
  const ownerMatches = explicitDemo || (firebasePublicEnvReady && resolvedUserId && getUrAiAuth().currentUser === dataOwner);
  return { nodes: ownerMatches ? nodes : [], eras: ownerMatches ? eras : [], loading, error, usingSeedData: explicitDemo, sourceMode };
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, type DocumentData } from "firebase/firestore";
import { firebasePublicEnvReady, getFirebaseDb } from "../../lib/firebase/client";
import { canonicalLifeMapDemoNodes } from "./canonicalLifeMapDemoNodes";
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

const LIFE_MAP_NODE_TYPES = [
  "memory",
  "season",
  "ritual",
  "forecast",
  "threshold",
  "relationship",
  "recovery",
  "legacy",
] as const satisfies readonly LifeMapNodeType[];

const LIFE_MAP_EVENT_SOURCE_TYPES = [
  "audio",
  "conversation",
  "ritual",
  "forecast",
  "manual_seed",
  "system_generated",
  "relationship",
  "recovery",
  "legacy",
] as const satisfies readonly LifeMapEventSourceType[];

const LIFE_MAP_ERA_TYPES = [
  "all",
  "season",
  "relationship",
  "recovery",
  "work",
  "family",
  "threshold",
  "custom",
  "system_generated",
] as const satisfies readonly LifeMapEraType[];

function asLifeMapNodeType(value: unknown): LifeMapNodeType {
  return typeof value === "string" && LIFE_MAP_NODE_TYPES.includes(value as LifeMapNodeType)
    ? (value as LifeMapNodeType)
    : "memory";
}

function asLifeMapEventSourceType(value: unknown): LifeMapEventSourceType {
  return typeof value === "string" && LIFE_MAP_EVENT_SOURCE_TYPES.includes(value as LifeMapEventSourceType)
    ? (value as LifeMapEventSourceType)
    : "system_generated";
}

function asLifeMapEraType(value: unknown): LifeMapEraType {
  return typeof value === "string" && LIFE_MAP_ERA_TYPES.includes(value as LifeMapEraType)
    ? (value as LifeMapEraType)
    : "system_generated";
}

function asLifeMapPosition(value: unknown): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 3) return undefined;
  if (!value.every((item) => typeof item === "number" && Number.isFinite(item))) return undefined;
  return value as [number, number, number];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeEvent(id: string, data: DocumentData, ownerId = ""): LifeMapEvent {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : ownerId,
    title: typeof data.title === "string" ? data.title : "Life Map Signal",
    subtitle: typeof data.subtitle === "string" ? data.subtitle : undefined,
    summary: typeof data.summary === "string" ? data.summary : "A private URAI Life Map signal ready for spatial rendering.",
    type: asLifeMapNodeType(data.type),
    sourceType: asLifeMapEventSourceType(data.sourceType),
    sourceId: typeof data.sourceId === "string" ? data.sourceId : undefined,
    occurredAt: data.occurredAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    intensity: typeof data.intensity === "number" ? data.intensity : 0.5,
    aura: typeof data.aura === "string" ? data.aura : undefined,
    position: asLifeMapPosition(data.position),
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
    type: asLifeMapEraType(data.type),
    summary: typeof data.summary === "string" ? data.summary : "A private URAI Life Map era.",
    dominantAura: typeof data.dominantAura === "string" ? data.dominantAura : "#8adfff",
    nodeIds: asStringArray(data.nodeIds),
  };
}

function explicitDemoEnabled(explicitUserId?: string) {
  if (explicitUserId === "demo-user") return true;
  if (process.env.NEXT_PUBLIC_URAI_EXPLICIT_DEMO === "true") return true;
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("urai:lifeMapDemoMode") === "true";
}

function resolveUserId(explicitUserId?: string): string | null {
  if (explicitUserId && explicitUserId !== "demo-user") return explicitUserId;
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem("urai:userId")?.trim();
  return stored || null;
}

export function useLifeMapEvents(userId?: string): LifeMapEventState {
  const explicitDemo = useMemo(() => explicitDemoEnabled(userId), [userId]);
  const resolvedUserId = useMemo(() => resolveUserId(userId), [userId]);
  const [nodes, setNodes] = useState<LifeMapNode[]>(() => explicitDemo ? canonicalLifeMapDemoNodes : []);
  const [eras, setEras] = useState<LifeMapEra[]>(() => explicitDemo ? lifeMapEras : []);
  const [eventsLoading, setEventsLoading] = useState(!explicitDemo);
  const [erasLoading, setErasLoading] = useState(!explicitDemo);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [erasError, setErasError] = useState<string | null>(null);
  const [usingSeedNodes, setUsingSeedNodes] = useState(explicitDemo);
  const [usingSeedEras, setUsingSeedEras] = useState(explicitDemo);

  useEffect(() => {
    let cancelled = false;

    if (explicitDemo) {
      setNodes(canonicalLifeMapDemoNodes);
      setUsingSeedNodes(true);
      setEventsLoading(false);
      setEventsError(null);
      return () => { cancelled = true; };
    }

    setUsingSeedNodes(false);

    if (!resolvedUserId) {
      setNodes([]);
      setEventsLoading(false);
      setEventsError("Sign in to open your private Life Map.");
      return () => { cancelled = true; };
    }

    if (!firebasePublicEnvReady) {
      setNodes([]);
      setEventsLoading(false);
      setEventsError("Your private Life Map is temporarily unavailable.");
      return () => { cancelled = true; };
    }

    try {
      const db = getFirebaseDb();
      const eventsRef = collection(db, "users", resolvedUserId, "lifeMapEvents");
      const eventsQuery = query(eventsRef, orderBy("occurredAt", "desc"), limit(240));

      const unsubscribe = onSnapshot(
        eventsQuery,
        (snapshot) => {
          if (cancelled) return;
          const nextNodes = snapshot.docs.map((doc) => mapLifeMapEventToNode(normalizeEvent(doc.id, doc.data(), resolvedUserId)));
          setNodes(nextNodes);
          setEventsLoading(false);
          setEventsError(null);
        },
        (snapshotError) => {
          if (cancelled) return;
          setNodes([]);
          setEventsLoading(false);
          setEventsError(snapshotError instanceof Error ? snapshotError.message : "Life Map events could not be loaded.");
        },
      );

      return () => {
        cancelled = true;
        unsubscribe();
      };
    } catch (caught) {
      setNodes([]);
      setEventsLoading(false);
      setEventsError(caught instanceof Error ? caught.message : "Life Map events could not be loaded.");
      return () => { cancelled = true; };
    }
  }, [explicitDemo, resolvedUserId]);

  useEffect(() => {
    let cancelled = false;

    if (explicitDemo) {
      setEras(lifeMapEras);
      setUsingSeedEras(true);
      setErasLoading(false);
      setErasError(null);
      return () => { cancelled = true; };
    }

    setUsingSeedEras(false);

    if (!resolvedUserId) {
      setEras([]);
      setErasLoading(false);
      setErasError(null);
      return () => { cancelled = true; };
    }

    if (!firebasePublicEnvReady) {
      setEras([]);
      setErasLoading(false);
      setErasError(null);
      return () => { cancelled = true; };
    }

    try {
      const db = getFirebaseDb();
      const erasRef = collection(db, "users", resolvedUserId, "lifeMapEras");
      const erasQuery = query(erasRef, limit(80));

      const unsubscribe = onSnapshot(
        erasQuery,
        (snapshot) => {
          if (cancelled) return;
          setEras(snapshot.docs.map((doc) => normalizeEra(doc.id, doc.data(), resolvedUserId)));
          setErasLoading(false);
          setErasError(null);
        },
        (snapshotError) => {
          if (cancelled) return;
          setEras([]);
          setErasLoading(false);
          setErasError(snapshotError instanceof Error ? snapshotError.message : "Life Map eras could not be loaded.");
        },
      );

      return () => {
        cancelled = true;
        unsubscribe();
      };
    } catch (caught) {
      setEras([]);
      setErasLoading(false);
      setErasError(caught instanceof Error ? caught.message : "Life Map eras could not be loaded.");
      return () => { cancelled = true; };
    }
  }, [explicitDemo, resolvedUserId]);

  const loading = eventsLoading || erasLoading;
  const error = eventsError || erasError;
  const usingSeedData = explicitDemo && (usingSeedNodes || usingSeedEras);
  const sourceMode: LifeMapSourceMode = explicitDemo
    ? "explicit-demo"
    : !resolvedUserId
      ? "signed-out"
      : !firebasePublicEnvReady
        ? "unavailable"
        : error
          ? "error"
          : !loading && nodes.length === 0
            ? "empty"
            : "private";

  return { nodes, eras, loading, error, usingSeedData, sourceMode };
}

export const __lifeMapEventNormalizationForTests = {
  asLifeMapNodeType,
  asLifeMapEventSourceType,
  asLifeMapEraType,
  normalizeEvent,
  normalizeEra,
  resolveUserId,
  explicitDemoEnabled,
};

"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, type DocumentData } from "firebase/firestore";
import { getFirebaseDb } from "../../lib/firebase/client";
import {
  lifeMapEras,
  lifeMapNodes,
  mapLifeMapEventToNode,
  type LifeMapEra,
  type LifeMapEraType,
  type LifeMapEvent,
  type LifeMapEventSourceType,
  type LifeMapNode,
  type LifeMapNodeType,
} from "./lifeMapData";

type LifeMapEventState = {
  nodes: LifeMapNode[];
  eras: LifeMapEra[];
  loading: boolean;
  error: string | null;
  usingSeedData: boolean;
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

function normalizeEvent(id: string, data: DocumentData): LifeMapEvent {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : "demo-user",
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

function normalizeEra(id: string, data: DocumentData): LifeMapEra {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : "demo-user",
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

function resolveUserId(explicitUserId?: string) {
  if (explicitUserId) return explicitUserId;
  if (typeof window === "undefined") return "demo-user";
  return window.localStorage.getItem("urai:userId") || "demo-user";
}

export function useLifeMapEvents(userId?: string): LifeMapEventState {
  const resolvedUserId = useMemo(() => resolveUserId(userId), [userId]);
  const [state, setState] = useState<LifeMapEventState>({
    nodes: lifeMapNodes,
    eras: lifeMapEras,
    loading: true,
    error: null,
    usingSeedData: true,
  });

  useEffect(() => {
    let cancelled = false;

    try {
      const db = getFirebaseDb();
      const eventsRef = collection(db, "users", resolvedUserId, "lifeMapEvents");
      const eventsQuery = query(eventsRef, orderBy("occurredAt", "desc"), limit(240));

      const unsubscribe = onSnapshot(
        eventsQuery,
        (snapshot) => {
          if (cancelled) return;
          const nodes = snapshot.docs.map((doc) => mapLifeMapEventToNode(normalizeEvent(doc.id, doc.data())));
          setState({
            nodes: nodes.length ? nodes : lifeMapNodes,
            eras: lifeMapEras,
            loading: false,
            error: null,
            usingSeedData: nodes.length === 0,
          });
        },
        (error) => {
          if (cancelled) return;
          setState({
            nodes: lifeMapNodes,
            eras: lifeMapEras,
            loading: false,
            error: error instanceof Error ? error.message : "Life Map events could not be loaded.",
            usingSeedData: true,
          });
        },
      );

      return () => {
        cancelled = true;
        unsubscribe();
      };
    } catch (error) {
      setState({
        nodes: lifeMapNodes,
        eras: lifeMapEras,
        loading: false,
        error: error instanceof Error ? error.message : "Life Map events could not be loaded.",
        usingSeedData: true,
      });
      return () => {
        cancelled = true;
      };
    }
  }, [resolvedUserId]);

  return state;
}

export const __lifeMapEventNormalizationForTests = {
  asLifeMapNodeType,
  asLifeMapEventSourceType,
  asLifeMapEraType,
  normalizeEvent,
  normalizeEra,
};

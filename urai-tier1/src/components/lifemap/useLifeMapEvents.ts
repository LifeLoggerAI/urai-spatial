"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, type DocumentData } from "firebase/firestore";
import { getFirebaseDb } from "../../lib/firebase/client";
import {
  lifeMapEras,
  lifeMapNodes,
  mapLifeMapEventToNode,
  type LifeMapEra,
  type LifeMapEvent,
  type LifeMapNode,
} from "./lifeMapData";

type LifeMapEventState = {
  nodes: LifeMapNode[];
  eras: LifeMapEra[];
  loading: boolean;
  error: string | null;
  usingSeedData: boolean;
};

function normalizeEvent(id: string, data: DocumentData): LifeMapEvent {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : "demo-user",
    title: typeof data.title === "string" ? data.title : "Life Map Signal",
    subtitle: typeof data.subtitle === "string" ? data.subtitle : undefined,
    summary: typeof data.summary === "string" ? data.summary : "A private URAI Life Map signal ready for spatial rendering.",
    type: typeof data.type === "string" ? data.type : "memory",
    sourceType: typeof data.sourceType === "string" ? data.sourceType : "system_generated",
    sourceId: typeof data.sourceId === "string" ? data.sourceId : undefined,
    occurredAt: data.occurredAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    intensity: typeof data.intensity === "number" ? data.intensity : 0.5,
    aura: typeof data.aura === "string" ? data.aura : undefined,
    position: Array.isArray(data.position) && data.position.length === 3 ? data.position as [number, number, number] : undefined,
    clusterId: typeof data.clusterId === "string" ? data.clusterId : undefined,
    eraId: typeof data.eraId === "string" ? data.eraId : undefined,
    replayAvailable: Boolean(data.replayAvailable),
    locked: Boolean(data.locked),
    connectedTo: Array.isArray(data.connectedTo) ? data.connectedTo.filter((item: unknown) => typeof item === "string") : [],
    privacyLevel: data.privacyLevel === "hidden" || data.privacyLevel === "shareable" ? data.privacyLevel : "private",
    narratorHint: typeof data.narratorHint === "string" ? data.narratorHint : undefined,
    tags: Array.isArray(data.tags) ? data.tags.filter((item: unknown) => typeof item === "string") : undefined,
  };
}

function normalizeEra(id: string, data: DocumentData): LifeMapEra {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : "demo-user",
    title: typeof data.title === "string" ? data.title : "Life Map Era",
    subtitle: typeof data.subtitle === "string" ? data.subtitle : undefined,
    startLabel: typeof data.startLabel === "string" ? data.startLabel : "Open Arc",
    endLabel: typeof data.endLabel === "string" ? data.endLabel : undefined,
    type: typeof data.type === "string" ? data.type : "system_generated",
    summary: typeof data.summary === "string" ? data.summary : "A generated Life Map era.",
    dominantAura: typeof data.dominantAura === "string" ? data.dominantAura : "#8adfff",
    nodeIds: Array.isArray(data.nodeIds) ? data.nodeIds.filter((item: unknown) => typeof item === "string") : [],
  };
}

function resolveUserId(explicitUserId?: string) {
  if (explicitUserId) return explicitUserId;
  if (typeof window === "undefined") return "demo-user";
  return window.localStorage.getItem("urai:userId") || "demo-user";
}

export function useLifeMapEvents(userId?: string): LifeMapEventState {
  const resolvedUserId = useMemo(() => resolveUserId(userId), [userId]);
  const [nodes, setNodes] = useState<LifeMapNode[]>(lifeMapNodes);
  const [eras, setEras] = useState<LifeMapEra[]>(lifeMapEras);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [erasLoading, setErasLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingSeedNodes, setUsingSeedNodes] = useState(true);
  const [usingSeedEras, setUsingSeedEras] = useState(true);

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
          const nextNodes = snapshot.docs.map((doc) => mapLifeMapEventToNode(normalizeEvent(doc.id, doc.data())));
          setNodes(nextNodes.length ? nextNodes : lifeMapNodes);
          setUsingSeedNodes(nextNodes.length === 0);
          setEventsLoading(false);
          setError(null);
        },
        (error) => {
          if (cancelled) return;
          setNodes(lifeMapNodes);
          setUsingSeedNodes(true);
          setEventsLoading(false);
          setError(error instanceof Error ? error.message : "Life Map events could not be loaded.");
        },
      );

      return () => {
        cancelled = true;
        unsubscribe();
      };
    } catch (error) {
      setNodes(lifeMapNodes);
      setUsingSeedNodes(true);
      setEventsLoading(false);
      setError(error instanceof Error ? error.message : "Life Map events could not be loaded.");
      return () => {
        cancelled = true;
      };
    }
  }, [resolvedUserId]);

  useEffect(() => {
    let cancelled = false;

    try {
      const db = getFirebaseDb();
      const erasRef = collection(db, "users", resolvedUserId, "lifeMapEras");
      const erasQuery = query(erasRef, limit(80));

      const unsubscribe = onSnapshot(
        erasQuery,
        (snapshot) => {
          if (cancelled) return;
          const nextEras = snapshot.docs.map((doc) => normalizeEra(doc.id, doc.data()));
          setEras(nextEras.length ? nextEras : lifeMapEras);
          setUsingSeedEras(nextEras.length === 0);
          setErasLoading(false);
        },
        (error) => {
          if (cancelled) return;
          setEras(lifeMapEras);
          setUsingSeedEras(true);
          setErasLoading(false);
          setError(error instanceof Error ? error.message : "Life Map eras could not be loaded.");
        },
      );

      return () => {
        cancelled = true;
        unsubscribe();
      };
    } catch (error) {
      setEras(lifeMapEras);
      setUsingSeedEras(true);
      setErasLoading(false);
      setError(error instanceof Error ? error.message : "Life Map eras could not be loaded.");
      return () => {
        cancelled = true;
      };
    }
  }, [resolvedUserId]);

  return {
    nodes,
    eras,
    loading: eventsLoading || erasLoading,
    error,
    usingSeedData: usingSeedNodes || usingSeedEras,
  };
}

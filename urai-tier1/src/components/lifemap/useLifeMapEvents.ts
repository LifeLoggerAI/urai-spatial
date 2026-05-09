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

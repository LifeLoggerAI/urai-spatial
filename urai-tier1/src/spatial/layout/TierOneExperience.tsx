"use client";

import UraiSpatialStage from "@/spatial/v1/UraiSpatialStage";
import { LifeMapScene } from "@/spatial/v1/LifeMapScene";
import { MirrorOfBecomingView } from "@/spatial/v1/MirrorOfBecomingView";
import { lifeMapEdges, lifeMapNodes, mirrorStates, replayPaths } from "@/spatial/v1/lifeMapDemoData";

export type SceneMode = "home" | "ascent" | "life-map" | "demo" | "replay" | "focus" | "unwind" | "mirror";
export type TierOneExperienceMode = SceneMode;

type Props = {
  mode?: SceneMode;
};

const firstNodeId = lifeMapNodes[0]?.id;
const replayPath = replayPaths[0];
const mirror = mirrorStates[0];
const noop = () => {};
const noopNode = (_nodeId: string) => {};

export function TierOneExperience({ mode = "home" }: Props) {
  if (mode === "life-map" || mode === "demo") {
    return <LifeMapScene nodes={lifeMapNodes} edges={lifeMapEdges} replayPath={replayPath} replayActive={false} onSelectNode={noopNode} onCloseNode={noop} onStartReplay={noop} onOpenMirror={noop} onReturnHome={noop} />;
  }

  if (mode === "focus") {
    return <LifeMapScene nodes={lifeMapNodes} edges={lifeMapEdges} replayPath={replayPath} selectedNodeId={firstNodeId} replayActive={false} onSelectNode={noopNode} onCloseNode={noop} onStartReplay={noop} onOpenMirror={noop} onReturnHome={noop} />;
  }

  if (mode === "replay") {
    return <LifeMapScene nodes={lifeMapNodes} edges={lifeMapEdges} replayPath={replayPath} selectedNodeId={firstNodeId} replayActive onSelectNode={noopNode} onCloseNode={noop} onStartReplay={noop} onOpenMirror={noop} onReturnHome={noop} />;
  }

  if (mode === "mirror") {
    return <MirrorOfBecomingView mirror={mirror} onClose={noop} onHome={noop} />;
  }

  return <UraiSpatialStage />;
}

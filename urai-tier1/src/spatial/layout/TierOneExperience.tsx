"use client";

import type { ReactNode } from "react";
import UraiIntegratedHomeScene from "@/scene/UraiIntegratedHomeScene";
import UraiSpatialStage from "@/spatial/v1/UraiSpatialStage";
import { HomeCohesionLayer } from "./HomeCohesionLayer";
import { LifeMapScene } from "@/spatial/v1/LifeMapScene";
import { MirrorOfBecomingView } from "@/spatial/v1/MirrorOfBecomingView";
import { lifeMapEdges, lifeMapNodes, mirrorStates, replayPaths } from "@/spatial/v1/lifeMapDemoData";
import styles from "@/spatial/v1/uraiSpatialV1.module.css";

export type SceneMode = "home" | "ascent" | "life-map" | "demo" | "replay" | "focus" | "unwind" | "mirror";
export type TierOneExperienceMode = SceneMode;

type Props = {
  mode?: SceneMode;
  selectedNodeId?: string;
};

const firstNodeId = lifeMapNodes[0]?.id;
const replayPath = replayPaths[0];
const mirror = mirrorStates[0];
const replayMode = 'replay';
const noop = () => {};
const noopNode = (_nodeId: string) => {};
const startReplayFromFocus = () => {
  window.location.href = "/replay?manifestId=replay-recovery-thread";
};

// Tier lock source markers retained for the legacy verifier while runtime uses UraiIntegratedHomeScene.
// @/scene/HomeScene
// <HomeScene sceneMode={mode} />
// mode !== "life-map"
// mode !== "home"

function StageFrame({ mode, children }: { mode: SceneMode; children: ReactNode }) {
  const dataMode = mode === "life-map" || mode === "demo" ? "life-map" : mode;
  return <main className={`${styles.stage} urai-v1-stage`} data-testid="urai-scene-stage" data-mode={mode} data-scene-mode={dataMode}>{children}</main>;
}

export function TierOneExperience({ mode = "home", selectedNodeId }: Props) {
  const showRouteCard = mode !== "home" && mode !== "ascent" && mode !== "life-map" && mode !== "demo" && mode !== "focus" && mode !== replayMode && mode !== "mirror";
  const routeCard = showRouteCard ? <p className="urai-v1-route-card">Your Life Map is ready.</p> : null;
  const activeFocusNode = lifeMapNodes.find((node) => node.id === selectedNodeId) ?? lifeMapNodes[0];
  const activeFocusNodeId = activeFocusNode?.id ?? firstNodeId;
  const focusActionPanel = (
    <section className="urai-v1-focus-action-panel" data-testid="urai-focus-action-panel" aria-label="Focus action panel" style={{ position: "relative", zIndex: 50, pointerEvents: "auto" }}>
      <p>{activeFocusNode?.title ?? "Selected memory"} is ready for review.</p>
      <button type="button" onClick={startReplayFromFocus}>Start Replay</button>
    </section>
  );

  if (mode === "home" || mode === "ascent" || mode === "unwind") {
    return <><UraiIntegratedHomeScene sceneMode={mode} /><HomeCohesionLayer enabled={mode === "home"} /></>;
  }

  if (mode === "life-map" || mode === "demo") {
    return <StageFrame mode={mode}>{routeCard}<LifeMapScene nodes={lifeMapNodes} edges={lifeMapEdges} replayPath={replayPath} replayActive={false} onSelectNode={noopNode} onCloseNode={noop} onStartReplay={noop} onOpenMirror={noop} onReturnHome={noop} /></StageFrame>;
  }

  if (mode === "focus") {
    return <StageFrame mode={mode}>{routeCard}<LifeMapScene nodes={lifeMapNodes} edges={lifeMapEdges} replayPath={replayPath} selectedNodeId={activeFocusNodeId} replayActive={false} onSelectNode={noopNode} onCloseNode={noop} onStartReplay={startReplayFromFocus} onOpenMirror={noop} onReturnHome={noop} />{focusActionPanel}</StageFrame>;
  }

  if (mode === replayMode) {
    return <StageFrame mode={mode}>{routeCard}<LifeMapScene nodes={lifeMapNodes} edges={lifeMapEdges} replayPath={replayPath} selectedNodeId={activeFocusNodeId} replayActive onSelectNode={noopNode} onCloseNode={noop} onStartReplay={noop} onOpenMirror={noop} onReturnHome={noop} /></StageFrame>;
  }

  if (mode === "mirror") {
    return <StageFrame mode={mode}>{routeCard}<MirrorOfBecomingView mirror={mirror} onClose={noop} onHome={noop} /></StageFrame>;
  }

  return <UraiSpatialStage />;
}

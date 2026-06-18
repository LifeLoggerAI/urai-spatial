'use client';

import { useEffect, useMemo, useReducer } from 'react';
import { AscentTransition } from './AscentTransition';
import { EscapeUnwindController } from './EscapeUnwindController';
import { HomeWorldScene } from './HomeWorldScene';
import { LifeMapScene } from './LifeMapScene';
import { MirrorOfBecomingView } from './MirrorOfBecomingView';
import { demoHomeWorldState, lifeMapEdges, lifeMapNodes, mirrorStates, replayPaths } from './lifeMapDemoData';
import { initialSpatialState, reduceSpatialState } from './spatialStateMachine';
import styles from './uraiSpatialV1.module.css';

export function UraiSpatialStage() {
  const [state, dispatch] = useReducer(reduceSpatialState, initialSpatialState);
  const selectedNode = useMemo(() => lifeMapNodes.find((node) => node.id === state.selectedNodeId), [state.selectedNodeId]);
  const replayPath = replayPaths[0];
  const mirror = mirrorStates[0];
  const reducedMotion = state.preferences.motionMode !== 'full';

  useEffect(() => {
    if (state.mode !== 'ascent') return;
    if (reducedMotion) {
      const timeout = window.setTimeout(() => dispatch({ type: 'REDUCED_MOTION_ASCENT' }), 420);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => dispatch({ type: 'ASCENT_COMPLETE' }), 1800);
    return () => window.clearTimeout(timeout);
  }, [reducedMotion, state.mode]);

  return (
    <main
      className={`${styles.stage} urai-v1-stage urai-scene-stage urai-home-shell`}
      data-testid="urai-v1-spatial-stage"
      data-urai-home-spatial-shell="true"
      data-mode={state.mode}
      aria-label="URAI Spatial V1 emotional world"
    >
      <EscapeUnwindController dispatch={dispatch} />
      {state.mode === 'home' || state.mode === 'returning' ? (
        <HomeWorldScene state={demoHomeWorldState} onOpenSky={() => dispatch({ type: 'OPEN_SKY' })} />
      ) : null}
      {state.mode === 'ascent' ? <AscentTransition reducedMotion={reducedMotion} onComplete={() => dispatch({ type: 'ASCENT_COMPLETE' })} /> : null}
      {state.mode === 'lifeMap' || state.mode === 'focus' || state.mode === 'replay' ? (
        <LifeMapScene
          nodes={lifeMapNodes}
          edges={lifeMapEdges}
          replayPath={replayPath}
          selectedNodeId={state.selectedNodeId}
          replayActive={state.mode === 'replay'}
          onSelectNode={(nodeId) => dispatch({ type: 'SELECT_NODE', nodeId })}
          onCloseNode={() => dispatch({ type: 'CLOSE_NODE' })}
          onStartReplay={() => dispatch({ type: 'START_REPLAY', replayPathId: replayPath.id })}
          onOpenMirror={() => dispatch({ type: 'OPEN_MIRROR', mirrorStateId: mirror.id })}
          onReturnHome={() => dispatch({ type: 'RETURN_HOME' })}
        />
      ) : null}
      {state.mode === 'mirror' ? (
        <MirrorOfBecomingView
          mirror={{ ...mirror, activeNodeId: selectedNode?.id ?? mirror.activeNodeId }}
          onClose={() => dispatch({ type: 'CLOSE_MIRROR' })}
          onHome={() => dispatch({ type: 'RETURN_HOME' })}
        />
      ) : null}
      <section className="urai-v1-announcer" aria-live="polite">
        URAI mode: {state.mode}. {selectedNode ? `Selected star: ${selectedNode.title}.` : ''}
      </section>
    </main>
  );
}

export default UraiSpatialStage;

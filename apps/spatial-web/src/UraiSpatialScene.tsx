
import { Box, Plane } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { Interactive } from '@react-three/xr';
import { useEffect, useState, useRef, useCallback } from 'react';
import { BufferGeometry, Material, Mesh, Color } from 'three';
import { URAI_SPATIAL_SCENE_ASSET_PATH } from './App';
import { Scene, Entity } from './types';

// A simple state machine for transitions
type TransitionState = 'IDLE' | 'FADING_OUT' | 'FADING_IN' | 'REVEALING';

interface UraiSpatialSceneProps {
  initialSceneName: string;
}

// A component for entities that animate in
const RevealingEntity = ({ entity, delay }) => {
    const meshRef = useRef<Mesh>();
    const [startAnimation, setStartAnimation] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setStartAnimation(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    useFrame((_, delta) => {
        if (!meshRef.current || !startAnimation) return;

        const material = meshRef.current.material as Material;
        const scale = entity.transform.scale;

        if (material.opacity < 1) {
            material.opacity += 2.0 * delta;
        }
        if (meshRef.current.scale.x < scale.x) {
            const scaleFactor = meshRef.current.scale.x + 2.0 * delta;
            meshRef.current.scale.set(scaleFactor, scaleFactor, scaleFactor);
        } else {
            meshRef.current.scale.set(scale.x, scale.y, scale.z)
        }
    });

    return (
        <Box
            ref={meshRef}
            name={entity.id}
            args={[1, 1, 1]} // Start with unit cube
            position={[entity.transform.position.x, entity.transform.position.y, entity.transform.position.z]}
            scale={[0,0,0]} // Start scaled to nothing
        >
            <meshStandardMaterial transparent opacity={0} color={new Color(Math.random() * 0xffffff)} />
        </Box>
    );
};


// Transition plane for fade effects
const TransitionPlane = ({ transitionState, onFadeOutComplete, onFadeInComplete }) => {
  const matRef = useRef<any>();
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!matRef.current) return;

    const fadeSpeed = 1.5;
    let targetOpacity = 0;

    if (transitionState === 'FADING_OUT') {
      targetOpacity = 1;
    }

    matRef.current.opacity += (targetOpacity - matRef.current.opacity) * fadeSpeed * delta;

    if (transitionState === 'FADING_OUT' && matRef.current.opacity > 0.99) {
      matRef.current.opacity = 1;
      onFadeOutComplete();
    }
    
    if (transitionState === 'FADING_IN' && matRef.current.opacity < 0.01) {
      matRef.current.opacity = 0;
      onFadeInComplete();
    }
  });

  return (
    <Plane args={[100, 100]} position={[camera.position.x, camera.position.y, camera.position.z - 1]} >
        <meshBasicMaterial ref={matRef} color="black" transparent opacity={0} depthTest={false} />
    </Plane>
  );
};

export const UraiSpatialScene = ({ initialSceneName }: UraiSpatialSceneProps) => {
  const [sceneData, setSceneData] = useState<Scene | null>(null);
  const [currentSceneName, setCurrentSceneName] = useState(initialSceneName);
  const [targetSceneName, setTargetSceneName] = useState<string | null>(null);
  const [transitionState, setTransitionState] = useState<TransitionState>('IDLE');
  const { scene: threeScene, gl } = useThree();

  // Dispose old scene resources
  const cleanupScene = useCallback(() => {
    if (sceneData) {
        console.log('Cleaning up scene...');
        sceneData.entities.forEach(entity => {
            const object = threeScene.getObjectByName(entity.id);
            if (object instanceof Mesh) {
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
                threeScene.remove(object)
            }
        });
    }
    gl.renderLists.dispose();
  }, [sceneData, threeScene, gl]);


  useEffect(() => {
    const fetchScene = async () => {
      try {
        console.log(`Fetching scene: ${currentSceneName}`);
        const response = await fetch(`${URAI_SPATIAL_SCENE_ASSET_PATH}${currentSceneName}.json`);
        if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
        const data = await response.json();
        setSceneData(data);
        // Trigger revealing state for memory room, otherwise just fade in
        if (currentSceneName === 'scene_memoryroom_v1') {
            setTransitionState('REVEALING');
        } else {
            setTransitionState('FADING_IN');
        }
      } catch (error) {
        console.error('Error loading scene:', error);
        setTransitionState('IDLE');
      }
    };

    if (transitionState !== 'FADING_OUT') {
        fetchScene();
    }
  }, [currentSceneName]);

  const handlePortalSelect = (portalTarget: string) => {
    console.log(`Portal to ${portalTarget} activated!`);
    setTargetSceneName(portalTarget);
    setTransitionState('FADING_OUT');
  };

  const onFadeOutComplete = () => {
    if (targetSceneName) {
        cleanupScene();
        setSceneData(null); // Clear old data
        setCurrentSceneName(targetSceneName);
        setTargetSceneName(null);
    }
  };
  
  const onFadeInComplete = () => {
      setTransitionState('IDLE');
  }

  // A button to go back
  const BackButton = () => (
    <Interactive onSelect={() => handlePortalSelect('scene_starworld_v1')}>
        <Box position={[0, 1.2, -2.5]} args={[0.4, 0.2, 0.1]}>
            <meshStandardMaterial color="#FF4444" />
        </Box>
    </Interactive>
  );

  const renderEntity = (entity: Entity, index: number) => {
      const isPortal = entity.name.toLowerCase().includes('portal');
      const portalTarget = 'scene_memoryroom_v1';
      
      if (currentSceneName === 'scene_memoryroom_v1' && transitionState === 'REVEALING') {
          return <RevealingEntity key={entity.id} entity={entity} delay={index * 150} />;
      }
      
      // Default entity rendering for starworld and other scenes
      return (
          <Interactive key={entity.id} onSelect={() => isPortal && handlePortalSelect(portalTarget)}>
              <Box
                  name={entity.id}
                  args={[entity.transform.scale.x, entity.transform.scale.y, entity.transform.scale.z]}
                  position={[entity.transform.position.x, entity.transform.position.y, entity.transform.position.z]}
              >
                  <meshStandardMaterial color={isPortal ? 'purple' : new Color(Math.random() * 0xffffff)} />
              </Box>
          </Interactive>
      );
  };

  return (
    <>
      {sceneData?.entities.map(renderEntity)}
      {currentSceneName === 'scene_memoryroom_v1' && <BackButton />}
      <TransitionPlane 
        transitionState={transitionState}
        onFadeOutComplete={onFadeOutComplete} 
        onFadeInComplete={onFadeInComplete} 
      />
    </>
  );
};

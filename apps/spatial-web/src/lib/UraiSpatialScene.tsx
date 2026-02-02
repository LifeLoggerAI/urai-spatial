
import { useLoader } from '@react-three/fiber';
import { AssetManager } from './AssetManager';
import { BASE_ASSET_URL } from './constants';
import { Scene, Entity } from './types';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

const assetManager = new AssetManager(BASE_ASSET_URL);

const EntityComponent = ({ entity }: { entity: Entity }) => {
  const gltf = useLoader(assetManager.gltfLoader as any, assetManager.getAssetUrl(entity.components[0].data.assetId)) as GLTF;
  return <primitive object={gltf.scene.clone()} />;
};

export const UraiSpatialScene = ({ scenePath }: { scenePath: string }) => {
  const scene = useLoader(THREE.FileLoader as any, scenePath) as unknown as Scene;
  const { entities } = scene;

  return (
    <>
      {entities.map((entity) => (
        <EntityComponent key={entity.id} entity={entity} />
      ))}
    </>
  );
};

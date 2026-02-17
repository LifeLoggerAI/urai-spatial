"use client";
import Atmosphere from "../environment/Atmosphere";
import GroundPlane from "../environment/GroundPlane";
import OrbCore from "../orb/OrbCore";
import Avatar from "../environment/Avatar";
export default function HomeScene({ onEnterLifeMap, onEnterChat }: { onEnterLifeMap: () => void; onEnterChat: () => void; }) {
  return (
    <>
      <mesh onClick={onEnterLifeMap} position={[0, 50, -100]} visible={false}><planeGeometry args={[1000, 1000]} /></mesh>
      <Atmosphere />
      <GroundPlane />
      <group position={[0, -1.5, 0]}>
        <OrbCore onClick={onEnterChat} />
        <Avatar position={[3, 0, 0.5]} />
      </group>
    </>
  );
}

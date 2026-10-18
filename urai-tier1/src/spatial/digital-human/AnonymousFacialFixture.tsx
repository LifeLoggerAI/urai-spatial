'use client'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { calibrationPose,writeMorphs,clearMorphs } from './anonymousCalibration.mjs'

/** Only mount with deliberate dev preview opt-in. Never a Founder/Council identity. */
export default function AnonymousFacialFixture({media,muted,reducedMotion,onFrame}:{
  media: HTMLAudioElement|null
  muted:boolean
  reducedMotion:boolean
  onFrame:(frame:{time:number;max:number;written:number;playing:boolean;geometryX:number})=>void
}) {
  const gltf=useGLTF('/__digital-human-dev/anonymous-face-morph-v1.glb')
  const instance=useMemo(()=>cloneSkeleton(gltf.scene),[gltf.scene])
  const root=useRef<THREE.Group>(null)
  const lastReport=useRef(-1)
  useEffect(()=>()=>{clearMorphs(instance)},[instance])
  useFrame(({clock})=>{
    const playing=!!media && !media.paused && !media.ended && !media.muted && !muted
    const time=media?.currentTime??0
    const pose=calibrationPose(time,playing,reducedMotion,muted)
    const result=writeMorphs(instance,pose)
    // Geometry deformation occurs through actual Three.js morphTargetInfluences, not DOM animation.
    if(clock.elapsedTime-lastReport.current>=.075) {
      lastReport.current=clock.elapsedTime
      onFrame({time,max:result.max,written:result.written,playing,geometryX:pose.jawOpen})
    }
  })
  return <group ref={root} position={[1.5,.05,-.4]} userData={{representation:'anonymous-technical-facial-fixture-not-founder',approvedIdentity:false}}>
    <primitive object={instance} />
  </group>
}

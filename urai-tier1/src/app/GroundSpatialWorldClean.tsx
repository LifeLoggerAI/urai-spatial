'use client'

import { Html, OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import Link from 'next/link'
import { Suspense, useRef, type CSSProperties } from 'react'
import *
'use client'

import { Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react'
import * as THREE from 'three'
import HomeSanctuaryWorld from './HomeSanctuary
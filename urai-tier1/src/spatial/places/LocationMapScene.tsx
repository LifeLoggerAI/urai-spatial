'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from 'react'
import { assetCssStack, locationMapAssets } from '@/spatial/assets/uraiAssets'
import type { MemoryPlace } from './memoryPlaceSchema'
import './location-map-scene.css'

type Camera = { x: number; y: number; zoom: number }
type AtlasPoint = { place: MemoryPlace; x: number; y: number; depth: number }
type AccessMode = 'checking' | 'sample-threshold' | 'private' | 'explicit-demo'

const OVERVIEW: Camera = { x: 0, y: 0, zoom: 0.9 }
const SEEDS = [
  [18, 29, 0
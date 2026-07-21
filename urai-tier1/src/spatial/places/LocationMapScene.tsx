'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import { locationMapAssets } from '@/spatial/assets/uraiAssets'
import type { MemoryPlace } from './memoryPlaceSchema'
import './location-map-scene.css'

type Camera
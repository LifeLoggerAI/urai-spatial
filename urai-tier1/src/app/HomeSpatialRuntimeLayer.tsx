'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import EmbodiedHomeSpatialCanvas from './EmbodiedHomeSpatialCanvas'
import { useWebGLAvailable } from './HomeSpatialCanvas'
import HomeSpatialWorldFinal from './HomeSpatialWorldFinal'
import { requestUraiWorldOrbOpen } from '@/spatial/world/worldEvents'

type Renderer
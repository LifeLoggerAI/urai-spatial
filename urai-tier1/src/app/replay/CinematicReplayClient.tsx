'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { assetCssStack, replayAssets } from '@/spatial/assets/uraiAssets'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import {
  buildReplaySpatialScene,
  filterReplayAnchorsForTruthMode,
  replayTruthModeDescription,
  type ReplayTruthMode,
  type ReplayWorldAnchor,
} from '@/spatial/replay/replaySpatialModel'
import
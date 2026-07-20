'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react'
import * as THREE from 'three'

export type MovementBounds = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export type MovementObstacle = {
  x: number
  z: number
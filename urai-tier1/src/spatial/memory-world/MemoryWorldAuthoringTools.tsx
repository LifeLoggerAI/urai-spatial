'use client'

import { useMemo, useState } from 'react'
import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'
import type { MemoryWorld } from './memoryWorld'
import { applyMemoryWorldOwnerCorrection, type MemoryWorldOwnerCorrectionAction } from './ownerCorrectionAuthority'
import { blockoutPresetForWorld } from './blockoutPresets'
import { GUIDED_CAPTURE_PROFILES, type GuidedCaptureClass } from './guidedCapture'
import {
  applyReplayOperation,
  executeReplayOperation,
  readReplayOperationState,
  writeReplayOperationState,
  type ReplayOperation,
} from '@/spatial/replay/replayOperations'
import { createAuthenticatedReplayTransport } from '@/spatial/replay/replayServerTransport'

function guidedProfileForWorld(world: MemoryWorld): GuidedCaptureClass {
  if (world.archetypeId.includes('street') || world.archetypeId.includes('neighborhood')) return 'street'
  if (world.archetypeId.includes('yard')) return 'yard'
  if (world.archetypeId.includes('back-seat-car') || world.archetypeId.includes('vehicle')) return 'vehicle-interior'
  if (world.archetypeId.startsWith('scene:nature:') || world.archetypeId.startsWith('scene:agricultureRural:')) return 'large-outdoor'
  if (world.archetypeId.startsWith('scene:residential:detached-house') || world.archetypeId.startsWith('scene:residential:farmhouse')) return 'multi-room-home'
  return 'small-room'
}

export function MemoryWorldAuthoringTools({
  memory,
  world,
  onWorldChange,
}: {
  memory: SelectedMemory
  world: MemoryWorld
  onWorldChange: (world: MemoryWorld) => void
}) {
  const preset = blockoutPresetForWorld(world)
  const targets = useMemo(
    () => [...new Set((preset?.props ?? []).map((prop) => prop.semanticTag))].sort(),
    [preset],
  )
  const [target, setTarget] = useState(targets[0] ?? 'context:place')
  const [action, setAction] = useState<MemoryWorldOwnerCorrectionAction>('describe')
  const [value, setValue] = useState('')
  const [status, setStatus] = useState(memory.demo ? 'Demo Memory World is read-only.' : 'Corrections update structured world authority and correction history.')
  const mutable = !memory.demo && memory.authorization === 'owner'
  const transport = useMemo(() => createAuthenticatedReplayTransport(), [])
  const captureProfile = GUIDED_CAPTURE_PROFILES[guidedProfileForWorld(world)]

  const saveCorrection = async () => {
    if (!mutable) {
      setStatus('This Memory World is read-only.')
      return
    }
    if (action !== 'absent' && !value.trim()) {
      setStatus('Describe the correction before saving.')
      return
    }

    const previous = world
    const correctionId = crypto.randomUUID()
    const confirmedAt = new Date().toISOString()
    const nextWorld = applyMemoryWorldOwnerCorrection(world, {
      correctionId,
      targetSemanticTag: target,
      action,
      value: value.trim(),
      confirmedAt,
      sourceId: `owner-statement:${correctionId}`,
    })
    onWorldChange(nextWorld)

    const operation: ReplayOperation = {
      id: correctionId,
      memoryId: memory.id,
      manifestId: memory.replayManifest.id,
      ownerId: memory.ownerId,
      kind: 'correct',
      createdAt: confirmedAt,
      correction: {
        field: 'place',
        previousValue: {
          worldRevision: world.provenance.userCorrectionRevision,
          targetSemanticTag: target,
        },
        nextValue: {
          worldRevision: nextWorld.provenance.userCorrectionRevision,
          targetSemanticTag: target,
          action,
          value: value.trim(),
        },
        reason: 'memory-world-owner-correction',
      },
    }

    if (!navigator.onLine) {
      const queued = applyReplayOperation(readReplayOperationState(window.localStorage, memory.ownerId, memory.id), operation)
      writeReplayOperationState(window.localStorage, memory.ownerId, memory.id, queued)
      setStatus('Correction recorded locally and queued for Replay audit sync.')
      setValue('')
      return
    }

    setStatus('Saving Memory World correction…')
    const settled = await executeReplayOperation({
      storage: window.localStorage,
      transport,
      operation,
    })
    if (settled.error) {
      onWorldChange(previous)
      setStatus(`Correction was not saved. ${settled.error}`)
      return
    }
    setValue('')
    setStatus('Correction saved. Prior world verification is invalidated until this revision is re-verified.')
  }

  return (
    <aside
      data-testid="memory-world-authoring-tools"
      data-world-correction-revision={world.provenance.userCorrectionRevision}
      style={{position:'fixed',zIndex:20,right:16,bottom:16,width:'min(420px,calc(100vw - 32px))',maxHeight:'70svh',overflow:'auto',padding:12,border:'1px solid rgba(255,255,255,.2)',borderRadius:18,background:'rgba(3,9,15,.88)',color:'#fff',backdropFilter:'blur(14px)'}}
    >
      <details>
        <summary style={{minHeight:48,display:'flex',alignItems:'center',fontWeight:800,cursor:'pointer'}}>Correct this world</summary>
        <p style={{fontSize:12,lineHeight:1.5,color:'rgba(255,255,255,.72)'}}>The original memory is not rewritten. Owner corrections become T3 evidence-informed authority and increment the world revision.</p>
        <label style={{display:'block',marginTop:8}}>Target
          <select value={target} onChange={(event)=>setTarget(event.currentTarget.value)} disabled={!mutable} style={{display:'block',width:'100%',minHeight:48,marginTop:4}}>
            {(targets.length ? targets : ['context:place']).map((item)=><option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label style={{display:'block',marginTop:8}}>Correction
          <select value={action} onChange={(event)=>setAction(event.currentTarget.value as MemoryWorldOwnerCorrectionAction)} disabled={!mutable} style={{display:'block',width:'100%',minHeight:48,marginTop:4}}>
            <option value="describe">Describe / correct detail</option>
            <option value="replace">Replace detail</option>
            <option value="present">Object/detail was present</option>
            <option value="absent">Object/detail was absent</option>
          </select>
        </label>
        <label style={{display:'block',marginTop:8}}>Owner statement
          <textarea value={value} onChange={(event)=>setValue(event.currentTarget.value)} disabled={!mutable || action==='absent'} maxLength={500} style={{display:'block',boxSizing:'border-box',width:'100%',minHeight:96,marginTop:4}} />
        </label>
        <button type="button" disabled={!mutable} onClick={()=>void saveCorrection()} style={{minHeight:48,marginTop:10,padding:'0 14px'}}>Save structured correction</button>
        <p role="status" aria-live="polite" style={{fontSize:11}}>{status}</p>
      </details>

      <details>
        <summary style={{minHeight:48,display:'flex',alignItems:'center',fontWeight:800,cursor:'pointer'}}>Guided capture</summary>
        <p style={{fontSize:12,lineHeight:1.5}}>Profile: <strong>{captureProfile.id}</strong>. Guidance only—this panel does not upload private media.</p>
        <strong>Required passes</strong><ul>{captureProfile.requiredPasses.map((item)=><li key={item}>{item}</li>)}</ul>
        <strong>Quality checks</strong><ul>{captureProfile.qualityChecks.map((item)=><li key={item}>{item}</li>)}</ul>
        <strong>Watch for</strong><ul>{captureProfile.hazards.map((item)=><li key={item}>{item}</li>)}</ul>
        <strong>Privacy checks</strong><ul>{captureProfile.privacyChecks.map((item)=><li key={item}>{item}</li>)}</ul>
      </details>
    </aside>
  )
}

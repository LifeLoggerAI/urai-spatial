export type FocusPhase =
  | 'idle'
  | 'entering_focus'
  | 'loading_focus_data'
  | 'focus_ready'
  | 'focus_node_hovered'
  | 'focus_node_selected'
  | 'focus_detail_open'
  | 'focus_recentering'
  | 'exiting_focus'
  | 'focus_empty'
  | 'focus_error'

export type FocusVisibleAction =
  | 'open_life_map'
  | 'recenter_focus'
  | 'start_replay'
  | 'open_detail'
  | 'close_detail'
  | 'return_to_focus'
  | 'return_home'

export type FocusPhaseInput = {
  mode: 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'unwind' | 'mirror'
  hasSelectedTarget: boolean
  hasLoadedTarget: boolean
  isManifestLoading: boolean
  isGateLoading: boolean
  isGateBlocked: boolean
  isReplayLaunching: boolean
  isRecentering?: boolean
  isHoveringNode?: boolean
  isDetailOpen?: boolean
}

export type FocusPhaseDefinition = {
  label: string
  userVisibleUi: string
  allowedActions: FocusVisibleAction[]
  disabledActions: FocusVisibleAction[]
  requiredData: string[]
  entryTrigger: string
  exitTrigger: string
  nextStates: FocusPhase[]
  accessibilityBehavior: string
  errorHandling: string
}

export const FOCUS_PHASE_DEFINITIONS: Record<FocusPhase, FocusPhaseDefinition> = {
  idle: {
    label: 'Focus idle',
    userVisibleUi: 'No Focus UI is visible; the user is outside the selected-memory inspection mode.',
    allowedActions: ['open_life_map'],
    disabledActions: ['recenter_focus', 'start_replay', 'open_detail', 'close_detail', 'return_to_focus'],
    requiredData: [],
    entryTrigger: 'The active route is home, ascent, life-map, demo, unwind, or mirror.',
    exitTrigger: 'A Focus route or selected memory target is requested.',
    nextStates: ['entering_focus', 'loading_focus_data'],
    accessibilityBehavior: 'Do not expose inactive Focus controls to keyboard or screen readers.',
    errorHandling: 'Remain in the current non-Focus route and do not show Focus error copy.',
  },
  entering_focus: {
    label: 'Entering Focus',
    userVisibleUi: 'The spatial camera narrows from Life Map context toward one selected memory target.',
    allowedActions: ['open_life_map'],
    disabledActions: ['start_replay', 'open_detail'],
    requiredData: ['target manifest id or selected node id'],
    entryTrigger: 'The user selects a memory node or opens /focus with a manifest id.',
    exitTrigger: 'Target data begins loading or resolves from cache.',
    nextStates: ['loading_focus_data', 'focus_ready', 'focus_empty', 'focus_error'],
    accessibilityBehavior: 'Keep Escape available and announce that Focus is opening.',
    errorHandling: 'If target lookup fails, move to focus_error with a return-to-map action.',
  },
  loading_focus_data: {
    label: 'Loading Focus Data',
    userVisibleUi: 'A preparing panel explains that the selected memory is opening without pretending Focus is ready.',
    allowedActions: ['open_life_map'],
    disabledActions: ['start_replay', 'open_detail', 'recenter_focus'],
    requiredData: ['target manifest id'],
    entryTrigger: 'Focus route is active and manifest or gate data is still loading.',
    exitTrigger: 'Data resolves, access is denied, or no target is available.',
    nextStates: ['focus_ready', 'focus_empty', 'focus_error'],
    accessibilityBehavior: 'Use polite live-region copy and keep the Life Map escape action keyboard reachable.',
    errorHandling: 'Surface a non-alarming fallback if private data is unavailable.',
  },
  focus_ready: {
    label: 'Focus Ready',
    userVisibleUi: 'One selected memory is primary, nearby context is secondary, and replay/detail controls are enabled.',
    allowedActions: ['start_replay', 'open_detail', 'recenter_focus', 'open_life_map'],
    disabledActions: ['close_detail', 'return_to_focus'],
    requiredData: ['selected memory manifest'],
    entryTrigger: 'Selected memory data is loaded and the Focus field is stable.',
    exitTrigger: 'The user hovers a related node, selects another node, opens detail, starts replay, recenters, or exits.',
    nextStates: ['focus_node_hovered', 'focus_node_selected', 'focus_detail_open', 'focus_recentering', 'exiting_focus'],
    accessibilityBehavior: 'Expose Focus controls and selected-memory summary with clear labels.',
    errorHandling: 'If the manifest becomes unavailable, move to focus_error or focus_empty.',
  },
  focus_node_hovered: {
    label: 'Related Memory Preview',
    userVisibleUi: 'A related memory node is previewed while the selected memory remains anchored.',
    allowedActions: ['start_replay', 'open_detail', 'recenter_focus', 'open_life_map'],
    disabledActions: ['close_detail', 'return_to_focus'],
    requiredData: ['selected memory manifest', 'hovered node id'],
    entryTrigger: 'Pointer or keyboard focus lands on a related memory node.',
    exitTrigger: 'Pointer leaves, keyboard focus moves, node is selected, detail opens, or user exits.',
    nextStates: ['focus_ready', 'focus_node_selected', 'focus_detail_open', 'exiting_focus'],
    accessibilityBehavior: 'Announce the hovered node preview without stealing focus from the active control.',
    errorHandling: 'Ignore invalid related-node ids and return to focus_ready.',
  },
  focus_node_selected: {
    label: 'Memory Selected',
    userVisibleUi: 'The selected memory is locked as the primary Focus target and action controls are available.',
    allowedActions: ['start_replay', 'open_detail', 'recenter_focus', 'open_life_map'],
    disabledActions: ['close_detail', 'return_to_focus'],
    requiredData: ['selected memory manifest', 'selected node position'],
    entryTrigger: 'The user selects a Focus node from the local memory context.',
    exitTrigger: 'The camera settles, detail opens, replay starts, recenter starts, or the user exits.',
    nextStates: ['focus_ready', 'focus_detail_open', 'focus_recentering', 'exiting_focus'],
    accessibilityBehavior: 'Move programmatic context to the selected-memory summary, not to a decorative canvas object.',
    errorHandling: 'Fallback to focus_ready if position data is missing but manifest data exists.',
  },
  focus_detail_open: {
    label: 'Memory Detail Open',
    userVisibleUi: 'A readable detail layer is open over the spatial Focus context.',
    allowedActions: ['close_detail', 'return_to_focus', 'open_life_map'],
    disabledActions: ['start_replay'],
    requiredData: ['selected memory manifest', 'detail content'],
    entryTrigger: 'The user opens selected memory detail.',
    exitTrigger: 'The user closes detail, starts replay from a dedicated detail action, or exits Focus.',
    nextStates: ['focus_ready', 'exiting_focus'],
    accessibilityBehavior: 'Trap keyboard focus inside the detail layer until closed and let Escape close detail first.',
    errorHandling: 'Show an inline detail error while preserving the Focus exit action.',
  },
  focus_recentering: {
    label: 'Recentering Focus',
    userVisibleUi: 'The camera returns to the selected memory target and local context.',
    allowedActions: ['open_life_map'],
    disabledActions: ['start_replay', 'open_detail', 'recenter_focus'],
    requiredData: ['selected memory manifest or selected node position'],
    entryTrigger: 'The user presses Recenter or keyboard shortcut R.',
    exitTrigger: 'Camera reset completes or reduced-motion fallback applies immediately.',
    nextStates: ['focus_ready', 'focus_error'],
    accessibilityBehavior: 'Announce recenter completion and do not move keyboard focus unexpectedly.',
    errorHandling: 'If no target exists, move to focus_empty.',
  },
  exiting_focus: {
    label: 'Leaving Focus',
    userVisibleUi: 'Focus controls are winding down while the user moves to Replay, Life Map, or another safe route.',
    allowedActions: [],
    disabledActions: ['start_replay', 'open_detail', 'recenter_focus', 'open_life_map'],
    requiredData: ['destination route'],
    entryTrigger: 'The user starts replay, returns to Life Map, or unwinds the current layer.',
    exitTrigger: 'Navigation completes.',
    nextStates: ['idle', 'focus_detail_open'],
    accessibilityBehavior: 'Prevent duplicate activation of launch buttons and preserve Escape behavior.',
    errorHandling: 'If navigation fails, return to focus_ready and re-enable controls.',
  },
  focus_empty: {
    label: 'Focus Empty',
    userVisibleUi: 'No selected memory is available; the user can return to the Life Map.',
    allowedActions: ['open_life_map'],
    disabledActions: ['start_replay', 'open_detail', 'recenter_focus'],
    requiredData: [],
    entryTrigger: 'Focus route is active but there is no loadable selected memory target.',
    exitTrigger: 'The user returns to Life Map or a target becomes available.',
    nextStates: ['idle', 'entering_focus', 'loading_focus_data'],
    accessibilityBehavior: 'Announce the empty state and keep one clear recovery button.',
    errorHandling: 'Avoid blame-oriented copy; explain the map can be reopened safely.',
  },
  focus_error: {
    label: 'Focus Needs Attention',
    userVisibleUi: 'A recoverable error panel explains access, privacy, or data loading problems.',
    allowedActions: ['open_life_map', 'return_home'],
    disabledActions: ['start_replay', 'open_detail', 'recenter_focus'],
    requiredData: ['error reason when available'],
    entryTrigger: 'Access gate denies Focus, data loading fails, or an invalid target is detected.',
    exitTrigger: 'The user returns to Life Map, opens preview, returns home, or the error clears.',
    nextStates: ['idle', 'loading_focus_data', 'focus_ready'],
    accessibilityBehavior: 'Use assertive-but-calm copy only for blocking errors and keep recovery controls reachable.',
    errorHandling: 'Do not mask errors as Focus-ready state; keep a visible return path.',
  },
}

export function resolveFocusPhase(input: FocusPhaseInput): FocusPhase {
  if (input.mode !== 'focus' && input.mode !== 'replay') return 'idle'
  if (input.isGateBlocked && !input.isGateLoading) return 'focus_error'
  if (input.isGateLoading || (input.isManifestLoading && !input.hasLoadedTarget)) return 'loading_focus_data'
  if (input.isReplayLaunching) return 'exiting_focus'
  if (!input.hasLoadedTarget && !input.hasSelectedTarget) return 'focus_empty'
  if (input.isDetailOpen || input.mode === 'replay') return 'focus_detail_open'
  if (input.isRecentering) return 'focus_recentering'
  if (input.isHoveringNode) return 'focus_node_hovered'
  if (input.hasSelectedTarget) return 'focus_node_selected'
  return 'focus_ready'
}

export function getFocusPhaseDefinition(phase: FocusPhase): FocusPhaseDefinition {
  return FOCUS_PHASE_DEFINITIONS[phase]
}

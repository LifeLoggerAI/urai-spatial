export const GUIDED_CAPTURE_POLICY_VERSION = 'urai-memory-world-capture-1' as const

export type GuidedCaptureClass =
  | 'small-room'
  | 'large-room'
  | 'multi-room-home'
  | 'building-exterior'
  | 'yard'
  | 'street'
  | 'large-outdoor'
  | 'vehicle-interior'
  | 'object'
  | 'furniture'
  | 'person'
  | 'archival-photo-reconstruction'

export type GuidedCaptureProfile = {
  id: GuidedCaptureClass
  motion: 'orbit-subject' | 'walk-through' | 'walk-perimeter' | 'multi-pass' | 'stationary-plus-detail'
  requiredPasses: readonly string[]
  preferredSensors: readonly ('photo' | 'video' | '360' | 'depth' | 'lidar' | 'audio')[]
  hazards: readonly string[]
  qualityChecks: readonly string[]
  privacyChecks: readonly string[]
  dynamicSubjectPolicy: 'static-preferred' | 'separate-background-and-subject' | 'motion-required'
}

export const GUIDED_CAPTURE_PROFILES: Readonly<Record<GuidedCaptureClass, GuidedCaptureProfile>> = {
  'small-room': {
    id:'small-room', motion:'multi-pass',
    requiredPasses:['room-perimeter','doorway-transition','surface-detail'],
    preferredSensors:['video','photo','depth'],
    hazards:['mirrors','windows','blank-walls','moving-people','exposure-swings'],
    qualityChecks:['sharpness','cross-angle-coverage','doorway-bidirectional-coverage','stable-exposure'],
    privacyChecks:['third-party-likeness','private-documents','screens','exact-location'],
    dynamicSubjectPolicy:'static-preferred',
  },
  'large-room': {
    id:'large-room', motion:'multi-pass',
    requiredPasses:['outer-perimeter','inner-loop','doorway-transition','object-detail'],
    preferredSensors:['video','photo','360','depth'],
    hazards:['long-baseline-gaps','repetitive-textures','glass','moving-people'],
    qualityChecks:['sharpness','loop-closure','cross-angle-coverage','scale-cue-presence'],
    privacyChecks:['third-party-likeness','private-documents','screens'],
    dynamicSubjectPolicy:'static-preferred',
  },
  'multi-room-home': {
    id:'multi-room-home', motion:'multi-pass',
    requiredPasses:['room-by-room','hallway-connectivity','doorway-bidirectional','exterior-anchor','object-detail'],
    preferredSensors:['video','photo','360','depth','lidar','audio'],
    hazards:['lost-tracking','lighting-transitions','mirrors','moving-people','moving-pets'],
    qualityChecks:['room-connectivity','loop-closure','metric-scale-cue','transition-coverage','stable-exposure'],
    privacyChecks:['third-party-likeness','private-documents','family-media','exact-location','voice'],
    dynamicSubjectPolicy:'separate-background-and-subject',
  },
  'building-exterior': {
    id:'building-exterior', motion:'walk-perimeter',
    requiredPasses:['facade-perimeter','corners','entries','upper-surface-coverage'],
    preferredSensors:['video','photo','360','depth'],
    hazards:['sky-dominance','reflective-glass','traffic','moving-vegetation'],
    qualityChecks:['facade-overlap','corner-coverage','entry-transition','scale-cue-presence'],
    privacyChecks:['bystander-likeness','addresses','license-plates','exact-location'],
    dynamicSubjectPolicy:'static-preferred',
  },
  'yard': {
    id:'yard', motion:'multi-pass',
    requiredPasses:['perimeter','structure-links','ground-detail','vegetation-detail'],
    preferredSensors:['video','photo','360','depth','audio'],
    hazards:['wind','moving-leaves','water','repetitive-grass','harsh-sun'],
    qualityChecks:['structure-linkage','ground-coverage','stable-exposure','scale-cue-presence'],
    privacyChecks:['neighbor-privacy','bystanders','addresses','exact-location'],
    dynamicSubjectPolicy:'static-preferred',
  },
  'street': {
    id:'street', motion:'walk-through',
    requiredPasses:['both-sides','intersections','facades','road-surface','transition-anchors'],
    preferredSensors:['video','photo','360','audio'],
    hazards:['traffic','bystanders','vehicles','repetitive-facades','long-range-gaps'],
    qualityChecks:['route-continuity','facade-overlap','intersection-coverage','stable-exposure'],
    privacyChecks:['bystander-likeness','license-plates','addresses','exact-location'],
    dynamicSubjectPolicy:'static-preferred',
  },
  'large-outdoor': {
    id:'large-outdoor', motion:'multi-pass',
    requiredPasses:['route-loop','landmark-anchors','terrain-detail','horizon-context'],
    preferredSensors:['video','photo','360','depth','audio'],
    hazards:['low-parallax','moving-vegetation','water','weather-change','long-range-gaps'],
    qualityChecks:['landmark-connectivity','route-loop-closure','scale-cue-presence','weather-consistency'],
    privacyChecks:['bystanders','exact-location','sensitive-sites'],
    dynamicSubjectPolicy:'static-preferred',
  },
  'vehicle-interior': {
    id:'vehicle-interior', motion:'stationary-plus-detail',
    requiredPasses:['front-cabin','rear-cabin','dashboard','controls','door-transitions'],
    preferredSensors:['video','photo','depth','audio'],
    hazards:['glass','mirrors','dark-surfaces','tight-baselines'],
    qualityChecks:['dashboard-detail','seat-coverage','door-transition','stable-exposure'],
    privacyChecks:['documents','license-data','location-history','voice'],
    dynamicSubjectPolicy:'static-preferred',
  },
  'object': {
    id:'object', motion:'orbit-subject',
    requiredPasses:['full-orbit','top-bottom','detail'],
    preferredSensors:['photo','video','depth'],
    hazards:['reflective-metal','glass','thin-geometry','featureless-surfaces'],
    qualityChecks:['complete-silhouette','detail-sharpness','scale-cue-presence'],
    privacyChecks:['personal-identifiers','documents','biometric-artifacts'],
    dynamicSubjectPolicy:'static-preferred',
  },
  'furniture': {
    id:'furniture', motion:'orbit-subject',
    requiredPasses:['full-orbit','underside-where-safe','surface-detail'],
    preferredSensors:['photo','video','depth'],
    hazards:['thin-legs','repetitive-upholstery','glossy-surfaces'],
    qualityChecks:['complete-silhouette','contact-points','scale-cue-presence'],
    privacyChecks:['embedded-personal-items'],
    dynamicSubjectPolicy:'static-preferred',
  },
  'person': {
    id:'person', motion:'multi-pass',
    requiredPasses:['explicit-consent','neutral-reference','expression-reference','motion-reference'],
    preferredSensors:['video','photo','audio'],
    hazards:['motion-blur','lighting-change','occlusion'],
    qualityChecks:['identity-authority','capture-quality','voice-authority-separate'],
    privacyChecks:['explicit-likeness-consent','voice-consent','minor-dependent-check','third-party-presence'],
    dynamicSubjectPolicy:'motion-required',
  },
  'archival-photo-reconstruction': {
    id:'archival-photo-reconstruction', motion:'stationary-plus-detail',
    requiredPasses:['source-inventory','date-range','camera-view-estimation','cross-photo-correspondence'],
    preferredSensors:['photo'],
    hazards:['unknown-lens','single-view-ambiguity','damage','cropping','unknown-scale'],
    qualityChecks:['source-lineage','date-consistency','view-correspondence','uncertainty-recorded'],
    privacyChecks:['likeness-rights','source-rights','sensitive-context'],
    dynamicSubjectPolicy:'separate-background-and-subject',
  },
}

export function guidedCaptureProfile(id: GuidedCaptureClass) {
  return GUIDED_CAPTURE_PROFILES[id]
}

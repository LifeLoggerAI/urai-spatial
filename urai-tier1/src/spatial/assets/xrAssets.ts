export type XrAssetTier =
  | 'xr-entry'
  | 'model'
  | 'input'
  | 'comfort'
  | 'ar-tabletop'
  | 'mobile-spatial'
  | 'audio'
  | 'haptics'
  | 'performance'
  | 'proof';

export type XrAssetSpec = {
  readonly tier: XrAssetTier;
  readonly id: string;
  readonly path: string;
  readonly purpose: string;
  readonly proofRequired: boolean;
  readonly claimGate: 'preview' | 'physical-proof' | 'production-final';
};

const root = '/assets/urai/xr' as const;
const asset = (tier: XrAssetTier, id: string, path: string, purpose: string, claimGate: XrAssetSpec['claimGate'] = 'production-final', proofRequired = true): XrAssetSpec => ({
  tier,
  id,
  path: `${root}${path}`,
  purpose,
  proofRequired,
  claimGate,
});

export const xrEntryAssets = [
  asset('xr-entry', 'quest-entry-main', '/quest-entry-main.webp', 'Quest Browser XR entry chamber', 'physical-proof'),
  asset('xr-entry', 'webxr-fallback', '/webxr-fallback.webp', 'WebXR unsupported fallback', 'preview'),
  asset('xr-entry', 'xr-entry-fallback', '/xr-entry-fallback.svg', 'SVG XR entry fallback', 'preview', false),
  asset('xr-entry', 'desktop-preview', '/desktop-preview.webp', 'Desktop XR preview state', 'preview'),
  asset('xr-entry', 'mobile-ar-state', '/mobile-ar-state.webp', 'Mobile AR availability state', 'preview'),
  asset('xr-entry', 'proof-pending-state', '/proof-pending-state.webp', 'Honest pending hardware proof state', 'preview'),
  asset('xr-entry', 'proof-complete-state', '/proof-complete-state.webp', 'Physical Quest proof complete state', 'physical-proof'),
];

export const xrModelAssets = [
  asset('model', 'home-threshold-glb', '/models/home-threshold.glb', '3D Home threshold scene', 'physical-proof'),
  asset('model', 'ground-room-glb', '/models/ground-room.glb', '3D Ground operations room', 'physical-proof'),
  asset('model', 'life-map-galaxy-glb', '/models/life-map-galaxy.glb', '3D Life Map galaxy environment', 'physical-proof'),
  asset('model', 'focus-chamber-glb', '/models/focus-chamber.glb', '3D selected-memory Focus chamber', 'physical-proof'),
  asset('model', 'replay-film-space-glb', '/models/replay-film-space.glb', '3D Replay film space', 'physical-proof'),
  asset('model', 'orb-companion-glb', '/models/orb-companion.glb', '3D URAI orb companion', 'physical-proof'),
  asset('model', 'mirror-reflection-room-glb', '/models/mirror-reflection-room.glb', '3D Mirror reflection room', 'physical-proof'),
  asset('model', 'passport-vault-room-glb', '/models/passport-vault-room.glb', '3D Passport vault room', 'physical-proof'),
  asset('model', 'ground-collision-mesh', '/models/collision/ground-collision.glb', 'Ground collision-only mesh', 'physical-proof'),
  asset('model', 'life-map-star-lod-pack', '/models/lod/life-map-star-lod.glb', 'Performance-safe star LOD pack', 'physical-proof'),
];

export const xrInputAssets = [
  asset('input', 'gaze-cursor', '/input/gaze-cursor.webp', 'Gaze selection cursor', 'physical-proof'),
  asset('input', 'controller-reticle', '/input/controller-reticle.webp', 'Controller reticle', 'physical-proof'),
  asset('input', 'hand-ray', '/input/hand-ray.webp', 'Hand tracking ray', 'physical-proof'),
  asset('input', 'hover-pulse', '/input/hover-pulse.webp', 'XR hover pulse'),
  asset('input', 'select-pulse', '/input/select-pulse.webp', 'XR select pulse'),
  asset('input', 'back-unwind-gesture', '/input/back-unwind-gesture.webp', 'Back/unwind gesture visual'),
  asset('input', 'long-press-indicator', '/input/long-press-indicator.webp', 'Long-press confirmation indicator'),
  asset('input', 'consent-confirmation-ui', '/input/consent-confirmation-ui.webp', 'Consent confirmation UI'),
  asset('input', 'high-contrast-focus-ring', '/input/high-contrast-focus-ring.webp', 'High-contrast focus ring'),
];

export const xrComfortAssets = [
  asset('comfort', 'comfort-mode', '/comfort/comfort-mode.webp', 'Comfort mode state'),
  asset('comfort', 'seated-mode-card', '/comfort/seated-mode-card.webp', 'Seated mode card'),
  asset('comfort', 'teleport-marker', '/comfort/teleport-marker.webp', 'Teleport marker'),
  asset('comfort', 'snap-turn-indicator', '/comfort/snap-turn-indicator.webp', 'Snap turn indicator'),
  asset('comfort', 'recenter-marker', '/comfort/recenter-marker.webp', 'Recenter marker'),
  asset('comfort', 'height-calibration-guide', '/comfort/height-calibration-guide.webp', 'Height calibration guide'),
  asset('comfort', 'low-stimulation-mode', '/comfort/low-stimulation-mode.webp', 'Low stimulation mode'),
  asset('comfort', 'comfort-vignette', '/comfort/comfort-vignette.webp', 'Movement comfort vignette'),
];

export const arTabletopAssets = [
  asset('ar-tabletop', 'tabletop-life-map', '/ar/tabletop-life-map.webp', 'AR tabletop Life Map'),
  asset('ar-tabletop', 'ar-place-node-anchors', '/ar/place-node-anchors.webp', 'AR place node anchors'),
  asset('ar-tabletop', 'ar-star-selection', '/ar/star-selection.webp', 'AR star selection state'),
  asset('ar-tabletop', 'ar-focus-preview', '/ar/focus-preview.webp', 'AR Focus preview card'),
  asset('ar-tabletop', 'ar-replay-mini-film', '/ar/replay-mini-film.webp', 'AR Replay mini-film'),
  asset('ar-tabletop', 'ar-privacy-boundary', '/ar/privacy-boundary.webp', 'AR privacy boundary'),
  asset('ar-tabletop', 'ar-scale-controls', '/ar/scale-controls.webp', 'AR scale controls'),
  asset('ar-tabletop', 'ar-unsupported-fallback', '/ar/unsupported-fallback.webp', 'Unsupported AR fallback'),
];

export const mobileSpatialAssets = [
  asset('mobile-spatial', 'ios-app-icon', '/mobile/ios-app-icon.webp', 'iOS app icon', 'preview'),
  asset('mobile-spatial', 'android-adaptive-icon', '/mobile/android-adaptive-icon.webp', 'Android adaptive icon', 'preview'),
  asset('mobile-spatial', 'pwa-icon-set', '/mobile/pwa-icon-set.webp', 'PWA install icon set', 'preview'),
  asset('mobile-spatial', 'ios-splash-screen', '/mobile/ios-splash-screen.webp', 'iOS splash screen', 'preview'),
  asset('mobile-spatial', 'android-splash-screen', '/mobile/android-splash-screen.webp', 'Android splash screen', 'preview'),
  asset('mobile-spatial', 'mobile-orb-sheet', '/mobile/mobile-orb-sheet.webp', 'Native-feeling mobile orb sheet'),
  asset('mobile-spatial', 'mobile-spatial-gesture-overlay', '/mobile/spatial-gesture-overlay.webp', 'Mobile spatial gesture overlay'),
  asset('mobile-spatial', 'mobile-replay-controls', '/mobile/replay-controls.webp', 'Mobile Replay controls'),
];

export const spatialAudioAssets = [
  asset('audio', 'orb-idle-audio', '/audio/orb-idle.webm', 'Orb idle hum'),
  asset('audio', 'orb-listening-audio', '/audio/orb-listening.webm', 'Orb listening tone'),
  asset('audio', 'orb-thinking-audio', '/audio/orb-thinking.webm', 'Orb thinking tone'),
  asset('audio', 'portal-open-audio', '/audio/portal-open.webm', 'Portal open tone'),
  asset('audio', 'star-hover-audio', '/audio/star-hover.webm', 'Star hover tone'),
  asset('audio', 'star-select-audio', '/audio/star-select.webm', 'Star select tone'),
  asset('audio', 'replay-beat-audio', '/audio/replay-beat.webm', 'Replay beat pulse'),
  asset('audio', 'mirror-reflection-audio', '/audio/mirror-reflection.webm', 'Mirror reflection tone'),
  asset('audio', 'passport-seal-audio', '/audio/passport-seal.webm', 'Passport seal tone'),
  asset('audio', 'privacy-lock-audio', '/audio/privacy-lock.webm', 'Privacy lock tone'),
];

export const hapticAssets = [
  asset('haptics', 'orb-pulse', '/haptics/orb-pulse.json', 'Orb haptic pulse'),
  asset('haptics', 'portal-pulse', '/haptics/portal-pulse.json', 'Portal haptic pulse'),
  asset('haptics', 'star-hover-haptic', '/haptics/star-hover.json', 'Star hover haptic tick'),
  asset('haptics', 'star-select-haptic', '/haptics/star-select.json', 'Star select haptic pulse'),
  asset('haptics', 'focus-arrival-haptic', '/haptics/focus-arrival.json', 'Focus arrival haptic'),
  asset('haptics', 'replay-beat-haptic', '/haptics/replay-beat.json', 'Replay beat haptic'),
  asset('haptics', 'passport-seal-haptic', '/haptics/passport-seal.json', 'Passport seal haptic'),
  asset('haptics', 'privacy-lock-haptic', '/haptics/privacy-lock.json', 'Privacy lock haptic'),
  asset('haptics', 'warning-haptic', '/haptics/warning.json', 'Warning haptic'),
  asset('haptics', 'completion-haptic', '/haptics/completion.json', 'Completion haptic'),
];

export const performanceAssets = [
  asset('performance', 'texture-atlas', '/performance/texture-atlas.ktx2', 'Quest/mobile texture atlas'),
  asset('performance', 'baked-lightmaps', '/performance/baked-lightmaps.ktx2', 'Baked lightmap pack'),
  asset('performance', 'particle-budget-variants', '/performance/particle-budget-variants.json', 'Particle budget variants'),
  asset('performance', 'low-end-fallback-materials', '/performance/low-end-fallback-materials.json', 'Low-end fallback materials'),
  asset('performance', 'asset-weight-manifest', '/performance/asset-weight-manifest.json', 'Asset weight manifest'),
];

export const xrProofAssets = [
  asset('proof', 'quest-home-proof', '/proof/quest-home-proof.webp', 'Quest Browser Home screenshot', 'physical-proof'),
  asset('proof', 'quest-ground-proof', '/proof/quest-ground-proof.webp', 'Quest Browser Ground screenshot', 'physical-proof'),
  asset('proof', 'quest-life-map-proof', '/proof/quest-life-map-proof.webp', 'Quest Browser Life Map screenshot', 'physical-proof'),
  asset('proof', 'quest-focus-proof', '/proof/quest-focus-proof.webp', 'Quest Browser Focus screenshot', 'physical-proof'),
  asset('proof', 'quest-replay-proof', '/proof/quest-replay-proof.webp', 'Quest Browser Replay screenshot', 'physical-proof'),
  asset('proof', 'quest-xr-entry-proof', '/proof/quest-xr-entry-proof.webp', 'Quest Browser XR entry screenshot', 'physical-proof'),
  asset('proof', 'quest-navigation-proof', '/proof/quest-navigation-proof.mp4', 'Quest navigation video proof', 'physical-proof'),
  asset('proof', 'quest-device-receipt', '/proof/quest-device-receipt.json', 'Quest browser/device/date receipt', 'physical-proof'),
  asset('proof', 'quest-performance-notes', '/proof/quest-performance-notes.md', 'Quest performance notes', 'physical-proof'),
  asset('proof', 'quest-comfort-notes', '/proof/quest-comfort-notes.md', 'Quest comfort notes', 'physical-proof'),
  asset('proof', 'mobile-ar-proof', '/proof/mobile-ar-proof.webp', 'Mobile AR proof screenshot', 'physical-proof'),
  asset('proof', 'v3-proof-matrix', '/proof/v3-proof-matrix.webp', 'V3 proof matrix image', 'physical-proof'),
];

export const xrAssets = [
  ...xrEntryAssets,
  ...xrModelAssets,
  ...xrInputAssets,
  ...xrComfortAssets,
  ...arTabletopAssets,
  ...mobileSpatialAssets,
  ...spatialAudioAssets,
  ...hapticAssets,
  ...performanceAssets,
  ...xrProofAssets,
] as const;

export const xrAssetCount = xrAssets.length;

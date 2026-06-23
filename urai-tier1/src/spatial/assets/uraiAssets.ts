export type ImageAsset = {
  readonly src: string;
  readonly fallback: string;
  readonly alt: string;
};

export type RouteAssetSet = {
  readonly primary: ImageAsset;
  readonly mobile: ImageAsset;
  readonly accents: Record<string, ImageAsset>;
};

const root = "/urai/assets" as const;

const image = (src: string, fallback: string, alt: string): ImageAsset => ({ src, fallback, alt });
const webp = (path: string) => `${root}${path}`;
const fallback = (path: string) => `${root}${path}`;

export function assetCssUrl(path: string) {
  return `url("${path}")`;
}

export function assetCssStack(asset: ImageAsset) {
  return `${assetCssUrl(asset.src)}, ${assetCssUrl(asset.fallback)}`;
}

export const homeAssets = {
  primary: image(webp("/home/home-threshold-main.webp"), fallback("/home/home-threshold-fallback.svg"), "URAI Home threshold between real life and Life Map"),
  mobile: image(webp("/home/home-threshold-mobile.webp"), fallback("/home/home-threshold-fallback.svg"), "URAI Home threshold mobile crop"),
  accents: {
    groundPortal: image(webp("/home/home-ground-portal.webp"), fallback("/home/home-ground-portal-fallback.svg"), "Ground portal into private workforce"),
    skyAscent: image(webp("/home/home-sky-ascent.webp"), fallback("/home/home-sky-ascent-fallback.svg"), "Sky ascent into Life Map galaxy"),
  },
} satisfies RouteAssetSet;

export const groundAssets = {
  primary: image(webp("/ground/ground-world-main.webp"), fallback("/ground/ground-world-fallback.svg"), "Real-life Ground World headquarters"),
  mobile: image(webp("/ground/ground-world-mobile.webp"), fallback("/ground/ground-world-fallback.svg"), "Ground World mobile crop"),
  accents: {
    privacySanctuary: image(webp("/ground/ground-privacy-sanctuary.webp"), fallback("/ground/ground-privacy-fallback.svg"), "Privacy sanctuary and consent vault"),
    reception: image(webp("/ground/ground-reception.webp"), fallback("/ground/ground-reception-fallback.svg"), "Welcome guide reception area"),
    logistics: image(webp("/ground/ground-logistics.webp"), fallback("/ground/ground-logistics-fallback.svg"), "Logistics and errands station"),
    wellness: image(webp("/ground/ground-wellness.webp"), fallback("/ground/ground-wellness-fallback.svg"), "Wellness support corner"),
    memoryArchive: image(webp("/ground/ground-memory-archive.webp"), fallback("/ground/ground-memory-archive-fallback.svg"), "Memory archive shelf"),
  },
} satisfies RouteAssetSet;

export const lifeMapAssets = {
  primary: image(webp("/life-map/life-map-galaxy-main.webp"), fallback("/life-map/life-map-galaxy-fallback.svg"), "Life Map galaxy constellation"),
  mobile: image(webp("/life-map/life-map-galaxy-mobile.webp"), fallback("/life-map/life-map-galaxy-fallback.svg"), "Life Map galaxy mobile crop"),
  accents: {
    threshold: image(webp("/life-map/life-map-node-threshold.webp"), fallback("/life-map/life-map-node-fallback.svg"), "Threshold memory node"),
    becoming: image(webp("/life-map/life-map-node-becoming.webp"), fallback("/life-map/life-map-node-fallback.svg"), "Chapter of Becoming memory node"),
    studio: image(webp("/life-map/life-map-node-studio.webp"), fallback("/life-map/life-map-node-fallback.svg"), "Studio memory node"),
  },
} satisfies RouteAssetSet;

export const focusAssets = {
  primary: image(webp("/focus/focus-memory-chamber-main.webp"), fallback("/focus/focus-memory-chamber-fallback.svg"), "Selected memory Focus chamber"),
  mobile: image(webp("/focus/focus-memory-chamber-mobile.webp"), fallback("/focus/focus-memory-chamber-fallback.svg"), "Focus chamber mobile crop"),
  accents: {},
} satisfies RouteAssetSet;

export const replayAssets = {
  primary: image(webp("/replay/replay-memory-film-main.webp"), fallback("/replay/replay-memory-film-fallback.svg"), "Living memory film Replay scene"),
  mobile: image(webp("/replay/replay-memory-film-mobile.webp"), fallback("/replay/replay-memory-film-fallback.svg"), "Replay memory film mobile crop"),
  accents: {},
} satisfies RouteAssetSet;

export const avatarAssets = {
  receptionist: image(webp("/avatars/receptionist.webp"), fallback("/avatars/avatar-fallback.svg"), "Welcome guide avatar"),
  privacySteward: image(webp("/avatars/privacy-steward.webp"), fallback("/avatars/avatar-fallback.svg"), "Privacy steward avatar"),
  scheduleSteward: image(webp("/avatars/schedule-steward.webp"), fallback("/avatars/avatar-fallback.svg"), "Schedule steward avatar"),
  wellnessGuide: image(webp("/avatars/wellness-guide.webp"), fallback("/avatars/avatar-fallback.svg"), "Wellness guide avatar"),
  relationshipLiaison: image(webp("/avatars/relationship-liaison.webp"), fallback("/avatars/avatar-fallback.svg"), "Relationship liaison avatar"),
  logisticsHelper: image(webp("/avatars/logistics-helper.webp"), fallback("/avatars/avatar-fallback.svg"), "Logistics helper avatar"),
  archivist: image(webp("/avatars/archivist.webp"), fallback("/avatars/avatar-fallback.svg"), "Archivist avatar"),
  operator: image(webp("/avatars/operator.webp"), fallback("/avatars/avatar-fallback.svg"), "Operator avatar"),
  builder: image(webp("/avatars/builder.webp"), fallback("/avatars/avatar-fallback.svg"), "Builder avatar"),
  protector: image(webp("/avatars/protector.webp"), fallback("/avatars/avatar-fallback.svg"), "Protector avatar"),
  mirror: image(webp("/avatars/mirror.webp"), fallback("/avatars/avatar-fallback.svg"), "Mirror avatar"),
  guide: image(webp("/avatars/guide.webp"), fallback("/avatars/avatar-fallback.svg"), "Guide avatar"),
} as const;

export const uiAssets = {
  orbIdle: image(webp("/ui/orb-idle.webp"), fallback("/ui/orb-fallback.svg"), "Idle orb state"),
  orbActive: image(webp("/ui/orb-active.webp"), fallback("/ui/orb-fallback.svg"), "Active orb state"),
  orbListening: image(webp("/ui/orb-listening.webp"), fallback("/ui/orb-fallback.svg"), "Listening orb state"),
  privacyLock: fallback("/ui/privacy-lock.svg"),
  consentKey: fallback("/ui/consent-key.svg"),
  routeArrow: fallback("/ui/route-arrow.svg"),
  portalGround: fallback("/ui/portal-ground.svg"),
  portalSky: fallback("/ui/portal-sky.svg"),
} as const;

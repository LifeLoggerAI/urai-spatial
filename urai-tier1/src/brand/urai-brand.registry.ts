export type UraiProductKey =
  | "uraiCore"
  | "uraiLabs"
  | "uraiFoundation"
  | "uraiStudio"
  | "assetFactory"
  | "uraiAnalytics"
  | "uraiContent"
  | "uraiCommunications"
  | "uraiMarketing"
  | "uraiJobs"
  | "uraiPrivacy"
  | "uraiInvestors"
  | "uraiSpatial";

export type UraiSymbolState = "idle" | "hover" | "active" | "disabled";

export type UraiSymbolModifier =
  | "clean-pulse"
  | "precision-line-scan"
  | "soft-human-halo"
  | "creative-wave"
  | "modular-block-assembly"
  | "data-lattice-pulse"
  | "layer-stack-shift"
  | "node-message-transfer"
  | "broadcast-expansion"
  | "route-path-flow"
  | "protective-boundary"
  | "stable-frame-breathe"
  | "depth-field-parallax";

export interface UraiBrandProduct {
  key: UraiProductKey;
  name: string;
  legalName?: string;
  category: "core" | "creation" | "experience" | "business" | "trust" | "spatial";
  accent: string;
  secondaryAccent?: string;
  symbolModifier: UraiSymbolModifier;
  tagline: string;
  description: string;
  route?: string;
}

export const URAI_BRAND_REGISTRY: Record<UraiProductKey, UraiBrandProduct> = {
  uraiCore: {
    key: "uraiCore",
    name: "URAI",
    legalName: "URAI",
    category: "core",
    accent: "#4F7CFF",
    symbolModifier: "clean-pulse",
    tagline: "The intelligence layer for lived experience.",
    description: "The core URAI platform and identity root.",
    route: "/",
  },
  uraiLabs: {
    key: "uraiLabs",
    name: "URAI Labs",
    legalName: "URAI Labs LLC",
    category: "creation",
    accent: "#7A5CFF",
    symbolModifier: "precision-line-scan",
    tagline: "Experimental systems for human-centered intelligence.",
    description: "Research, engineering, prototypes, and system invention.",
    route: "/labs",
  },
  uraiFoundation: {
    key: "uraiFoundation",
    name: "URAI Foundation",
    category: "trust",
    accent: "#2ED3B7",
    symbolModifier: "soft-human-halo",
    tagline: "Human impact, access, dignity, and care.",
    description: "Mission-driven work, grants, community programs, and public-good systems.",
    route: "/foundation",
  },
  uraiStudio: {
    key: "uraiStudio",
    name: "URAI Studio",
    category: "creation",
    accent: "#B56CFF",
    symbolModifier: "creative-wave",
    tagline: "Creative intelligence for story, motion, and media.",
    description: "Visual systems, content production, design, video, and creative tools.",
    route: "/studio",
  },
  assetFactory: {
    key: "assetFactory",
    name: "Asset Factory",
    category: "creation",
    accent: "#5DDCFF",
    symbolModifier: "modular-block-assembly",
    tagline: "Generative asset production at system scale.",
    description: "Reusable visual, spatial, and content asset generation pipeline.",
    route: "/asset-factory",
  },
  uraiAnalytics: {
    key: "uraiAnalytics",
    name: "URAI Analytics",
    category: "business",
    accent: "#4F7CFF",
    symbolModifier: "data-lattice-pulse",
    tagline: "Behavioral insight from living systems.",
    description: "Metrics, dashboards, scoring, and intelligence interpretation.",
    route: "/analytics",
  },
  uraiContent: {
    key: "uraiContent",
    name: "URAI Content",
    category: "creation",
    accent: "#F5B942",
    symbolModifier: "layer-stack-shift",
    tagline: "Narrative output from intelligence systems.",
    description: "Campaigns, posts, pages, scripts, scrolls, and generated media.",
    route: "/content",
  },
  uraiCommunications: {
    key: "uraiCommunications",
    name: "URAI Communications",
    category: "experience",
    accent: "#2ED3B7",
    symbolModifier: "node-message-transfer",
    tagline: "Connection systems for people, signals, and response.",
    description: "Messaging, notifications, SMS, email, voice, and interaction loops.",
    route: "/communications",
  },
  uraiMarketing: {
    key: "uraiMarketing",
    name: "URAI Marketing",
    category: "business",
    accent: "#FF5E8A",
    symbolModifier: "broadcast-expansion",
    tagline: "Amplification engines for launch and growth.",
    description: "Automated campaigns, funnels, attribution, posting, and optimization.",
    route: "/marketing",
  },
  uraiJobs: {
    key: "uraiJobs",
    name: "URAI Jobs",
    category: "core",
    accent: "#74FFB3",
    symbolModifier: "route-path-flow",
    tagline: "Execution infrastructure for autonomous systems.",
    description: "Background jobs, queues, scheduled runs, worker orchestration, and agents.",
    route: "/jobs",
  },
  uraiPrivacy: {
    key: "uraiPrivacy",
    name: "URAI Privacy",
    category: "trust",
    accent: "#8AA0FF",
    symbolModifier: "protective-boundary",
    tagline: "Consent, protection, and user-controlled intelligence.",
    description: "Privacy controls, consent tiers, data boundaries, and governance systems.",
    route: "/privacy",
  },
  uraiInvestors: {
    key: "uraiInvestors",
    name: "URAI Investors",
    category: "business",
    accent: "#F5B942",
    symbolModifier: "stable-frame-breathe",
    tagline: "Structured growth for the URAI ecosystem.",
    description: "Investor-facing materials, updates, traction, projections, and strategic reports.",
    route: "/investors",
  },
  uraiSpatial: {
    key: "uraiSpatial",
    name: "URAI Spatial",
    category: "spatial",
    accent: "#7A5CFF",
    secondaryAccent: "#4F7CFF",
    symbolModifier: "depth-field-parallax",
    tagline: "A cinematic life-state engine.",
    description: "The spatial runtime for memory, emotion, replay, and symbolic navigation.",
    route: "/spatial",
  },
};

export const URAI_PRODUCT_KEYS = Object.keys(URAI_BRAND_REGISTRY) as UraiProductKey[];

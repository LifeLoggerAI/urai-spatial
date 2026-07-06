import Link from "next/link";
import {
  isProductionCertified,
  releaseReceipt,
  type ReleaseRoute,
} from "@/lib/release-evidence";

export const metadata = {
  title: "URAI Status",
  description: "URAI Spatial implementation and production-certification matrix.",
};

const routeNotes: Record<string, string> = {
  "/": "Home threshold entry",
  "/home": "Canonical Home World",
  "/ground": "Private operating world",
  "/spatial": "Spatial system entry",
  "/life-map": "Spatial memory galaxy",
  "/focus": "Selected memory chamber",
  "/replay": "Memory film route",
  "/mirror": "Reflection realm",
  "/passport": "Identity vault",
  "/status": "Route and certification room",
  "/privacy": "Privacy information",
  "/privacy-controls": "Permission controls",
  "/location-map": "Place and emotional weather",
  "/ascent": "Sky ascent route",
  "/unwind": "Return route",
  "/demo": "Public walkthrough",
  "/demo/life-map": "Life Map demonstration",
  "/demo/replay-film": "Replay film proof surface",
  "/spatial/life-map": "Spatial Life Map",
  "/spatial/life-map-r3f": "R3F Life Map",
  "/spatial/ar-vr": "Explorable XR entry; physical verification remains separate",
  "/terms": "Public terms surface",
};

const routeGroups = [
  {
    title: "Launch spine",
    paths: [
      "/",
      "/home",
      "/ground",
      "/life-map",
      "/focus",
      "/replay",
      "/mirror",
      "/passport",
      "/status",
    ],
  },
  {
    title: "Trust and place",
    paths: [
      "/privacy",
      "/privacy-controls",
      "/location-map",
      "/ascent",
      "/unwind",
      "/terms",
    ],
  },
  {
    title: "Showcase and XR",
    paths: [
      "/spatial",
      "/demo",
      "/demo/life-map",
      "/demo/replay-film",
      "/spatial/life-map",
      "/spatial/life-map-r3f",
      "/spatial/ar-vr",
    ],
  },
];

const routeByPath = new Map(
  releaseReceipt.routes.map((route) => [route.path, route] as const)
);

const groups = routeGroups.map((group) => ({
  title: group.title,
  items: group.paths.map((path) => {
    const route = routeByPath.get(path);
    if (!route) {
      throw new Error(`Release receipt is missing required status route ${path}.`);
    }
    return route;
  }),
}));

const totalRoutes = releaseReceipt.routes.length;
const certified = isProductionCertified(releaseReceipt);

const badgeClass = (route: ReleaseRoute) => {
  if (route.productionState === "verified") {
    return "border-emerald-100/20 bg-emerald-100 text-slate-950";
  }
  if (route.productionState === "failed") {
    return "border-red-200/30 bg-red-200 text-slate-950";
  }
  return route.sourceState === "preview"
    ? "border-amber-200/30 bg-amber-200 text-slate-950"
    : "border-cyan-100/20 bg-cyan-100 text-slate-950";
};

const displayState = (route: ReleaseRoute) =>
  route.productionState === "verified"
    ? "verified live"
    : route.productionState === "failed"
      ? "failed"
      : route.sourceState;

const shortSha = (value: string | null) => (value ? value.slice(0, 12) : "Not recorded");

export default function StatusRoutePage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#020713] px-4 py-8 text-white md:px-8"
      data-testid="urai-final-status-control-room"
      data-launch-surface="premium-status-control-room"
      data-production-certification={certified ? "verified" : "pending-current-release-evidence"}
      data-release-id={releaseReceipt.releaseId}
      data-deployed-sha={releaseReceipt.deployedSha ?? "unrecorded"}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(103,232,249,0.20),transparent_30%),radial-gradient(circle_at_76%_28%,rgba(192,132,252,0.18),transparent_32%),linear-gradient(180deg,#020713_0%,#04111b_58%,#01040a_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_0_38%,rgba(0,0,0,0.64)_78%,rgba(0,0,0,0.92)_100%)]" />
      <section className="relative z-10 mx-auto max-w-[1480px]">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_410px]">
          <article className="rounded-[2rem] border border-cyan-100/15 bg-slate-950/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl md:p-12">
            <p className="text-xs font-black uppercase tracking-[0.42em] text-cyan-200">
              URAI Status · Evidence Control Room
            </p>
            <h1 className="mt-4 max-w-4xl text-6xl font-black leading-[0.82] tracking-[-0.1em] md:text-8xl">
              {certified
                ? "Production release verified."
                : "Routes implemented. Production certification pending."}
            </h1>
            <p className="mt-6 max-w-3xl text-base font-semibold leading-8 text-slate-200/80">
              This room is rendered from release receipt {releaseReceipt.releaseId}. A route is not
              certified live until the tested commit equals the deployed commit, a rollback commit is
              recorded, required checks pass, and every production route is verified.
            </p>
          </article>

          <article className="rounded-[2rem] border border-cyan-100/15 bg-slate-950/60 p-7 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl">
            <div className="mx-auto mb-8 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_38%_28%,white_0_8%,rgba(255,255,255,0.45)_9%_18%,transparent_19%),radial-gradient(circle,#9af8ff_0_24%,#45bfff_44%,rgba(2,12,24,0.95)_100%)] shadow-[0_0_80px_rgba(122,246,255,0.68),0_0_160px_rgba(122,246,255,0.22)]" />
            <div className="grid grid-cols-2 gap-3">
              <EvidenceCard label="Tracked" value={String(totalRoutes)} />
              <EvidenceCard label="Tested SHA" value={shortSha(releaseReceipt.testedSha)} />
              <EvidenceCard label="Deployed SHA" value={shortSha(releaseReceipt.deployedSha)} />
              <EvidenceCard label="Rollback SHA" value={shortSha(releaseReceipt.rollbackSha)} warning={!releaseReceipt.rollbackSha} />
            </div>
          </article>
        </div>

        <section className="mt-6 grid gap-3 rounded-[2rem] border border-white/10 bg-slate-950/58 p-5 md:grid-cols-2 lg:grid-cols-4">
          <EvidenceCard label="Environment" value={releaseReceipt.environment} />
          <EvidenceCard label="Firebase" value={releaseReceipt.firebaseProject} />
          <EvidenceCard label="Domain" value={releaseReceipt.publicDomain.replace("https://", "")} />
          <EvidenceCard label="Receipt time" value={releaseReceipt.generatedAt} />
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {groups.map((group) => (
            <section
              key={group.title}
              className="rounded-[2rem] border border-white/10 bg-slate-950/58 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl"
            >
              <h2 className="text-xl font-black tracking-tight">{group.title}</h2>
              <div className="mt-5 grid gap-3">
                {group.items.map((route) => (
                  <article
                    key={route.path}
                    className="rounded-2xl border border-cyan-100/10 bg-white/[0.045] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <code className="font-mono text-sm font-black text-cyan-100">
                        {route.path}
                      </code>
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${badgeClass(route)}`}
                      >
                        {displayState(route)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-200/76">
                      {routeNotes[route.path] ?? "Tracked release route"}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-[2rem] border border-amber-200/20 bg-amber-200/[0.07] p-6 text-sm font-semibold leading-7 text-amber-50/90">
          <h2 className="text-xl font-black text-amber-100">Certification boundary</h2>
          <p className="mt-2">{releaseReceipt.claimBoundary}</p>
        </section>

        <nav className="mt-6 flex flex-wrap gap-3" aria-label="Status route navigation">
          <Link className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline" href="/home">
            Open Home
          </Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/ground">
            Open Ground
          </Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/life-map">
            Open Life Map
          </Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/spatial/ar-vr">
            Open XR preview
          </Link>
        </nav>
      </section>
    </main>
  );
}

function EvidenceCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        warning
          ? "border-amber-200/20 bg-amber-200/[0.08]"
          : "border-white/10 bg-white/[0.06]"
      }`}
    >
      <span
        className={`text-[10px] font-black uppercase tracking-[0.22em] ${
          warning ? "text-amber-200" : "text-cyan-200"
        }`}
      >
        {label}
      </span>
      <strong className="mt-2 block break-all text-sm md:text-base">{value}</strong>
    </div>
  );
}

// Source-authored same-origin software routes are navigation intent only.
export function lifeMapSoftwareRouteDestination(
  action: string | null | undefined,
  href: string | null | undefined,
  origin: string | null | undefined,
): URL | null;

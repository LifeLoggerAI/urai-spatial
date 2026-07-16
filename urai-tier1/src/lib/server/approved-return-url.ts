export function resolveApprovedReturnUrl(candidate: string | undefined, appUrl: string): URL {
  const approvedOrigin = new URL(appUrl);
  const resolved = candidate ? new URL(candidate, approvedOrigin) : new URL(approvedOrigin);

  if (resolved.username || resolved.password) {
    throw new Error('Return URL credentials are not allowed.');
  }

  if (resolved.origin !== approvedOrigin.origin) {
    throw new Error('Return URL origin is not approved.');
  }

  resolved.hash = '';
  return resolved;
}

export function withStripeResult(base: URL, status: 'success' | 'cancelled', planId: string): string {
  const result = new URL(base);
  result.searchParams.set('stripe', status);
  result.searchParams.set('plan', planId);
  return result.toString();
}

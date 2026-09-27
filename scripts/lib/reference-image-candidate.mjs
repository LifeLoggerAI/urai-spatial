// Captured application evidence is an output, not candidate artwork. Keep
// authored documentation references eligible and retain the exact count gate.
export const referenceImageExclusions = ['_audit/**', '_quarantine/**', 'docs/evidence/**']
export function isReferenceImageCandidate(file) {
  return /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(file)
    && !['_audit/', '_quarantine/', 'docs/evidence/'].some(prefix => file.startsWith(prefix))
}

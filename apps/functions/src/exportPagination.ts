import * as admin from 'firebase-admin'

export const EXPORT_PAGE_SIZE = 250
export const EXPORT_RESOURCE_LIMITS = Object.freeze({ documents: 20_000, jsonBytes: 16 * 1024 * 1024, pages: 1000, elapsedMs: 240_000 })
export type ExportReadBudget = { documents: number; jsonBytes: number; pages: number; startedAt: number; snapshotMillis: number | null }

export function createExportReadBudget(): ExportReadBudget {
  return { documents: 0, jsonBytes: 0, pages: 0, startedAt: Date.now(), snapshotMillis: null }
}

export function requireExportReadBudget(budget: ExportReadBudget) {
  const elapsed = Date.now() - budget.startedAt
  if (elapsed < 0 || elapsed > EXPORT_RESOURCE_LIMITS.elapsedMs || budget.documents > EXPORT_RESOURCE_LIMITS.documents
    || budget.jsonBytes > EXPORT_RESOURCE_LIMITS.jsonBytes || budget.pages > EXPORT_RESOURCE_LIMITS.pages) {
    throw new Error('EXPORT_RESOURCE_BUDGET_EXCEEDED')
  }
}

export function chargeExportValue(budget: ExportReadBudget, value: unknown) {
  budget.documents++
  budget.jsonBytes += Buffer.byteLength(JSON.stringify(value))
  requireExportReadBudget(budget)
}

// The caller supplies one read-only transaction for the entire selected estate.
// Its public SDK contract fixes one snapshot across every collection and page.
export async function collectExportPages<T>(transaction: FirebaseFirestore.Transaction, query: FirebaseFirestore.Query,
  budget: ExportReadBudget, map: (document: FirebaseFirestore.QueryDocumentSnapshot) => T): Promise<T[]> {
  const output: T[] = []
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined
  let previousId = ''
  while (true) {
    requireExportReadBudget(budget)
    let page = query.orderBy(admin.firestore.FieldPath.documentId()).limit(EXPORT_PAGE_SIZE)
    if (cursor) page = page.startAfter(cursor)
    const snapshot = await transaction.get(page)
    budget.pages++
    const readMillis = snapshot.readTime.toMillis()
    if (!Number.isSafeInteger(readMillis) || readMillis <= 0 || (budget.snapshotMillis !== null && budget.snapshotMillis !== readMillis)) {
      throw new Error('EXPORT_SNAPSHOT_CHANGED')
    }
    budget.snapshotMillis = readMillis
    requireExportReadBudget(budget)
    if (snapshot.size > EXPORT_PAGE_SIZE) throw new Error('EXPORT_PAGE_BOUNDARY_INVALID')
    for (const document of snapshot.docs) {
      if (!document.id || Buffer.compare(Buffer.from(document.id), Buffer.from(previousId)) <= 0) throw new Error('EXPORT_CURSOR_DID_NOT_ADVANCE')
      const value = map(document)
      chargeExportValue(budget, value)
      output.push(value)
      previousId = document.id
    }
    if (snapshot.size < EXPORT_PAGE_SIZE) return output
    cursor = snapshot.docs[snapshot.size - 1]
  }
}

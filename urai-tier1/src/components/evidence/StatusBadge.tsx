import type { ReceiptState } from '@/data/receipts'

export function StatusBadge({ state }: { state: ReceiptState }) {
  return <span data-receipt-state={state}>{state}</span>
}

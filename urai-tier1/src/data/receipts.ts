export type ReceiptState = 'built' | 'verified' | 'in-progress' | 'preview' | 'blocked'

export type ReceiptSystem = {
  name: string
  state: ReceiptState
  evidence: string[]
  nextGate: string
}

export const receiptSystems: ReceiptSystem[] = [
  {
    name: 'Spatial Runtime',
    state: 'built',
    evidence: ['Home route', 'Ground route', 'Life Map route', 'Status route'],
    nextGate: 'Attach exact deployment receipt and route screenshots',
  },
  {
    name: 'Privacy Layer',
    state: 'built',
    evidence: ['Passport route', 'Privacy controls route', 'Consent framing'],
    nextGate: 'Attach production privacy gate proof',
  },
  {
    name: 'Demo Walkthrough',
    state: 'in-progress',
    evidence: ['Demo route', 'Tier One spatial experience'],
    nextGate: 'Add guided 60 second narrative overlay',
  },
  {
    name: 'XR Path',
    state: 'preview',
    evidence: ['XR route preview'],
    nextGate: 'Physical device validation and browser proof',
  },
]

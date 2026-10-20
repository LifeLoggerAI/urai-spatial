import { writeFileSync } from 'node:fs'
import { prepareCurrentAdvisoryCheckout } from './advisory-source-authority.mjs'

const [checkout, receipt] = process.argv.slice(2)
if (!checkout || !receipt || process.argv.length !== 4) {
  throw new Error('Usage: node scripts/prepare-current-spatial-reviewed-advisories.mjs CHECKOUT RECEIPT')
}
const acquisition = prepareCurrentAdvisoryCheckout(checkout)
const record = JSON.stringify(acquisition, null, 2) + '\n'
writeFileSync(receipt, record)
console.log(record.trimEnd())

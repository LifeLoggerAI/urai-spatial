import fs from 'node:fs'

const path = 'urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts'
const source = fs.readFileSync(path, 'utf8')
const before = `    await expect(page.getByRole('status').filter({ hasText: /Returned to Life Map overview/i })).toBeVisible()
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe(selectedMemoryId)
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')`
const after = `    await expect(page.getByRole('status').filter({ hasText: /Returned to Life Map overview/i })).toBeVisible()
    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBe(selectedMemoryId)
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')`
const first = source.indexOf(before)
if (first < 0) throw new Error('Reduced-motion Overview assertion block not found')
if (source.indexOf(before, first + before.length) >= 0) throw new Error('Reduced-motion Overview assertion block duplicated')
fs.writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length))

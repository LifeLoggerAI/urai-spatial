// The governed workflow uses two-space top-level event indentation.
// Unknown shapes fail closed; nested manual input names are not events.
export function governedWorkflowIsManualOnly(source) {
  const block = source.match(/^on:[ \t]*\n([\s\S]*?)^permissions[ \t]*:/m)?.[1]
  if (!block) return false
  const events = [...block.matchAll(/^ {2}(\S[^\n]*)$/gm)].map((match) => match[1]).filter((line) => !line.startsWith('#'))
  return events.length === 1 && /^workflow_dispatch:[ \t]*(?:#.*)?$/.test(events[0])
}

/** Windows' stock Python launcher is `py -3`, not necessarily `python3`.
 * This only selects the interpreter for the existing, fail-closed pixel gate.
 * Never installs Python, changes PATH, or skips pixel acceptance.
 */
export function genesisPythonInvocation(platform = process.platform) {
  return platform === 'win32'
    ? { executable: 'py', prefixArgs: ['-3'] }
    : { executable: 'python3', prefixArgs: [] }
}

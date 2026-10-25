/** Shell-result projection over shared sandbox diagnostics. */
import type { ShellRunResult } from '@master-harness/shell'
import { matchesSignature } from '@master-harness/sandbox'
export { isRunnerSpawnFailure, classifyRunnerFailure, matchesSignature } from '@master-harness/sandbox'

/**
 * Classify a failed run against the selected backend's denial dialect.
 * @param result - settled foreground run.
 * @param signatures - case-insensitive denial substrings from the active wrap.
 * @returns whether the failed run matches that denial dialect.
 */
export function classifyDenial(result: ShellRunResult, signatures: readonly string[]): boolean {
  return matchesSignature(result.exitCode, result.stderr.text, signatures)
}

import { Context } from '@master-harness/cordis'
import Sandbox from '@master-harness/sandbox-local'
import SandboxPolicy from '@master-harness/sandbox-policy'
import SessionProjections from '@master-harness/session-projection'
import { onTestFinished } from 'vitest'
import type { SandboxMode } from '@master-harness/sandbox'

/** Mount the Python runtime's policy and confinement providers with owned teardown. */
export async function createRuntimeContext(policy: { mode?: SandboxMode; workspaceRoot?: string } = {}): Promise<Context> {
  const ctx = new Context()
  onTestFinished(async () => { await ctx.fiber.dispose() })
  await ctx.plugin(Sandbox, {})
  await ctx.plugin(SessionProjections)
  await ctx.plugin(SandboxPolicy, { mode: 'danger-full-access', ...policy })
  return ctx
}

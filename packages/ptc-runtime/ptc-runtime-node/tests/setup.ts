import { Context } from '@master-harness/cordis'
import { onTestFinished } from 'vitest'
import SessionStore from '@master-harness/session'
import FileSystem from '@master-harness/fs-local'
import Subprocess from '@master-harness/subprocess-local'
import Sandbox from '@master-harness/sandbox-local'
import SandboxPolicy from '@master-harness/sandbox-policy'
import SessionProjections from '@master-harness/session-projection'
import type { SandboxMode } from '@master-harness/sandbox'
import NodeRuntime from '../src/index.ts'
import type { Config } from '../src/index.ts'

export async function mountRuntime(ctx: Context, config: Config = {}, policy: { mode?: SandboxMode; workspaceRoot?: string } = {}) {
  onTestFinished(async () => { await ctx.fiber.dispose() })
  if (!ctx.get('sessions')) await ctx.plugin(SessionStore)
  if (!ctx.get('fs')) await ctx.plugin(FileSystem)
  if (!ctx.get('subprocess')) await ctx.plugin(Subprocess)
  if (!ctx.get('sandbox')) await ctx.plugin(Sandbox, {})
  if (!ctx.get('sessionProjections')) await ctx.plugin(SessionProjections)
  if (!ctx.get('sandboxPolicy')) await ctx.plugin(SandboxPolicy, { mode: 'danger-full-access', ...policy })
  const fiber = await ctx.plugin(NodeRuntime, config)
  return { runtime: ctx.ptcRuntime as NodeRuntime, fiber }
}

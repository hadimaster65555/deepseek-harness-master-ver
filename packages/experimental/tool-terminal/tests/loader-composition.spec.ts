import { executeToolFixture } from '@master-harness/tool-testkit'
import * as NativeToolExecutor from '@master-harness/tool-executor-native'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { unsupportedModel, provideWorkingDirectoryFixture, unsupportedInbox } from '@master-harness/agent-loop-testkit'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@master-harness/cordis'
import Loader from '@master-harness/cordis-plugin-loader'
import Include from '@master-harness/cordis-plugin-include'
import { ToolCallId } from '@master-harness/llm'
import { Session, SessionId } from '@master-harness/session'
import AgentRegistry from '@master-harness/agent'
import type { Agent } from '@master-harness/agent'
import SystemPrompt from '@master-harness/system-prompt'
import ToolRuntime from '@master-harness/tools'
import TerminalSessionService from '@master-harness/terminal'
import SandboxProvider from '@master-harness/sandbox'
import type { ConfinedArgv, SandboxPolicy } from '@master-harness/sandbox'
import SandboxPolicyService from '@master-harness/sandbox-policy'
import SessionProjectionRegistry from '@master-harness/session-projection'
import LocalSubprocessRuntime from '@master-harness/subprocess-local'
import * as TerminalLocal from '@master-harness/terminal-bash'
import * as ToolPty from '@master-harness/tool-terminal'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

class PassthroughSandbox extends SandboxProvider {
  async confine(argv: readonly string[], _policy: SandboxPolicy): Promise<ConfinedArgv> {
    return { argv: [...argv], enforcement: 'full', denialSignatures: [], runnerFailureRules: [] }
  }
}

async function agent(ctx: Context): Promise<Agent> {
  const scope = ctx.plugin(() => {})
  const id = SessionId('pty-loader-agent')
  const session = Session.create(id)
  const value: Agent = {
    id, options: {}, session, model: unsupportedModel(),
    inbox: unsupportedInbox(),
    status: 'idle',
    ctx: scope.ctx,
    send: () => {},
    followup: () => {}, steer: () => {}, inject: () => {}, cancel() {},
    runMaintenance: job => job(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  }
  await ctx.agents.register(value)
  return value
}

function resultText(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter(block => block.type === 'text').map(block => block.text).join('')
}

const suite = process.platform === 'linux' || process.platform === 'darwin' ? describe : describe.skip

suite('terminal real Loader composition through cordis.yml', () => {
  it('boots cordis.yml and preserves shell state across real tool calls', async () => {
    root = await mkdtemp(join(tmpdir(), 'mh-pty-loader-'))
    const configPath = join(root, 'cordis.yml')
    await writeFile(configPath, [
      "- name: '@master-harness/agent'",
      "- name: '@master-harness/system-prompt'",
      "- name: '@master-harness/tools'",
      "- name: '@master-harness/tool-executor-native'",
      "- name: '@master-harness/terminal'",
      "- name: '@master-harness/test-sandbox'",
      "- name: '@master-harness/session-projection'",
      "- name: '@master-harness/sandbox-policy'",
      '  config:',
      '    mode: danger-full-access',
      `    workspaceRoot: ${JSON.stringify(root)}`,
      "- name: '@master-harness/subprocess-local'",
      "- name: '@master-harness/terminal-bash'",
      '  config:',
      '    pollIntervalMs: 10',
      '    exactProbeAfterMs: 20',
      '    idleSilenceMs: 250',
      '    handoffGraceMs: 250',
      '    timeoutMs: 2000',
      '    disposeGraceMs: 500',
      "- name: '@master-harness/tool-terminal'",
      '',
    ].join('\n'))

    context = new Context()

    provideWorkingDirectoryFixture(context)
    context.baseUrl = pathToFileURL(root).href + '/'
    await context.plugin(Loader)
    context.loader.builtins.include = Include
    const modules = new Map<string, unknown>([
      ['@master-harness/agent', AgentRegistry],
      ['@master-harness/system-prompt', SystemPrompt],
      ['@master-harness/tools', ToolRuntime],
      ['@master-harness/tool-executor-native', NativeToolExecutor],
      ['@master-harness/terminal', TerminalSessionService],
      ['@master-harness/test-sandbox', PassthroughSandbox],
      ['@master-harness/session-projection', SessionProjectionRegistry],
      ['@master-harness/sandbox-policy', SandboxPolicyService],
      ['@master-harness/subprocess-local', LocalSubprocessRuntime],
      ['@master-harness/terminal-bash', TerminalLocal],
      ['@master-harness/tool-terminal', ToolPty],
    ])
    context.loader.internal = {
      version: 'v2',
      async import(specifier: string) {
        if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
        return modules.get(specifier)
      },
    } as unknown as NonNullable<typeof context.loader.internal>
    await context.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
    await context.loader.await()

    const owner = await agent(context)
    const signal = new AbortController().signal
    const spawn = await executeToolFixture(context, {
      signal, callId: ToolCallId('spawn'), name: 'terminal_open', arguments: { type: 'shell', name: 'main', cwd: root }, agent: owner,
    })
    expect(resultText(spawn)).toContain('started terminal session pty-1 (main)')

    await executeToolFixture(context, {
      signal, callId: ToolCallId('state'), name: 'terminal_send', arguments: { sessionId: 'pty-1', text: 'export KEEP=loader; cd /' }, agent: owner,
    })
    const read = await executeToolFixture(context, {
      signal, callId: ToolCallId('read'), name: 'terminal_send', arguments: { sessionId: 'pty-1', text: 'printf "cwd=%s keep=%s\\n" "$PWD" "$KEEP"' }, agent: owner,
    })
    expect(resultText(read)).toContain('cwd=/ keep=loader')
    expect(context.terminals.list(owner)).toHaveLength(1)
  }, 15_000)
})

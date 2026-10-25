/** The standalone SDK-minimal bundle's complete declared Cordis tree. */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { entryListSchema } from '@master-harness/cordis-plugin-include'

function packageName(specifier: string): string {
  return specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]!
}

describe('mh-sdk-minimal bundle', () => {
  it('declares one standalone allowlisted tree with every row dependency', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      mh?: { bundle?: { patch?: string } }
    }
    expect(manifest.mh?.bundle?.patch).toBe('./cordis.patch.yml')
    const patches = yaml.load(
      readFileSync(resolve(root, manifest.mh!.bundle!.patch!), 'utf8'),
      { schema: entryListSchema },
    ) as Array<{ insert?: Array<{ id?: string; inject?: string[]; name?: string; config?: Record<string, unknown>; disabled?: unknown }> }>
    expect(patches).toHaveLength(1)
    const rows = patches[0]?.insert ?? []
    expect(rows.map(row => [row.id, row.name])).toEqual([
      ['sdk-app-startup', '@master-harness/sdk-app'],
      ['sdk-jsonrpc-server', '@master-harness/sdk-jsonrpc-server'],
      ['deepseek-llm-api-extensions', '@master-harness/deepseek-llm-api-extensions'],
      ['session-log-deepseek', '@master-harness/session-log-deepseek'],
      ['plugin-package-inventory-deepseek', '@master-harness/plugin-package-inventory-deepseek'],
      ['llm-deepseek', '@master-harness/llm-deepseek-api-key'],
      ['sandbox', '@master-harness/sandbox-local'],
      ['filesystem', '@master-harness/fs-local'],
      ['attachment-local', '@master-harness/attachment-local'],
      ['tool-fs', '@master-harness/tool-fs'],
      ['working-directory', '@master-harness/working-directory'],
      ['tool-working-directory', '@master-harness/tool-working-directory'],
      ['session-projection', '@master-harness/session-projection'],
      ['token-meter', '@master-harness/token-meter'],
      ['compaction-basic', '@master-harness/compaction-basic'],
      ['image-offload', '@master-harness/compaction-image-offload'],
      ['sandbox-policy', '@master-harness/sandbox-policy'],
      ['subprocess', '@master-harness/subprocess-local'],
      ['pty', '@master-harness/terminal'],
      ['terminal-bash', '@master-harness/terminal-bash'],
      ['terminal-pwsh', '@master-harness/terminal-bash'],
      ['timer', '@master-harness/cordis-plugin-timer'],
      ['llm', '@master-harness/llm'],
      ['session', '@master-harness/session'],
      ['session-title', '@master-harness/session-title'],
      ['system-prompt', '@master-harness/system-prompt'],
      ['tools', '@master-harness/tools'],
      ['tool-executor-native', '@master-harness/tool-executor-native'],
      ['mcp-resources', '@master-harness/mcp-resources'],
      ['agent', '@master-harness/agent'],
      ['llm-retry', '@master-harness/llm-retry'],
      ['jobs', '@master-harness/jobs-local'],
      ['agent-loop', '@master-harness/agent-loop'],
      ['persistent-bash', '@master-harness/tool-bash-persistent'],
      ['persistent-pwsh', '@master-harness/tool-pwsh-persistent'],
      ['sessions', '@master-harness/session-persistence-jsonl'],
      ['session-checkpoint-policy', '@master-harness/session-checkpoint-policy'],
    ])
    expect(rows.find(row => row.id === 'sdk-app-startup')?.config).toEqual({ profile: 'sdk-minimal' })
    expect(rows.find(row => row.id === 'sdk-jsonrpc-server')).toMatchObject({
      inject: ['sdkAppStartup', 'loader'],
      config: { maxTokensAsSuccess: false },
    })
    expect(rows.find(row => row.id === 'llm-deepseek')?.config).toEqual({
      apiKeyEnv: 'DEEPSEEK_API_KEY',
      defaultContextWindow: { __jsExpr: 'Number(process.env.MH_CONTEXT_WINDOW ?? 1000000)' },
      streamIdleTimeoutMs: 172800000,
    })
    expect(rows.find(row => row.id === 'system-prompt')?.config).toEqual({
      includeHarnessIdentity: false,
      includeRuntimeContext: false,
      personaPrefix: { __jsExpr: "process.env.MH_SYSTEM_PROMPT ?? 'You are a helpful software engineer assistant.'" },
    })
    expect(rows.find(row => row.id === 'agent-loop')?.config).toEqual({ agents: [] })
    expect(rows.find(row => row.id === 'tool-fs')?.config).toEqual({ read: false, readImage: true, write: false, edit: false })
    expect(rows.find(row => row.id === 'compaction-basic')?.config).toBeUndefined()
    expect(rows.find(row => row.id === 'terminal-bash')).toMatchObject({
      disabled: { __jsExpr: "process.platform === 'win32'" },
    })
    expect(rows.find(row => row.id === 'terminal-pwsh')).toMatchObject({
      disabled: { __jsExpr: "process.platform !== 'win32'" },
      config: { shellDialect: 'pwsh', timeoutMs: 300000 },
    })
    expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual(
      [...new Set(rows.map(row => row.name).filter((name): name is string => name !== undefined).map(packageName))].sort(),
    )
  })
})

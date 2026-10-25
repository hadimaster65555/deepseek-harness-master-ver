/**
 * Registry tests for `@master-harness/shell-env`: built-in facts, contributor
 * ownership and validation, collection ordering, effect-scoped disposal, and
 * the explicit disposer contract.
 */

import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@master-harness/cordis'
import { ToolCallId } from '@master-harness/llm'
import type { Agent } from '@master-harness/agent'
import { SESSION_FORMAT_VERSION } from '@master-harness/session'
import type { ToolExecution } from '@master-harness/tools'
import { ShellEnvRegistry } from '@master-harness/shell-env'
import * as BashEnvPlugin from '@master-harness/shell-env'

const testToolSignal = new AbortController().signal

afterEach(() => vi.unstubAllEnvs())

function execution(sessionId?: string): ToolExecution {
  return {
    signal: testToolSignal,
    token: Symbol('bash-env-test') as ToolExecution['token'],
    callId: ToolCallId('bash-env-call'),
    rootCallId: ToolCallId('bash-env-call'),
    name: 'bash',
    arguments: { command: 'true' },
    ...(sessionId === undefined
      ? {}
      : {
        agent: {
          session: {
            header: { version: SESSION_FORMAT_VERSION, id: sessionId, createdAt: 0, isSeeded: false },
          },
        } as unknown as Agent,
      }),
  }
}

describe('ShellEnvRegistry', () => {
  it('collects unconditional shell facts and the current agent session id', () => {
    const ctx = new Context()
    const registry = new ShellEnvRegistry(ctx, { mhHome: './test-mh-home' })

    expect(registry.collect(execution())).toEqual({
      MH_HOME: resolve('./test-mh-home'),
      MH_SHELL: '1',
    })
    expect(registry.collect(execution('session-a'))).toEqual({
      MH_HOME: resolve('./test-mh-home'),
      MH_SESSION_ID: 'session-a',
      MH_SHELL: '1',
    })
  })

  it('collects the launcher-provided profile name and directory when a profile context exists', () => {
    const ctx = new Context()
    ctx.provide('profileContext', {
      name: 'web', dir: '/profiles/web', patchPath: '/profiles/web/cordis.patch.yml', installAnchor: '/mh/package.json',
      cwd: '/work', home: '/home', startedBundles: [], overlays: [], telemetryDisabledEnv: undefined,
    })
    const registry = new ShellEnvRegistry(ctx, { mhHome: './test-mh-home' })
    expect(registry.collect(execution())).toMatchObject({ MH_PROFILE: 'web', MH_PROFILE_DIR: '/profiles/web' })
    expect(() => registry.register({
      name: 'profile-claimer',
      variables: { MH_PROFILE: { description: 'Reserved key.' } },
      resolve: () => ({}),
    })).toThrow(/reserved key "MH_PROFILE"/)
  })

  it('resolves MH_HOME from the ambient override or the user-home default', () => {
    vi.stubEnv('MH_HOME', './ambient-mh-home')
    const fromEnvironment = new ShellEnvRegistry(new Context())
    expect(fromEnvironment.collect(execution()).MH_HOME).toBe(resolve('./ambient-mh-home'))

    vi.stubEnv('MH_HOME', undefined)
    const fromDefault = new ShellEnvRegistry(new Context())
    expect(fromDefault.collect(execution()).MH_HOME).toBe(join(homedir(), '.mh'))
  })

  it('collects declared contributor variables and omits unavailable values', () => {
    const ctx = new Context()
    const registry = new ShellEnvRegistry(ctx, { mhHome: './test-mh-home' })
    registry.register({
      name: 'optional-session-fact',
      variables: {
        MH_SESSION_OPTIONAL: { description: 'Optional session-scoped test fact.' },
      },
      resolve: exec => exec.agent === undefined ? {} : { MH_SESSION_OPTIONAL: exec.agent.session.header.id },
    })
    registry.register({
      name: 'always-available-fact',
      variables: {
        MH_ALWAYS_AVAILABLE: { description: 'Always-available test fact.' },
      },
      resolve: () => ({ MH_ALWAYS_AVAILABLE: 'yes' }),
    })

    expect(registry.collect(execution())).not.toHaveProperty('MH_SESSION_OPTIONAL')
    expect(registry.collect(execution()).MH_ALWAYS_AVAILABLE).toBe('yes')
    expect(registry.collect(execution('session-b')).MH_SESSION_OPTIONAL).toBe('session-b')
    expect(registry.list()).toEqual([
      {
        contributor: 'always-available-fact',
        description: 'Always-available test fact.',
        key: 'MH_ALWAYS_AVAILABLE',
      },
      {
        contributor: 'optional-session-fact',
        description: 'Optional session-scoped test fact.',
        key: 'MH_SESSION_OPTIONAL',
      },
    ])
  })

  it('rejects duplicate variable ownership at registration time', () => {
    const ctx = new Context()
    const registry = new ShellEnvRegistry(ctx, { mhHome: './test-mh-home' })
    registry.register({
      name: 'first',
      variables: { MH_SHARED: { description: 'First owner.' } },
      resolve: () => ({ MH_SHARED: 'first' }),
    })

    expect(() => registry.register({
      name: 'second',
      variables: { MH_SHARED: { description: 'Second owner.' } },
      resolve: () => ({ MH_SHARED: 'second' }),
    })).toThrow(/MH_SHARED.*first.*second|MH_SHARED.*second.*first/)
  })

  it('rejects duplicate contributor names and malformed declarations', () => {
    const registry = new ShellEnvRegistry(new Context(), { mhHome: './test-mh-home' })
    registry.register({
      name: 'declared',
      variables: { MH_DECLARED: { description: 'Declared fact.' } },
      resolve: () => ({}),
    })

    expect(() => registry.register({
      name: 'declared',
      variables: { MH_ANOTHER: { description: 'Another fact.' } },
      resolve: () => ({}),
    })).toThrow(/already registered/)
    expect(() => registry.register({
      name: ' ',
      variables: { MH_BLANK_NAME: { description: 'Blank owner.' } },
      resolve: () => ({}),
    })).toThrow(/name must be non-empty/)
    expect(() => registry.register({
      name: 'invalid-key',
      variables: { mh_invalid: { description: 'Invalid key.' } } as unknown as Record<'MH_INVALID', { description: string }>,
      resolve: () => ({}),
    })).toThrow(/invalid key/)
    expect(() => registry.register({
      name: 'reserved-key',
      variables: { MH_HOME: { description: 'Reserved key.' } },
      resolve: () => ({}),
    })).toThrow(/reserved key/)
    expect(() => registry.register({
      name: 'blank-description',
      variables: { MH_BLANK_DESCRIPTION: { description: ' ' } },
      resolve: () => ({}),
    })).toThrow(/must describe/)
  })

  it('rejects undeclared variables returned by a contributor', () => {
    const ctx = new Context()
    const registry = new ShellEnvRegistry(ctx, { mhHome: './test-mh-home' })
    registry.register({
      name: 'drifted-provider',
      variables: { MH_DECLARED: { description: 'Declared fact.' } },
      resolve: () => ({ MH_UNDECLARED: 'bad' }),
    })

    expect(() => registry.collect(execution())).toThrow(/drifted-provider.*MH_UNDECLARED/)
  })

  it('rejects non-string values returned by a contributor', () => {
    const registry = new ShellEnvRegistry(new Context(), { mhHome: './test-mh-home' })
    registry.register({
      name: 'wrong-value-type',
      variables: { MH_STRING: { description: 'String fact.' } },
      resolve: () => ({ MH_STRING: 42 }) as unknown as Record<'MH_STRING', string>,
    })

    expect(() => registry.collect(execution())).toThrow(/wrong-value-type.*non-string.*MH_STRING/)
  })

  it('removes an effect-scoped contributor when its plugin is disposed', async () => {
    const ctx = new Context()
    const registry = new ShellEnvRegistry(ctx, { mhHome: './test-mh-home' })
    const fiber = await ctx.plugin({
      inject: ['shellEnv'],
      apply(inner: Context) {
        inner.shellEnv.register({
          name: 'temporary',
          variables: { MH_TEMPORARY: { description: 'Temporary fact.' } },
          resolve: () => ({ MH_TEMPORARY: 'present' }),
        })
      },
    })

    expect(registry.collect(execution()).MH_TEMPORARY).toBe('present')
    await fiber.dispose()
    expect(registry.collect(execution())).not.toHaveProperty('MH_TEMPORARY')
  })

  it('returns an explicit contributor disposer', () => {
    const registry = new ShellEnvRegistry(new Context(), { mhHome: './test-mh-home' })
    const dispose = registry.register({
      name: 'explicit-disposal',
      variables: { MH_EXPLICIT_DISPOSAL: { description: 'Explicitly disposed fact.' } },
      resolve: () => ({ MH_EXPLICIT_DISPOSAL: 'present' }),
    })

    expect(registry.collect(execution()).MH_EXPLICIT_DISPOSAL).toBe('present')
    dispose()
    expect(registry.collect(execution())).not.toHaveProperty('MH_EXPLICIT_DISPOSAL')
  })

  it('the plugin registers the service with no contributors on load', async () => {
    const ctx = new Context()
    await ctx.plugin(BashEnvPlugin)
    expect(ctx.shellEnv).toBeInstanceOf(ShellEnvRegistry)
    expect(ctx.shellEnv.list()).toEqual([])
  })
})

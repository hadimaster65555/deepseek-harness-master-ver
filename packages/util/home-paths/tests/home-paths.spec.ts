import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AGENTS_HOME_DIR_NAME,
  DEFAULT_AGENTS_HOME_DISPLAY,
  DEFAULT_MH_HOME_DISPLAY,
  MH_HOME_DIR_NAME,
  agentsHomeDisplay,
  canonicalizeWatchPath,
  defaultAgentsHome,
  defaultMhHome,
  mhCachePath,
  mhHomeDisplay,
  mhHomePath,
  expandHomePath,
  resolveAgentsHome,
  resolveMhHome,
} from '@master-harness/home-paths'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('mh path helpers', () => {
  it('owns the shared default MH home directory name', () => {
    expect(MH_HOME_DIR_NAME).toBe('.mh')
    expect(DEFAULT_MH_HOME_DISPLAY).toBe('~/.mh')
    expect(defaultMhHome()).toBe(join(homedir(), '.mh'))
  })

  it('expands tilde paths without changing non-tilde paths', () => {
    expect(expandHomePath('~')).toBe(homedir())
    expect(expandHomePath('~/.mh')).toBe(join(homedir(), '.mh'))
    expect(expandHomePath('~\\.mh')).toBe(join(homedir(), '.mh'))
    expect(expandHomePath('/tmp/.mh')).toBe('/tmp/.mh')
    expect(expandHomePath('~other/.mh')).toBe('~other/.mh')
  })

  it('resolves explicit path before MH_HOME and the default', () => {
    const envHome = join(homedir(), 'env-mh')

    expect(resolveMhHome('/tmp/explicit-mh', { MH_HOME: '~/env-mh' })).toBe(resolve('/tmp/explicit-mh'))
    expect(resolveMhHome(undefined, { MH_HOME: '~/env-mh' })).toBe(envHome)
    expect(resolveMhHome(undefined, {})).toBe(defaultMhHome())
  })

  it('treats an empty or whitespace-only MH_HOME as unset', () => {
    expect(resolveMhHome(undefined, { MH_HOME: '' })).toBe(defaultMhHome())
    expect(resolveMhHome(undefined, { MH_HOME: '   ' })).toBe(defaultMhHome())
  })

  it('joins child segments onto the resolved MH_HOME', () => {
    vi.stubEnv('MH_HOME', '~/env-mh')
    expect(mhHomePath()).toBe(join(homedir(), 'env-mh'))
    expect(mhHomePath('storages', 'cache')).toBe(join(homedir(), 'env-mh', 'storages', 'cache'))
  })

  it('labels a resolved home by whether it is the default root', () => {
    expect(mhHomeDisplay(resolve(defaultMhHome()))).toBe('~/.mh')
    expect(mhHomeDisplay('/some/other/root')).toBe('$MH_HOME')
  })

  it('owns the shared default agents home directory name', () => {
    expect(AGENTS_HOME_DIR_NAME).toBe('.agents')
    expect(DEFAULT_AGENTS_HOME_DISPLAY).toBe('~/.agents')
    expect(defaultAgentsHome()).toBe(join(homedir(), '.agents'))
  })

  it('resolves an explicit agents home before MH_AGENTS_HOME and the default', () => {
    const envHome = join(homedir(), 'env-agents')

    expect(resolveAgentsHome('/tmp/explicit-agents', { MH_AGENTS_HOME: '~/env-agents' })).toBe(resolve('/tmp/explicit-agents'))
    expect(resolveAgentsHome(undefined, { MH_AGENTS_HOME: '~/env-agents' })).toBe(envHome)
    expect(resolveAgentsHome(undefined, {})).toBe(defaultAgentsHome())
  })

  it('treats an empty or whitespace-only MH_AGENTS_HOME as unset', () => {
    expect(resolveAgentsHome(undefined, { MH_AGENTS_HOME: '' })).toBe(defaultAgentsHome())
    expect(resolveAgentsHome(undefined, { MH_AGENTS_HOME: '   ' })).toBe(defaultAgentsHome())
  })

  it('labels a resolved agents home by whether it is the default root', () => {
    expect(agentsHomeDisplay(resolve(defaultAgentsHome()))).toBe('~/.agents')
    expect(agentsHomeDisplay('/some/other/root')).toBe('$MH_AGENTS_HOME')
  })

  it.each([
    [undefined, join(homedir(), '.mh')],
    ['', join(homedir(), '.mh')],
    ['   ', join(homedir(), '.mh')],
    ['~/env-mh', join(homedir(), 'env-mh')],
    ['./relative-mh', resolve('./relative-mh')],
  ] as const)('resolves cache paths with MH_HOME=%j', (home, expectedHome) => {
    vi.stubEnv('MH_HOME', home)
    try {
      expect(mhCachePath()).toBe(join(expectedHome, 'cache'))
      expect(mhCachePath('models', 'index.json')).toBe(join(expectedHome, 'cache', 'models', 'index.json'))
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('resolves configured cache homes before the environment', () => {
    vi.stubEnv('MH_HOME', '~/env-mh')
    try {
      expect(mhCachePath({ mhHome: '~/explicit-mh' })).toBe(join(homedir(), 'explicit-mh', 'cache'))
      expect(mhCachePath({ mhHome: './explicit-mh' }, 'attachments', 'request-images'))
        .toBe(resolve('./explicit-mh/cache/attachments/request-images'))
      expect(mhCachePath({}, 'attachments')).toBe(join(homedir(), 'env-mh', 'cache', 'attachments'))
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('canonicalizes a watcher ancestor while preserving a missing suffix', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mh-watch-path-'))
    const target = join(root, 'target')
    const alias = join(root, 'alias')
    try {
      await mkdir(target)
      await symlink(target, alias, process.platform === 'win32' ? 'junction' : 'dir')
      await expect(canonicalizeWatchPath(alias)).resolves.toBe(await realpath(target))
      await expect(canonicalizeWatchPath(join(alias, 'later', 'config.yml'))).resolves.toBe(
        join(await realpath(target), 'later', 'config.yml'),
      )
      const file = join(root, 'file')
      await writeFile(file, 'not a directory')
      await expect(canonicalizeWatchPath(join(file, 'child'))).rejects.toMatchObject({ code: 'ENOTDIR' })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

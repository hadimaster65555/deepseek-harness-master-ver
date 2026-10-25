/**
 * The identity, timestamp, link, mutation, and durability-sink guarantees
 * MemoryVfs owes its consumers, asserted directly rather than through the
 * `node:fs` bridge.
 *
 * `mh-fs-local` builds a version token from `dev:ino:size:mtimeNs:ctimeNs` and
 * refuses a write whose token moved since it read. Two properties carry that:
 * `ino` identifies the entry at a path, and `mtimeMs` moves on every write. The
 * timestamp cases freeze the clock, because these writes are in memory and two
 * revisions routinely land in the same millisecond — a real-clock test passes
 * whether or not the strict increment exists.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryVfs } from '../../src/storage/memory.ts'
import type { VfsBigIntStats, VfsMutation, VfsMutationSink, VfsStats } from '../../src/storage/types.ts'

const identity = (vfs: MemoryVfs, path: string): bigint =>
  (vfs.statSync(path, { bigint: true }) as VfsBigIntStats).ino

const linkCount = (vfs: MemoryVfs, path: string): bigint =>
  (vfs.statSync(path, { bigint: true }) as VfsBigIntStats).nlink

const modified = (vfs: MemoryVfs, path: string): number => (vfs.statSync(path) as VfsStats).mtimeMs

afterEach(() => { vi.restoreAllMocks() })

describe('entry identity', () => {
  it('distinguishes paths and holds each identity across repeated stats', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/mh/one.txt', 'one')
    vfs.seed('/mh/two.txt', 'two')
    const first = identity(vfs, '/mh/one.txt')
    expect(identity(vfs, '/mh/two.txt')).not.toBe(first)
    expect(identity(vfs, '/mh/one.txt')).toBe(first)
  })

  it('forgets the identities under a directory removed as a subtree', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/mh/skills/git/SKILL.md', '# git\n')
    const before = identity(vfs, '/mh/skills/git/SKILL.md')
    vfs.rmSync('/mh/skills', { recursive: true })
    vfs.seed('/mh/skills/git/SKILL.md', '# git rebuilt\n')
    expect(identity(vfs, '/mh/skills/git/SKILL.md')).not.toBe(before)
  })

  it('moves the source identity when a file replaces another path', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/mh/from.txt', 'moved')
    vfs.seed('/mh/to.txt', 'replaced')
    const [source, destination] = [identity(vfs, '/mh/from.txt'), identity(vfs, '/mh/to.txt')]
    vfs.renameSync('/mh/from.txt', '/mh/to.txt')
    const renamed = identity(vfs, '/mh/to.txt')
    expect(vfs.readFileSync('/mh/to.txt', 'utf8')).toBe('moved')
    expect([renamed === source, renamed === destination]).toEqual([true, false])
  })
})

describe('modification time', () => {
  it('hydrates explicit metadata without confusing timestamps with permission bits', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/mh/restored', 'value', { mode: 0o600, mtimeMs: 1_600_000_000_000 })
    vfs.seedDirectory('/mh/restored-directory', { mode: 0o700, mtimeMs: 1_600_000_000_001 })
    const stats = vfs.statSync('/mh/restored') as VfsStats
    const directory = vfs.statSync('/mh/restored-directory') as VfsStats
    expect([stats.mode & 0o777, stats.mtimeMs]).toEqual([0o600, 1_600_000_000_000])
    expect([directory.mode & 0o777, directory.mtimeMs]).toEqual([0o700, 1_600_000_000_001])
  })

  it('advances on every write even while the clock stands still', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const vfs = new MemoryVfs()
    vfs.seed('/mh/log.jsonl', 'first\n')
    const seeded = modified(vfs, '/mh/log.jsonl')
    vfs.writeFileSync('/mh/log.jsonl', 'second\n')
    const written = modified(vfs, '/mh/log.jsonl')
    vfs.appendFileSync('/mh/log.jsonl', 'third\n')
    const appended = modified(vfs, '/mh/log.jsonl')
    vfs.truncateSync('/mh/log.jsonl', 6)
    const truncated = modified(vfs, '/mh/log.jsonl')
    expect([written > seeded, appended > written, truncated > appended]).toEqual([true, true, true])
    // One millisecond per revision: the increment is the minimum that separates
    // two tokens, not a coarser bump that would skew a real timestamp.
    expect(truncated - seeded).toBe(3)
  })

  it('takes the clock once the clock has passed the entry', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const vfs = new MemoryVfs()
    vfs.seed('/mh/log.jsonl', 'first\n')
    clock.mockReturnValue(1_700_000_005_000)
    vfs.writeFileSync('/mh/log.jsonl', 'second\n')
    expect(modified(vfs, '/mh/log.jsonl')).toBe(1_700_000_005_000)
  })

  it('extends truncation with zero bytes', async () => {
    const vfs = new MemoryVfs()
    vfs.seed('/mh/file', new Uint8Array([1, 2]))
    vfs.truncateSync('/mh/file', 5)
    expect([...vfs.readFileSync('/mh/file') as Uint8Array]).toEqual([1, 2, 0, 0, 0])
    const handle = vfs.open('/mh/file', 'r+')
    await handle.truncate(7)
    expect([...vfs.readFileSync('/mh/file') as Uint8Array]).toEqual([1, 2, 0, 0, 0, 0, 0])
  })

  it('advances a directory only when its immediate entry set changes', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const vfs = new MemoryVfs()
    vfs.seedDirectory('/mh/workspace')
    const empty = modified(vfs, '/mh/workspace')
    vfs.writeFileSync('/mh/workspace/file.txt', 'one')
    const created = modified(vfs, '/mh/workspace')
    vfs.writeFileSync('/mh/workspace/file.txt', 'two')
    const rewritten = modified(vfs, '/mh/workspace')
    vfs.rmSync('/mh/workspace/file.txt')
    const removed = modified(vfs, '/mh/workspace')
    expect([created > empty, rewritten === created, removed > rewritten]).toEqual([true, true, true])
  })
})

describe('mutation publication', () => {
  it('publishes only committed runtime changes and keeps image seeding silent', () => {
    const vfs = new MemoryVfs()
    const mutations: VfsMutation[] = []
    vfs.subscribe((mutation) => { mutations.push(mutation) })
    vfs.seed('/mh/seeded.txt', 'seeded')
    expect(mutations).toEqual([])
    vfs.writeFileSync('/mh/seeded.txt', 'changed')
    vfs.mkdirSync('/mh/created')
    vfs.chmodSync('/mh/created', 0o700)
    vfs.renameSync('/mh/seeded.txt', '/mh/renamed.txt')
    vfs.rmSync('/mh/created', { recursive: true })
    expect(mutations.map(mutation => ({
      kind: mutation.kind,
      path: mutation.path,
      ...mutation.kind === 'write' ? { entryChanged: mutation.entryChanged } : {},
      ...mutation.kind === 'chmod' ? { mode: mutation.mode } : {},
    }))).toEqual([
      { kind: 'write', path: '/mh/seeded.txt', entryChanged: false },
      { kind: 'mkdir', path: '/mh/created' },
      { kind: 'chmod', path: '/mh/created', mode: 0o700 },
      { kind: 'remove', path: '/mh/seeded.txt' },
      { kind: 'write', path: '/mh/renamed.txt', entryChanged: true },
      { kind: 'remove', path: '/mh/created' },
    ])
    const renamed = mutations[4]
    expect(renamed?.kind === 'write' && new TextDecoder().decode(renamed.bytes)).toBe('changed')
    expect(() => { vfs.writeFileSync('/missing/file', 'no') }).toThrow(/ENOENT/)
    expect(mutations).toHaveLength(6)
  })

  it('contains a faulty observer and lets disposal stop later notifications', () => {
    const vfs = new MemoryVfs()
    vfs.seedDirectory('/mh')
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
    const first = vfs.subscribe(() => { throw new Error('observer failed') })
    const seen: string[] = []
    const second = vfs.subscribe((mutation) => { seen.push(mutation.path) })
    vfs.writeFileSync('/mh/one', '1')
    first()
    second()
    vfs.writeFileSync('/mh/two', '2')
    expect(seen).toEqual(['/mh/one'])
    expect(reported).toHaveBeenCalledOnce()
  })

  it('feeds the same complete mutations to a durable sink and live subscribers', async () => {
    const recorded: VfsMutation[] = []
    let flushes = 0
    const sink: VfsMutationSink = {
      record: (mutation) => { recorded.push(mutation) },
      flush: async () => { flushes += 1 },
    }
    const vfs = new MemoryVfs({ sink })
    vfs.seedDirectory('/mh')
    const observed: VfsMutation[] = []
    vfs.subscribe((mutation) => { observed.push(mutation) })
    vfs.writeFileSync('/mh/log', 'a')
    vfs.appendFileSync('/mh/log', 'bc')
    await vfs.flush()
    expect(observed).toEqual(recorded)
    expect(observed[0]).toBe(recorded[0])
    expect(recorded[0]).toMatchObject({ kind: 'write', path: '/mh/log', mode: 0o644, entryChanged: true })
    expect(recorded[1]).toMatchObject({ kind: 'write', path: '/mh/log', mode: 0o644, entryChanged: false, appendedFrom: 1 })
    expect(recorded[1]?.kind === 'write' && new TextDecoder().decode(recorded[1].bytes)).toBe('abc')
    expect(flushes).toBe(1)
  })

  it('publishes descriptor writes at the file identity current path', () => {
    const mutations: VfsMutation[] = []
    const vfs = new MemoryVfs()
    vfs.seed('/mh/source', 'old')
    const descriptor = vfs.openFileSync('/mh/source', 'r+')
    vfs.subscribe((mutation) => { mutations.push(mutation) })
    vfs.renameSync('/mh/source', '/mh/destination')
    mutations.length = 0
    descriptor.write(0, new TextEncoder().encode('new'))
    expect(mutations.map(mutation => mutation.path)).toEqual(['/mh/destination'])
    expect(vfs.readFileSync('/mh/destination', 'utf8')).toBe('new')
    vfs.unlinkSync('/mh/destination')
    mutations.length = 0
    descriptor.write(0, new TextEncoder().encode('detached'))
    expect(mutations).toEqual([])
    expect(new TextDecoder().decode(descriptor.read(0, descriptor.stat().size))).toBe('detached')
  })

  it('reports the path identity through a BigInt file handle stat', async () => {
    const vfs = new MemoryVfs()
    vfs.seed('/mh/session.lock', '')
    const handle = vfs.open('/mh/session.lock', 'w')
    const held = await handle.stat({ bigint: true }) as VfsBigIntStats
    const current = vfs.statSync('/mh/session.lock', { bigint: true }) as VfsBigIntStats

    expect([held.dev, held.ino]).toEqual([current.dev, current.ino])
    await handle.chmod(0o600)
    expect((vfs.statSync('/mh/session.lock') as VfsStats).mode & 0o777).toBe(0o600)
    await handle.close()
  })

  it('decomposes a directory rename into replayable destination state', () => {
    const recorded: VfsMutation[] = []
    const vfs = new MemoryVfs({
      sink: { record: (mutation) => { recorded.push(mutation) }, flush: () => Promise.resolve() },
    })
    vfs.seedDirectory('/mh/staging/nested', { mode: 0o700 })
    vfs.seed('/mh/staging/nested/file', 'value', { mode: 0o600 })
    vfs.renameSync('/mh/staging', '/mh/published')

    expect(recorded.map(mutation => [mutation.kind, mutation.path])).toEqual([
      ['remove', '/mh/staging'],
      ['mkdir', '/mh/published'],
      ['mkdir', '/mh/published/nested'],
      ['write', '/mh/published/nested/file'],
    ])
    expect(recorded[3]).toMatchObject({ kind: 'write', mode: 0o600, entryChanged: true })
    expect(recorded[3]?.kind === 'write' && new TextDecoder().decode(recorded[3].bytes)).toBe('value')
  })
})

describe('directory rename', () => {
  it('rejects file, non-empty directory, and missing-parent destinations before mutation', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/mh/source/nested/file', 'source')
    vfs.seed('/mh/file', 'destination')
    vfs.seed('/mh/non-empty/child', 'destination')
    const mutations: VfsMutation[] = []
    vfs.subscribe((mutation) => { mutations.push(mutation) })

    expect(() => { vfs.renameSync('/mh/source', '/mh/file') })
      .toThrow(expect.objectContaining({ code: 'ENOTDIR' }))
    expect(() => { vfs.renameSync('/mh/source', '/mh/non-empty') })
      .toThrow(expect.objectContaining({ code: 'ENOTEMPTY' }))
    expect(() => { vfs.renameSync('/mh/source', '/missing/destination') })
      .toThrow(expect.objectContaining({ code: 'ENOENT' }))

    expect(vfs.readFileSync('/mh/source/nested/file', 'utf8')).toBe('source')
    expect(vfs.readFileSync('/mh/file', 'utf8')).toBe('destination')
    expect(vfs.readFileSync('/mh/non-empty/child', 'utf8')).toBe('destination')
    expect(mutations).toEqual([])
  })

  it('replaces an empty directory with the source subtree', () => {
    const vfs = new MemoryVfs()
    vfs.seedDirectory('/mh/source/nested', { mode: 0o700 })
    vfs.seed('/mh/source/nested/file', 'source')
    vfs.seedDirectory('/mh/destination', { mode: 0o711 })

    vfs.renameSync('/mh/source', '/mh/destination')

    expect(vfs.existsSync('/mh/source')).toBe(false)
    expect(vfs.readFileSync('/mh/destination/nested/file', 'utf8')).toBe('source')
    expect((vfs.statSync('/mh/destination') as VfsStats).mode & 0o777).toBe(0o755)
    expect((vfs.statSync('/mh/destination/nested') as VfsStats).mode & 0o777).toBe(0o700)
  })
})

describe('hard links', () => {
  it('shares identity, bytes, and mode until one name is removed', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/mh/session.jsonl', 'committed\n')
    vfs.linkSync('/mh/session.jsonl', '/mh/session-latest.jsonl')
    vfs.linkSync('/mh/session-latest.jsonl', '/mh/session-archive.jsonl')
    expect(identity(vfs, '/mh/session-latest.jsonl')).toBe(identity(vfs, '/mh/session.jsonl'))
    expect(linkCount(vfs, '/mh/session.jsonl')).toBe(3n)
    expect(vfs.readFileSync('/mh/session-latest.jsonl', 'utf8')).toBe('committed\n')
    const changedPaths: string[] = []
    vfs.subscribe((mutation) => { changedPaths.push(mutation.path) })
    vfs.appendFileSync('/mh/session.jsonl', 'appended\n')
    expect(changedPaths).toEqual([
      '/mh/session.jsonl',
      '/mh/session-latest.jsonl',
      '/mh/session-archive.jsonl',
    ])
    expect(vfs.readFileSync('/mh/session.jsonl', 'utf8')).toBe('committed\nappended\n')
    expect(vfs.readFileSync('/mh/session-latest.jsonl', 'utf8')).toBe('committed\nappended\n')
    vfs.chmodSync('/mh/session-latest.jsonl', 0o600)
    expect((vfs.statSync('/mh/session.jsonl') as VfsStats).mode & 0o777).toBe(0o600)
    vfs.unlinkSync('/mh/session-latest.jsonl')
    expect(linkCount(vfs, '/mh/session.jsonl')).toBe(2n)
    vfs.unlinkSync('/mh/session-archive.jsonl')
    expect(linkCount(vfs, '/mh/session.jsonl')).toBe(1n)
    expect(vfs.readFileSync('/mh/session.jsonl', 'utf8')).toBe('committed\nappended\n')
  })

  it('treats rename between names of the same node as a no-op', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/mh/source', 'value')
    vfs.linkSync('/mh/source', '/mh/alias')
    const mutations: VfsMutation[] = []
    vfs.subscribe((mutation) => { mutations.push(mutation) })

    vfs.renameSync('/mh/source', '/mh/alias')

    expect(vfs.readFileSync('/mh/source', 'utf8')).toBe('value')
    expect(vfs.readFileSync('/mh/alias', 'utf8')).toBe('value')
    expect(linkCount(vfs, '/mh/source')).toBe(2n)
    expect(mutations).toEqual([])
  })

  it('retargets linked names through file replacement and directory moves', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/mh/replacement', 'replacement')
    vfs.seed('/mh/target', 'old')
    vfs.linkSync('/mh/target', '/mh/target-alias')
    const replaced = vfs.openFileSync('/mh/target', 'r+')
    vfs.renameSync('/mh/replacement', '/mh/target')
    const mutations: VfsMutation[] = []
    vfs.subscribe((mutation) => { mutations.push(mutation) })

    replaced.write(0, new TextEncoder().encode('changed'))
    expect(mutations.map(mutation => mutation.path)).toEqual(['/mh/target-alias'])
    expect(vfs.readFileSync('/mh/target', 'utf8')).toBe('replacement')
    expect(vfs.readFileSync('/mh/target-alias', 'utf8')).toBe('changed')
    expect(linkCount(vfs, '/mh/target-alias')).toBe(1n)

    vfs.seed('/mh/tree/file', 'tree')
    vfs.linkSync('/mh/tree/file', '/mh/outside')
    const moved = vfs.openFileSync('/mh/tree/file', 'r+')
    vfs.renameSync('/mh/tree', '/mh/moved')
    mutations.length = 0
    moved.write(0, new TextEncoder().encode('moved'))
    expect(mutations.map(mutation => mutation.path)).toEqual(['/mh/outside', '/mh/moved/file'])
    expect(linkCount(vfs, '/mh/moved/file')).toBe(2n)

    vfs.rmSync('/mh/moved', { recursive: true })
    mutations.length = 0
    moved.write(0, new TextEncoder().encode('kept!'))
    expect(mutations.map(mutation => mutation.path)).toEqual(['/mh/outside'])
    expect(vfs.readFileSync('/mh/outside', 'utf8')).toBe('kept!')
    expect(linkCount(vfs, '/mh/outside')).toBe(1n)
  })

  it('rejects renaming a file over an existing directory', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/mh/file', 'value')
    vfs.seedDirectory('/mh/directory')
    expect(() => { vfs.renameSync('/mh/file', '/mh/directory') }).toThrow(expect.objectContaining({ code: 'EISDIR' }))
    expect(vfs.readFileSync('/mh/file', 'utf8')).toBe('value')
    expect(vfs.statSync('/mh/directory').isDirectory()).toBe(true)
  })
})

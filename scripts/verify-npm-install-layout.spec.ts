import { describe, expect, it } from 'vitest'
import type { NpmPackageLock, RegistryIndex } from './benchmark-npm-resolution.ts'
import {
  assertDualMhInstallLayout,
  assertResolutionWorkBudget,
  buildDualMhRegistry,
  MAX_RESOLUTION_WORK_UNITS,
} from './verify-npm-install-layout.ts'

function validLayout(): NpmPackageLock {
  return {
    lockfileVersion: 3,
    packages: {
      '': { dependencies: { '@master-harness/mh': '0.2.0', 'mh-previous': 'npm:@master-harness/mh@0.1.0' } },
      'node_modules/@master-harness/cordis': { version: '4.0.1' },
      'node_modules/@master-harness/mh': {
        version: '0.2.0',
        dependencies: { '@master-harness/child': '^0.2.0' },
        peerDependencies: { '@master-harness/cordis': '^4.0.1' },
      },
      'node_modules/@master-harness/child': {
        version: '0.2.0',
        dependencies: { '@master-harness/leaf': '^0.2.0' },
      },
      'node_modules/@master-harness/leaf': { version: '0.2.0' },
      'node_modules/mh-previous': {
        name: '@master-harness/mh',
        version: '0.1.0',
        dependencies: { '@master-harness/child': '^0.1.0' },
        peerDependencies: { '@master-harness/cordis': '^4.0.1' },
      },
      'node_modules/mh-previous/node_modules/@master-harness/child': {
        version: '0.1.0',
        dependencies: { '@master-harness/leaf': '^0.1.0' },
      },
      'node_modules/mh-previous/node_modules/@master-harness/leaf': { version: '0.1.0' },
    },
  }
}

describe('npm install layout verifier', () => {
  it('creates two incompatible versions of every MH package', () => {
    const index: RegistryIndex = new Map([
      ['@master-harness/mh', new Map([['0.1.1-rc.2', {
        name: '@master-harness/mh',
        version: '0.1.1-rc.2',
        dependencies: { '@master-harness/child': '^0.1.1-rc.2' },
        peerDependencies: { '@master-harness/cordis': '^4.0.1' },
      }]])],
      ['@master-harness/child', new Map([['0.1.1-rc.2', {
        name: '@master-harness/child',
        version: '0.1.1-rc.2',
      }]])],
      ['@master-harness/cordis', new Map([['4.0.1', {
        name: '@master-harness/cordis',
        version: '4.0.1',
      }]])],
    ])

    const dual = buildDualMhRegistry(index, '0.1.1-rc.2')

    expect([...dual.get('@master-harness/mh')?.keys() ?? []]).toEqual(['0.1.0', '0.2.0'])
    expect(dual.get('@master-harness/mh')?.get('0.1.0')).toMatchObject({
      version: '0.1.0',
      dependencies: { '@master-harness/child': '^0.1.0' },
      peerDependencies: { '@master-harness/cordis': '^4.0.1' },
    })
    expect(dual.get('@master-harness/mh')?.get('0.2.0')).toMatchObject({
      version: '0.2.0',
      dependencies: { '@master-harness/child': '^0.2.0' },
    })
    expect(dual.get('@master-harness/cordis')).toBe(index.get('@master-harness/cordis'))
  })

  it('accepts isolated MH releases with one shared Cordis installation', () => {
    expect(assertDualMhInstallLayout(validLayout())).toEqual({
      mhPackagesPerVersion: 3,
      checkedMhEdges: 4,
    })
  })

  it.each([
    ['react', 'node_modules/react'],
    ['react-dom', 'node_modules/react-dom'],
    ['react', 'node_modules/mh-previous/node_modules/react'],
    ['react-dom', 'node_modules/mh-previous/node_modules/react-dom'],
  ])('rejects browser runtime %s installed at %s in the MH-only consumer', (name, path) => {
    const layout = validLayout()
    const packages = { ...layout.packages, [path]: { version: '18.3.1' } }
    expect(() => assertDualMhInstallLayout({ ...layout, packages })).toThrow(
      `${path}: ${name} is a browser build input`,
    )
  })

  it('rejects an internal edge that crosses release versions', () => {
    const layout = validLayout()
    const packages = { ...layout.packages }
    Reflect.deleteProperty(packages, 'node_modules/mh-previous/node_modules/@master-harness/leaf')

    expect(() => assertDualMhInstallLayout({ ...layout, packages })).toThrow(
      'node_modules/mh-previous/node_modules/@master-harness/child: dependencies '
      + '@master-harness/leaf resolves to node_modules/@master-harness/leaf@0.2.0, expected 0.1.0',
    )
  })

  it('rejects a second Cordis installation', () => {
    const layout = validLayout()
    const packages = {
      ...layout.packages,
      'node_modules/mh-previous/node_modules/@master-harness/cordis': { version: '4.0.1' },
    }

    expect(() => assertDualMhInstallLayout({ ...layout, packages })).toThrow(
      'expected one shared @master-harness/cordis',
    )
  })
})

describe('resolution work budget', () => {
  it('accepts the measured dual-release graph', () => {
    expect(assertResolutionWorkBudget({ mhPackagesPerVersion: 277, checkedMhEdges: 2524 }))
      .toBe(699_148)
  })

  it('accepts a graph exactly at the budget and rejects one internal edge above it', () => {
    const packages = 350
    const edgesAtBudget = Math.floor(MAX_RESOLUTION_WORK_UNITS / packages)

    expect(packages * edgesAtBudget).toBe(MAX_RESOLUTION_WORK_UNITS)
    expect(assertResolutionWorkBudget({ mhPackagesPerVersion: packages, checkedMhEdges: edgesAtBudget }))
      .toBe(MAX_RESOLUTION_WORK_UNITS)
    expect(() => assertResolutionWorkBudget({
      mhPackagesPerVersion: packages,
      checkedMhEdges: edgesAtBudget + 1,
    })).toThrow(`= ${String(MAX_RESOLUTION_WORK_UNITS + packages)} unit(s), budget ${String(MAX_RESOLUTION_WORK_UNITS)} unit(s)`)
  })

  it('accepts the headroom and rejects a runaway graph with its own measured counts', () => {
    expect(assertResolutionWorkBudget({ mhPackagesPerVersion: 300, checkedMhEdges: 2800 }))
      .toBe(840_000)
    expect(() => assertResolutionWorkBudget({ mhPackagesPerVersion: 400, checkedMhEdges: 3000 }))
      .toThrow('400 package(s) per release x 3000 internal edge(s) = 1200000 unit(s), budget 875000 unit(s)')
  })
})

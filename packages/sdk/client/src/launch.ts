/**
 * Resolve the public SDK launch configuration to one mh subprocess.
 * @module @master-harness/sdk-client/launch
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { HarnessClientOptions } from './types.ts'

/** Default bound for a profile to answer the SDK initialize handshake. */
export const DEFAULT_INITIALIZE_TIMEOUT_MS = 10_000

/** Internal generic process launch used by the transport and fake-runtime tests. */
export interface RuntimeProcessOptions {
  command: string
  args: string[]
  cwd?: string
  /** Materialize the complete child environment when the client starts its subprocess. */
  environment: () => NodeJS.ProcessEnv
  description: string
  initializeTimeoutMs: number
  requestTimeoutMs?: number
  shutdownTimeoutMs?: number
  disposeEofGraceMs?: number
  disposeGraceMs?: number
}

/** Node argv plus internal profile patches required by one resolved mh entry. */
export interface MhNodeLaunch {
  /** Arguments before the profile selector. */
  nodeArgs: string[]
  /** Internal patches applied below caller-supplied patches. */
  patches: string[]
  /** Environment values required by the resolved entry mode. */
  environment: NodeJS.ProcessEnv
}

interface PackageManifest {
  version?: unknown
  bin?: unknown
}

/** Read a package manifest from one resolved package.json URL. */
function manifest(url: string): PackageManifest {
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as PackageManifest
}

/**
 * Resolve and version-check a mh executable from package manifests.
 * @param mhManifestUrl - resolved URL of the mh package manifest.
 * @param clientManifestUrl - resolved URL of the SDK client manifest.
 * @returns the absolute mh executable path.
 */
export function resolveMhBinFromManifests(mhManifestUrl: string, clientManifestUrl: string): string {
  const mhManifest = manifest(mhManifestUrl)
  const clientManifest = manifest(clientManifestUrl)
  if (typeof mhManifest.version !== 'string' || mhManifest.version !== clientManifest.version) {
    throw new Error(`mh SDK client ${String(clientManifest.version)} requires the same mh version, got ${String(mhManifest.version)}`)
  }
  const bin = typeof mhManifest.bin === 'object' && mhManifest.bin !== null
    ? (mhManifest.bin as Record<string, unknown>).mh
    : mhManifest.bin
  if (typeof bin !== 'string' || bin === '') throw new Error('@master-harness/mh declares no mh executable')
  return resolve(dirname(fileURLToPath(mhManifestUrl)), bin)
}

/**
 * Resolve and version-check the built mh executable installed with this SDK.
 * @returns the absolute built executable path, whether or not it exists in a source checkout.
 */
export function installedMhBin(): string {
  return resolveMhBinFromManifests(
    import.meta.resolve('@master-harness/mh/package.json'),
    new URL('../package.json', import.meta.url).href,
  )
}

/**
 * Resolve the Node launch for one same-version mh package.
 * @param mhManifestUrl - resolved URL of the mh package manifest.
 * @param clientManifestUrl - resolved URL of the SDK client manifest.
 * @param sourceLoaderUrl - optional absolute tsx loader URL for deterministic tests.
 * @returns built output, or the source entry plus its compatibility patch and tsx environment.
 */
export function resolveMhNodeLaunchFromManifests(
  mhManifestUrl: string,
  clientManifestUrl: string,
  sourceLoaderUrl?: string,
): MhNodeLaunch {
  const bin = resolveMhBinFromManifests(mhManifestUrl, clientManifestUrl)
  if (existsSync(bin)) return { nodeArgs: [bin], patches: [], environment: {} }

  const packageDir = dirname(fileURLToPath(mhManifestUrl))
  const sourceBin = resolve(packageDir, 'src/bin.ts')
  const sourcePatch = resolve(packageDir, 'src/sdk-source.cordis.patch.yml')
  const sourceTsconfig = resolve(packageDir, 'tsconfig.json')
  if (!existsSync(sourceBin) || !existsSync(sourcePatch) || !existsSync(sourceTsconfig)) {
    throw new Error(
      `@master-harness/mh is missing its built executable ${bin} and complete source launch files ${sourceBin}, ${sourcePatch}, ${sourceTsconfig}`,
    )
  }
  const loader = sourceLoaderUrl ?? import.meta.resolve('tsx/esm')
  return {
    nodeArgs: ['--import', loader, sourceBin],
    patches: [sourcePatch],
    environment: { TSX_TSCONFIG_PATH: sourceTsconfig },
  }
}

/**
 * Resolve the installed mh package to a built or source Node launch.
 * @returns the launch descriptor for the current checkout or installed package.
 */
function installedMhNodeLaunch(): MhNodeLaunch {
  return resolveMhNodeLaunchFromManifests(
    import.meta.resolve('@master-harness/mh/package.json'),
    new URL('../package.json', import.meta.url).href,
  )
}

/**
 * Resolve caller-relative filesystem inputs and construct canonical mh argv.
 * @param options - public SDK launch options.
 * @param callerCwd - parent-process directory used for lexical resolution.
 * @returns one generic subprocess spec for the JSON-RPC transport.
 */
export function resolveMhLaunch(
  options: HarnessClientOptions = {},
  callerCwd: string = process.cwd(),
): RuntimeProcessOptions {
  const profile = options.profile ?? 'sdk'
  const mhLaunch = options.mhBin === undefined
    ? installedMhNodeLaunch()
    : { nodeArgs: [resolve(callerCwd, options.mhBin)], patches: [], environment: {} }
  const patches = [
    ...mhLaunch.patches,
    ...(options.patches ?? []).map(path => resolve(callerCwd, path)),
  ]
  const mhHome = options.mhHome === undefined ? undefined : resolve(callerCwd, options.mhHome)
  return {
    command: process.execPath,
    args: [...mhLaunch.nodeArgs, '--profile', profile, ...patches.flatMap(path => ['--patch', path])],
    ...options.processCwd === undefined ? {} : { cwd: resolve(callerCwd, options.processCwd) },
    environment: () => ({
      ...(options.env ?? process.env),
      ...mhLaunch.environment,
      ...mhHome === undefined ? {} : { MH_HOME: mhHome },
    }),
    description: `mh profile ${JSON.stringify(profile)}`,
    initializeTimeoutMs: options.initializeTimeoutMs ?? DEFAULT_INITIALIZE_TIMEOUT_MS,
    ...options.requestTimeoutMs === undefined ? {} : { requestTimeoutMs: options.requestTimeoutMs },
    ...options.shutdownTimeoutMs === undefined ? {} : { shutdownTimeoutMs: options.shutdownTimeoutMs },
    ...options.disposeEofGraceMs === undefined ? {} : { disposeEofGraceMs: options.disposeEofGraceMs },
    ...options.disposeGraceMs === undefined ? {} : { disposeGraceMs: options.disposeGraceMs },
  }
}

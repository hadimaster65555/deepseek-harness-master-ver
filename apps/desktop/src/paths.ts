/** Filesystem ownership for the Electron-managed desktop installation. */

import { join } from 'node:path'
import { resolveMhHome } from '@master-harness/home-paths'

/** Stable desktop installation paths under the shared Harness home. */
export interface DesktopPaths {
  readonly profile: string
  readonly lock: string
}

/**
 * Resolve every Electron-owned path without changing the shared data roots.
 * @param mhHome - Harness home shared with npm-installed mh.
 * @returns immutable desktop path set.
 */
export function resolveDesktopPaths(mhHome: string = resolveMhHome()): DesktopPaths {
  return {
    profile: join(mhHome, 'profiles', 'desktop'),
    lock: join(mhHome, 'profiles', 'desktop', 'lock'),
  }
}

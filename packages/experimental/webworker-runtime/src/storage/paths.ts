/**
 * Virtual root of the worker host's in-memory filesystem. Kept
 * in one module so the process shim, the path/os shims, and the VFS image
 * collector cannot drift apart.
 */

/** Virtual filesystem root; `process.cwd()` and every absolute path start here. */
export const MH_ROOT = '/mh'

/** `$MH_HOME`: durable-state directory inside the image. */
export const MH_HOME = `${MH_ROOT}/home`

/** Flat, symlink-free package tree resolved by the worker module loader. */
export const MH_NODE_MODULES = `${MH_ROOT}/node_modules`

/** Image configuration directory: the VFS manifest and the shipped agent presets. */
export const MH_CONFIG = `${MH_ROOT}/config`

/** Default (empty) workspace directory. */
export const MH_WORKSPACE = `${MH_ROOT}/workspace`

/** Temporary directory reported by `os.tmpdir()`. */
export const MH_TMP = `${MH_ROOT}/tmp`

/** Dependency-free IPC names shared with the sandboxed mandatory-update preload. */
export const MANDATORY_IPC = {
  status: 'mh-desktop:mandatory-status', state: 'mh-desktop:mandatory-state', action: 'mh-desktop:mandatory-action',
} as const

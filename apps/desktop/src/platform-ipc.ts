/** Shared names for the desktop Platform bridge. */
/** Private desktop channels; the Platform renderer receives bootstrap and locale updates. */
export const PLATFORM_IPC = {
  bootstrap: 'mh-platform:bootstrap',
  localeChanged: 'mh-platform:locale-changed',
  open: 'mh-platform:open',
  bounds: 'mh-platform:bounds',
  close: 'mh-platform:close',
} as const

/** Resolved Platform language; Desktop resolves the system preference before sending it. */
export type PlatformLocale = 'en_US' | 'zh_CN'

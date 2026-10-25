/** Typed preload operations exposed only by the Electron shell. */

import type { DesktopKeyboardApi, DesktopShortcutsApi } from '@master-harness/client-shortcuts/protocol'
import type { IpcMainInvokeEvent } from 'electron'
import type { DesktopBrowserBridge } from '@master-harness/client-ui-sidebar-browser/types'
import type { DesktopFileDrag } from '@master-harness/util-file-drag'

/** IPC channel names kept private to the desktop application bundle. */
export const DESKTOP_IPC = {
  shortcutsInput: 'mh-desktop:shortcuts-input',
  shortcutsCloseWindow: 'mh-desktop:shortcuts-close-window',
  shortcutsGet: 'mh-desktop:shortcuts-get',
  shortcutsEdit: 'mh-desktop:shortcuts-edit',
  shortcutsChanged: 'mh-desktop:shortcuts-changed',
  shortcutsRecording: 'mh-desktop:shortcuts-recording',
  boot: 'mh-desktop:boot',
  enterWorkspace: 'mh-desktop:enter-workspace',
  onboardingActive: 'mh-desktop:onboarding-active',
  onboardingApiKey: 'mh-desktop:onboarding-api-key',
  bootFailed: 'mh-desktop:boot-failed',
  browserAcquire: 'mh-desktop:browser-acquire',
  browserRelease: 'mh-desktop:browser-release',
  browserOpenRequested: 'mh-desktop:browser-open-requested',
  directoryPick: 'mh-desktop:directory-pick',
  fileDragPrepare: 'mh-desktop:file-drag-prepare',
  fileDragCancel: 'mh-desktop:file-drag-cancel',
  fileDragStart: 'mh-desktop:file-drag-start',
  fileDragRelease: 'mh-desktop:file-drag-release',
  deviceInfo: 'mh-desktop:device-info',
  localeBootstrap: 'mh-desktop:locale-bootstrap',
  localeChanged: 'mh-desktop:locale-changed',
  updatesStatus: 'mh-desktop:updates-status',
  updatesOpen: 'mh-desktop:updates-open',
  updatesPresentation: 'mh-desktop:updates-presentation',
  nativeThemeSet: 'mh-desktop:native-theme-set',
  windowFullscreen: 'mh-desktop:window-fullscreen',
  windowsAppearance: 'mh-desktop:windows-appearance',
  windowsMenu: 'mh-desktop:windows-menu',
} as const

/** Desktop release update state rendered by desktop-owned UI. */
export type DesktopUpdatePreparationFailureKind = 'stop-failed' | 'tasks-changed' | 'tasks-unavailable' | 'fullscreen-timeout'

export interface DesktopUpdateState {
  readonly phase: 'idle' | 'checking' | 'available' | 'downloading' | 'verifying' | 'installing' | 'ready' | 'error'
  readonly version?: string
  readonly message?: string
  /** Main-owned diagnostics without subprocess output or credentials; hidden until expanded. */
  readonly technicalDetails?: string
  readonly percent?: number
  readonly failedOperation?: 'check' | 'download' | 'install'
  /** Main-owned preparation cause; UI wording is selected by the active locale. */
  readonly preparationFailure?: DesktopUpdatePreparationFailureKind
}

/** Classified failure copy selected by the Web locale without exposing raw updater diagnostics. */
export type DesktopUpdateFailureKind =
  | 'check'
  | 'check-network'
  | 'download'
  | 'download-network'
  | 'install'
  | 'install-network'
  | 'stop-failed'
  | 'tasks-changed'
  | 'tasks-unavailable'
  | 'fullscreen-timeout'

/** Semantic status content; actions open main-process confirmation dialogs only. */
export interface DesktopUpdatePresentation {
  readonly phase: DesktopUpdateState['phase']
  readonly version?: string
  readonly percent?: number
  readonly failure?: DesktopUpdateFailureKind
}

/** Product documents cannot supply update versions, package URLs, or installation authorization. */
export interface MhDesktopProductApi {
  readonly protocolVersion: 1
  readonly browser: DesktopBrowserBridge
  readonly fileDrag: DesktopFileDrag
  readonly keyboard: DesktopKeyboardApi
  readonly shortcuts: DesktopShortcutsApi
  /**
   * Local machine description for the feedback questionnaire.
   * @returns `name=value` fields separated by `; `, with no hostname, user name, or serial number.
   */
  deviceInfo(): Promise<string>
  readonly updates: {
    status(): Promise<DesktopUpdatePresentation>
    open(): Promise<void>
    subscribe(listener: (state: DesktopUpdatePresentation) => void): () => void
  }
}

/** Scheme of Desktop-owned application documents. */
export const SCHEME = 'mh-app'

/**
 * Reject IPC outside the allowed Desktop document origins.
 * @param event - IPC caller whose frame URL supplies the origin.
 * @param hostnames - Desktop document hosts allowed for this operation.
 */
export function assertDesktopSender(event: IpcMainInvokeEvent, hostnames: readonly string[]): void {
  const senderFrame = event.senderFrame
  if (senderFrame === null) throw new Error('mh desktop: rejected IPC without a sender frame')
  const url = new URL(senderFrame.url)
  if (url.protocol !== `${SCHEME}:` || !hostnames.includes(url.hostname)) {
    throw new Error('mh desktop: rejected IPC from an unowned renderer')
  }
}

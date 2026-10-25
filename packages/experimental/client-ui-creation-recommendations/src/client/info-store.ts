import { createSnapshotStore, type SnapshotStore } from '@master-harness/client-store'

/** Remember the dismissed creation notice across sessions in this browser.
 * @returns a plugin-owned preference; unavailable storage only disables persistence.
 */
export function createCreationInfoStore(): SnapshotStore<boolean> {
  return createSnapshotStore(false, { persist: { name: 'mh.creation-recommendations.info-dismissed' } })
}

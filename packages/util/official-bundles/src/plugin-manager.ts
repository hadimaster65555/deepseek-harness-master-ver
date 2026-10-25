/** The package names the plugin manager protects, hides, orders, or marks experimental. */

/**
 * Plugin packages the plugin manager refuses to disable or remove, because management itself needs them; a bundle that
 * contains one is read-only as well. Removing a name drops only this `management-required` refusal; the manager's own
 * entry, installation-carried bundles, and unaddressable rows stay protected by their own rules.
 */
export const PROTECTED_PLUGINS: ReadonlySet<string> = new Set([
  '@master-harness/plugin-manager', '@master-harness/cordis-plugin-loader',
  '@master-harness/cordis-plugin-include', '@master-harness/api-gateway',
  '@master-harness/host-webserver', '@master-harness/client-modules',
  '@master-harness/client-ui-settings-plugin-inventory', '@master-harness/client-ui-plugin-manager',
  '@master-harness/host-plugin-inventory', '@master-harness/typert-registry',
  '@master-harness/api-remotes', '@master-harness/api-remote-access',
  '@master-harness/cordis-plugin-timer', '@master-harness/client-connection',
  '@master-harness/host-frontend-static', '@master-harness/tools',
  '@master-harness/hmr',
])

/**
 * Built-in profile bundles and persistent terminals, which have no plugin manager page.
 * Their Host availability and activation stay intact.
 */
export const HIDDEN_BUNDLES: ReadonlySet<string> = new Set([
  '@master-harness/base',
  '@master-harness/web-app',
  '@master-harness/headless',
  '@master-harness/sdk-app',
  '@master-harness/acp-app',
  '@master-harness/sdk-minimal',
  '@master-harness/experimental-terminal-bundle',
])

/**
 * The optional bundles the plugin manager's main and More lists rank first, in this order. {@link MORE_BUNDLES}, not
 * this list, decides whether a bundle appears on the main list.
 */
export const EXTENSION_BUNDLES: readonly string[] = [
  '@master-harness/experimental-agent-team-profile',
  '@master-harness/experimental-voice-input-bundle',
  '@master-harness/experimental-plugin-market-bundle',
  '@master-harness/experimental-auto-review',
]

/**
 * The optional bundles the plugin manager's main list leaves out until the profile enables them; its More list,
 * which includes every eligible bundle, ranks them last in this order.
 */
export const MORE_BUNDLES: readonly string[] = [
  '@master-harness/personalized-recommendations',
  '@master-harness/experimental-inspector-profile',
  '@master-harness/cua-bundle',
  '@master-harness/experimental-tool-worktree',
  '@master-harness/experimental-cot-translation-bundle',
  '@master-harness/experimental-session-search',
  '@master-harness/experimental-session-titles-bundle',
  '@master-harness/experimental-badge-skill-bundle',
  '@master-harness/experimental-ralph-bundle',
  '@master-harness/subagent-codex',
  '@master-harness/subagent-claude-code',
]

/** Official bundles the plugin manager marks with the Experimental badge. */
export const EXPERIMENTAL_BUNDLES: ReadonlySet<string> = new Set([
  '@master-harness/personalized-recommendations',
  '@master-harness/cua-bundle',
  '@master-harness/experimental-agent-team-profile',
  '@master-harness/experimental-voice-input-bundle',
  '@master-harness/experimental-auto-review',
  '@master-harness/experimental-inspector-profile',
  '@master-harness/experimental-tool-worktree',
  '@master-harness/experimental-cot-translation-bundle',
  '@master-harness/experimental-session-search',
  '@master-harness/experimental-session-titles-bundle',
  '@master-harness/experimental-badge-skill-bundle',
  '@master-harness/experimental-ralph-bundle',
  '@master-harness/experimental-plugin-market-bundle',
])

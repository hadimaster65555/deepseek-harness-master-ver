/** The bundle package names the mh installation selects, offers, installs on demand, or retires. */

/** Installation-owned defaults used when a shipped profile is first opened. */
export interface ProfileTemplate {
  /** Ordered bundle layer list. */
  bundles: readonly string[]
}

/** The shipped profile templates auto-initialized on first use, by name. */
export const PROFILE_TEMPLATES: Record<string, ProfileTemplate> = {
  acp: {
    bundles: ['@master-harness/base', '@master-harness/acp-app'],
  },
  web: {
    bundles: ['@master-harness/base', '@master-harness/web-app'],
  },
  headless: {
    bundles: ['@master-harness/base', '@master-harness/headless'],
  },
  sdk: {
    bundles: ['@master-harness/base', '@master-harness/sdk-app'],
  },
  'sdk-minimal': {
    bundles: ['@master-harness/sdk-minimal'],
  },
}

/**
 * Installation-owned bundle tuples that an earlier release wrote into a shipped profile; app-boot replaces an exact
 * match with the {@link PROFILE_TEMPLATES} entry of the same name and leaves every other list untouched.
 */
export const INSTALLATION_OWNED_PROFILE_TUPLES: Readonly<Record<string, readonly string[]>> = {
  headless: ['@master-harness/base', '@master-harness/web-app', '@master-harness/headless'],
}

/** Bundles an earlier release shipped and the installation no longer carries; app-boot removes them from profiles. */
export const RETIRED_BUNDLES: ReadonlySet<string> = new Set([
  // The Web composition mounts Schedule itself
  // ([upgrade guide](../../../../docs/upgrade-guide/v0.2.0-rc.2/schedule-bundle-retired/guide.md)).
  '@master-harness/experimental-schedule-bundle',
])

/** The bundle list a `mh plugin` init uses for a name with no shipped template. */
export const DEFAULT_PROFILE_BUNDLES: readonly string[] = ['@master-harness/base']

/**
 * The bundles the mh installation ships for a person to switch on: each a
 * runtime dependency of the installation that declares `mh.bundle.patch`,
 * an `icon`, and `./locale/*.json` display metadata, selected by no shipped
 * template, and offered switched off by the plugin manager except persistent
 * terminals, which have no page switch
 * ([rationale](../../../../.agents/notes/implemented/process/2026-09-15-shipped-optional-bundles.md),
 * [admission](../../../../.agents/notes/implemented/architecture/2026-09-21-experimental-capabilities-as-optional-bundles.md)).
 */
export const OPTIONAL_BUNDLES: readonly string[] = [
  '@master-harness/personalized-recommendations',
  '@master-harness/cua-bundle',
  '@master-harness/experimental-session-search',
  '@master-harness/experimental-ralph-bundle',
  '@master-harness/experimental-terminal-bundle',
  '@master-harness/experimental-badge-skill-bundle',
  '@master-harness/experimental-session-titles-bundle',
  '@master-harness/experimental-agent-team-profile',
  '@master-harness/experimental-voice-input-bundle',
  '@master-harness/experimental-cot-translation-bundle',
  '@master-harness/experimental-auto-review',
  '@master-harness/experimental-inspector-profile',
  '@master-harness/experimental-plugin-market-bundle',
  '@master-harness/experimental-tool-worktree',
]

/** Public MH release members available through the ordinary on-demand bundle installer. */
export const ON_DEMAND_BUNDLES: readonly string[] = [
  '@master-harness/subagent-claude-code',
  '@master-harness/subagent-codex',
]

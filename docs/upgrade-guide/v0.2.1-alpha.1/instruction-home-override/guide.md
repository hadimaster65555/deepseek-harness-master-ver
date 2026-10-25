---
kind: upgrade-guide
description: "The `agent-instructions` row no longer accepts `mhHome`; instruction loading always resolves the harness home from `$MH_HOME` or `~/.mh`."
---

# Instruction loading resolves one harness home

English | [中文](guide.zh.md)

## Change

`@master-harness/agent-instructions` removed its `mhHome` config field. The plugin resolves the harness home through `resolveMhHome()` from `@master-harness/home-paths`, like every other harness consumer: the home is `$MH_HOME` when it is set and non-blank, otherwise `~/.mh`, with tilde expansion.

A `cordis.yml`, profile patch, or `--patch` overlay that still sets `mhHome` on the `agent-instructions` row has no effect: the row keeps the stray key and the plugin ignores it, so instruction loading follows the process home. Other providers, such as `mh-skill-filesystem` and `mh-shell-env`, keep their own home fields; this removal covers the instruction loader only.

## Migration

1. Delete `mhHome` from the `agent-instructions` row in `cordis.yml`, `$MH_HOME/cordis.patch.yml`, `$MH_HOME/profiles/<profile>/cordis.patch.yml`, and any `--patch` overlay.
2. Where the override pointed at a non-default home, export `MH_HOME` for the process instead, so every harness consumer reads that home.
3. Confirm with `mh --profile <profile> --dump-config` that the `agent-instructions` row lists only its remaining fields, and that a new session's first request shows `Instructions from: $MH_HOME/AGENTS.md` (or `~/.mh/AGENTS.md`) when that file exists.

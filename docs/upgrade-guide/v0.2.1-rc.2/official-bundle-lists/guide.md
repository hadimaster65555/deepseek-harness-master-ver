---
kind: upgrade-guide
description: "The bundle lists and profile templates move from @master-harness/app-boot to @master-harness/official-bundles."
---

# Import bundle lists from `@master-harness/official-bundles`

English | [中文](guide.zh.md)

## Change

`@master-harness/app-boot` no longer exports `PROFILE_TEMPLATES`, `ProfileTemplate`, `DEFAULT_PROFILE_BUNDLES`, `OPTIONAL_BUNDLES`, `ON_DEMAND_BUNDLES`, `OFFICIAL_ON_DEMAND_CATALOG`, or `OfficialBundleCatalogEntry`. The new published package `@master-harness/official-bundles` exports them with unchanged values and types. Code that imports any of these names from `@master-harness/app-boot` fails to compile or load. The `mh` launcher, profiles, and bundle selection behave as before.

## Migration

1. Add `@master-harness/official-bundles` to the `dependencies` of each package that imports one of these names.
2. Change those imports from `@master-harness/app-boot` to `@master-harness/official-bundles`, for example `import { PROFILE_TEMPLATES } from '@master-harness/official-bundles'`. Keep importing every other name, such as `initProfile` or `loadProfile`, from `@master-harness/app-boot`.
3. Run your type check or build; it succeeds when no import of a moved name from `@master-harness/app-boot` remains. See the [package README](../../../../packages/util/official-bundles/README.md) for each list.

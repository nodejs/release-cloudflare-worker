# constants

Various constants used throughout the worker

## Table of Contents

- [cache.ts](./cache.ts) - Caching directives
- [cachedDirectories.json](./cachedDirectories.json) - Directories that have their listing result cached because they have symlinks in them. These are updated by the [build-r2-symlinks](../scripts/build-r2-symlinks.mjs) script.
- [docsDirectory.json](./docsDirectory.json) - The contents of `nodejs/docs/` in the `dist-prod` bucket. This is updated by the [build-r2-symlinks](../scripts/build-r2-symlinks.mjs) script.
- [files.ts](./files.ts) - Constants related to files the worker serves.
- [latestVersions.json] - Map of `latest-*` directories to their actual latest versions. This is updated by the [build-r2-symlinks](../scripts/build-r2-symlinks.mjs) script.
- [limits.ts](./limits.ts) - Hardcap limits that the worker shouldn't exceed.

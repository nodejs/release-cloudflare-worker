# constants

Various constants used throughout the worker

## Table of Contents

- [cache.ts](./cache.ts) - Caching directives
- [cachedDirectories.json](./cachedDirectories.json) - Directories that have their listing result cached because they have symlinks in them. This file is updated automatically with each Node release.
- [docsDirectory.json](./docsDirectory.json) - The contents of `nodejs/docs/` in the `dist-prod` bucket. This file is updated automatically with each Node release.
- [files.ts](./files.ts) - Constants related to files the worker serves.
- [fileSymlinks.ts](./fileSymlinks.json) - Manually updated mapping of file symlinks that exist in the `dist-prod` bucket.
- [latestVersions.json] - Map of `latest-*` directories to their actual latest versions. This file is updated automatically with each Node release.

# Release Process

Documentation on the general order of events that happen when releasing a new
version of Node.js

> [!NOTE]
> This focuses on the flow of release assets (binaries, doc files). This may
> not include the full process for releases (i.e. getting necessary approvals).

## Release types

### Mainline releases

Mainline releases refer to the main release branch of Node.js

### Nightly releases

Node.js has multiple release branches that are promoted nightly.

- `nightly` - Nightly builds from the `main` Node.js branch
- `v8-canary` - Builds with the latest V8 canary
- `rc` - Release candidates
- `test` - Test builds

<details>
    <summary><b>Deprecated release branches</b></summary>

These branches no longer receive new releases.

- `chakracore-nightly` - Chakracore nightly builds
- `chakracore-rc` - Chakracore release candidates
- `chakracore-release` - Chakracore releases

</details>

## Release flow

### 1. Release CI is triggered

New builds are scheduled on the release CI (https://ci-release.nodejs.org).
These builds compile Node.js on the various platforms and compile the docs.

Upon a build completing successfully, the build's output (binaries, doc files)
will then be uploaded to the origin server and the `dist-staging` bucket in
Node.js' Cloudflare account.

The release assets synced to the origin server are under
`/home/staging/nodejs/` path. The release assets synced to the
`dist-staging` bucket are under the `/nodejs/` [_prefix_](./r2.md#directories).

### 2. Release promotion

When a release is ready to be released, it is promoted. For mainline releases,
this is done by the releaser running the [`release.sh`](https://github.com/nodejs/node/tree/main/tools/release.sh)
script in the Node.js repository. For nightly releases, this is done once a day.

On the origin server, the release's assets are copied from 
`/home/staging/nodejs/` to `/home/dist/nodejs/`.

For R2, the release's assets are copied from the `dist-staging` bucket to the
`dist-prod` bucket.

# Adding New Routes

Guide on how to add new routes for the Release Worker to handle.

This assumes:

- There has already been prior discussions regarding the new routes
- A concensus has been reached on what routes are needed and how they are to function.

If there hasn't been a discussion, please [open a issue](https://github.com/nodejs/release-cloudflare-worker/issues/new) on this repository to discuss it.

## Steps

- Write the code/symlinks/... that handles the route and open a PR on this repository.
  - Please be intentional for any middleware that the new route is using. Verify that the middleware can handle that route.
  - Example: [#331](https://github.com/nodejs/release-cloudflare-worker/pull/331)
- Open an issue on [nodejs/build](https://github.com/nodejs/build) requesting the new route be sent to the Release Worker
  - This can be done before or after the PR for the Release Worker is merged.
  - Example: [nodejs/build#4044](https://github.com/nodejs/build/issues/4044).

> [!IMPORTANT]
> If the route is for new files included in a release, a release must be made with those files present before the PR here gets merged.

# Collaborator Guide

- [Issues and Pull Requests](#issues-and-pull-requests)
- [Accepting Modifications](#accepting-modifications)
  - [Involving the Web Infrastructure Team](#involving-the-web-infrastructure-team)
- [Technologies Used in the Worker](#technologies-used-in-the-worker)
- [Code Editing](#code-editing)
  - [Structure of this Repository](#structure-of-this-repository)
- [Testing](#testing)
  - [Unit Testing](#unit-testing)
  - [End-to-End Testing](#end-to-end-testing)
- [Remarks on Technologies Used](#remarks-on-technologies-used)
- [Additional Clarification](#additional-clarification)

This document contains information for Collaborators of the Node.js Release Worker project regarding maintaining code, documentation, and issues.

Collaborators should be familiar with the guidelines for new contributors in [CONTRIBUTING.md](./CONTRIBUTING.md)

## Issues and Pull Requests

Courtesy should always be shown to individuals submitting issues and pull requests to the Node.js Release Worker project.

Collaborators should feel free to take full responsibility for managing issues and pull requests they feel qualified to handle, as long as this is done while being mindful of these guidelines, the opinions of other Collaborators, and guidance of the Web Infrastructure Group.

Collaborators may close any issue or pull request they believe is not relevant to the future of the Node.js project. Where this is unclear, the issue should be left open for several days for additional discussion. Where this does not yield input from Node.js Collaborators or additional evidence that the issue has relevance, then the issue may be closed. Remember that issues can always be re-opened if necessary.

## Accepting Modifications

All code and documentation modifications should be performed via GitHub pull requests. Only the Web Infrastructure Team can merge their work and should do so carefully.

All pull requests must be reviewed and accepted by a Collaborator with sufficient expertise who can take full responsibility for the change. In the case of pull requests proposed by an existing Collaborator, an additional Collaborator is required for sign-off.

Pull Requests can only be merged after all CI Checks have passed.

In some cases, it may be necessary to summon a qualified Collaborator to a pull request for review by @-mention.

If you are unsure about the modification and are not prepared to take full responsibility for the change, defer to another Collaborator.

We recommend collaborators follow the guidelines on the [Contributing Guide](./CONTRIBUTING.md) for reviewing and merging Pull Requests.

### Involving the Web Infrastructure Team

Collaborators may opt to elevate pull requests or issues to the group for discussion by mentioning @nodejs/web-infra. This should be done where a pull request:

- Has a significant impact on the codebase
- Is inherently controversial; or
- Has failed to reach a consensus amongst the Collaborators who are actively participating in the discussion.

The Web Infrastructure should be the final arbiter where needed.

## Technologies Used in the Worker

The Node.js Release Worker is built upon [Cloudflare Workers](https://developers.cloudflare.com/workers/) and [Cloudflare R2](https://developers.cloudflare.com/r2/).

The Worker also uses several other Open Source libraries (not limited to) listed below:

- [AWS S3 client](https://www.npmjs.com/package/@aws-sdk/client-s3) is used for interacting with R2's S3 entrypoint.
- [Mustache.js](https://www.npmjs.com/package/mustache) is used for rendering templated pages.
- [Sentry](https://sentry.io/about) is used for error reporting.

## Code Editing

### Structure of this Repository

- `dev-bucket/` - A recreation of the contents in the R2 bucket that the worker reads from
- `docs/` - Documentation on things relating to the worker
- `e2e-tests/` - End-to-End tests for the worker
- `scripts/` - Miscellaneous scripts
- `src/` - Code for the worker

## Testing

Each new feature or bug fix should be accompanied by a unit and/or E2E test (when valuable).
We use [Vitest](https://vitest.dev/guide/) for both.

### Unit Testing

Unit tests are important to ensure that individual parts of the Worker are acting as expected.

- They should be written in the same directory as the file that is being tested.
- They should be named `<name of tested file>.test.ts`.
- They should cover utilities as well as any component that can be broken down and individually tested.
- They should make use of [Vitest's APIs](https://vitest.dev/guide/).
- External services used in the worker should be mocked with Undici.

### End-to-End Testing

E2E tests are important to ensure that requests made to the worker as a whole behave as expected.

- They should be written as `.test.ts` files in the [e2e-tests/](./e2e-tests/) directory.
- They should cover the various contexts in which a request could be sent to the worker from an external client.
- We utilitize [Cloudflare's Vitest Integration](https://developers.cloudflare.com/workers/testing/vitest-integration/) to run a local version of the worker for these.
- The contents of the [dev-bucket/](./dev-bucket/) folder are read and put into an in-memory R2 bucket mock for these tests. Anything in that directory is available in a test.
- External services used in the worker should be mocked with Undici.

## Remarks on Structure and Background

### Why Workers and R2?

We chose [Cloudflare Workers](https://workers.cloudflare.com) because it is mostly straight-forward, reliable, community-oriented, and the support backing it.

[Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) was chosen for similar reasoning, but also noteably its integration with Workers along with no egress fees.

Cloudflare has also graciously provided the OpenJS Foundation with an Enterprise account in addition to supporting us with any technical issues or questions we have faced.

### What is the origin/DO/www server?

This refers to the singular server instance that hosted the release assets (binaries, docs, shasums) among other things.
This Worker aims to replace that server when it comes to serving the release assets.

### Bucket File Structure

The bucket's file structure is a 1:1 mapping to the file structure of the release assets on the origin server.

### Frontend Bits

The directory listing page is the only frontend page that the Worker serves non-statically. For simplicitly, it is a pre-compiled Mustache template.
Should any other pages be added to this worker, they should do the same unless a consensus is reached by the Collaborators.

## Additional Clarification

If you have any further questions, please feel free to reach out in [an Issue](https://github.com/nodejs/release-cloudflare-worker/issues/new) or the `#nodejs-website` channel in the [OpenJS Foundation Slack](https://openjsf.org/collaboration).

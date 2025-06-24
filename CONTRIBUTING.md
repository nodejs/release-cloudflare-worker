# Node.js Release Worker Contributing Guide

Thank you for your interest in contributing to the Node.js Release Worker. Before you proceed, briefly go through the following,

- [Contributing](#contributing)
  - [Becoming a Collaborator](#becoming-a-collaborator)
- [Getting Started](#getting-started)
  - [CLI Commands](#cli-commands)
- [Commit Guidelines](#commit-guidelines)
  - [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Policy](#pull-request-policy)
  - [Before Merging](#before-merging)
  - [When Merging](#when-merging)
- [Developer's Certificate of Origin 1.1](#developers-certificate-of-origin-11)

## Contributing

Any individual is welcome to contribute to the Node.js Release Worker. The repository currently has two kinds of contribution personas:

- A **Contributor** is any individual who creates an issue/pull request, comments on an issue or pull request, or contributes in some other way.
- A **Collaborator** is a contributor with write access to the repository. See [here](#becoming-a-collaborator) on how to become a collaborator.

You can find more details and guides about Collaborating with this repository through our [Collaborator Guide](./COLLABORATOR_GUIDE.md).

### Becoming a Collaborator

A Collaborator of the Node.js Release Worker repository is a member of the Node.js Web Infrastructure Team.

The Web Infrastructure Team is responsible for maintaining the Infrastructure behind Node.js' Web Presence. It is expected that team members have significant knowledge about the infrastructure behind Node.js' Web Presence.

Note that regular Contributors do not need to become "Collaborators" as any contribution is appreciated (even without a status), and a Collaborator status is a formality that comes with obligations.

If you're an active Contributor seeking to become a member, we recommend you contact one of the existing Team Members for guidance.

For information on how to become a Collaborator, see [GOVERNANCE.md](https://github.com/nodejs/nodejs.org/blob/main/GOVERNANCE.md#nodejs-web-infra-team-nodejsweb-infra) in the [nodejs/nodejs.org](https://github.com/nodejs/nodejs.org) repository.

## Getting Started

The steps below will give you a general idea of how to prepare your local environment for the Worker and general steps for getting things done and landing your contribution.

1.  Click the fork button in the top right to clone the [Node.js Release Worker Repository](https://github.com/nodejs/release-cloudflare-worker/fork)

2.  Clone your fork using SSH, GitHub CLI, or HTTPS.

    ```bash
    git clone git@github.com:<YOUR_GITHUB_USERNAME>/release-cloudflare-worker.git # SSH
    git clone https://github.com/<YOUR_GITHUB_USERNAME>/release-cloudflare-worker.git # HTTPS
    gh repo clone <YOUR_GITHUB_USERNAME>/release-cloudflare-worker # GitHub CLI
    ```

3.  Change into the `release-cloudflare-worker` directory.

    ```bash
    cd release-cloudflare-worker
    ```

4.  Create a remote to keep your fork and local clone up-to-date.

    ```bash
    git remote add upstream git@github.com:nodejs/release-cloudflare-worker.git # SSH
    git remote add upstream https://github.com/nodejs/release-cloudflare-worker.git # HTTPS
    gh repo sync nodejs/release-cloudflare-worker # GitHub CLI
    ```

5.  Create a new branch for your work.

    ```bash
    git checkout -b name-of-your-branch
    ```

6.  Run the following to install the dependencies and start a local preview of your work.

    ```bash
    npm install
    ```

7.  Perform your changes. In case you're unfamiliar with the structure of this repository, we recommend a read on the [Collaborator Guide](./COLLABORATOR_GUIDE.md).

8.  Perform a merge to sync your current branch with the upstream branch.

    ```bash
    git fetch upstream
    git merge upstream/main
    ```

9.  Run the following to confirm that linting and formatting are passing.

    ```bash
    node --run format
    node --run test:unit
    node --run test:e2e
    ```

10. To run the worker locally, see [Dev Setup](./docs/dev-setup.md).

11. Once you're happy with your changes, add and commit them to your branch, then push the branch to your fork.

    ```bash
    git add .
    git commit -m "some message"
    git push -u origin name-of-your-branch
    ```

    > [!IMPORTANT]\
    > Before committing and opening a Pull Request, please go first through our [Commit](#commit-guidelines) and [Pull Request](#pull-request-policy) guidelines outlined below.

12. Create a Pull Request.

### CLI Commands

This repository contains a few scripts and commands for performing numerous tasks. The most relevant ones are described below.

<details>
    <summary>Commands for Testing, Maintaining, and Contributing to the Worker</summary>

- `node --run format` Formats the code to the repository's standards.
- `node --run lint` Lints the code to the repository's standards.
- `node --run test:unit` Runs the [Unit Tests](./COLLABORATOR_GUIDE.md#unit-tests) to ensure individual components are working as expected.
- `node --run test:e2e` Runs the [E2E Tests](./COLLABORATOR_GUIDE.md#e2e-tests) to ensure requests act as expected.
- `node --run build:mustache` Compiles the Mustache templates. **Required for any changes to the templates to take affect**.

</details>

<details>
    <summary>Commands for Running the Worker</summary>

- `node --run start` Runs a local [workerd](https://github.com/cloudflare/workerd) instance with the Worker on your machine in remote mode.

</details>

## Commit Guidelines

This project follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

Commits should be signed. You can read more about [Commit Signing](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits) here.

### Commit Message Guidelines

- Commit messages must include a "type" as described on Conventional Commits
- Commit messages **must not** end with a period `.`

## Pull Request Policy

This policy governs how contributions should land within this repository. The lines below state the checks and policies to be followed before merging and in the act of merging.

### Before Merging

We recommend reading our [Collaborator Guide](./COLLABORATOR_GUIDE.md) for in-depth details on how we accept contributions into this repository. The list below describes some merging and approval rules adopted in this repository.

- Pull Requests must be open for at least 48 hours (or 72 hours if the PR was authored on the weekend).
  - If the Pull Request was marked as a draft, it must be marked "Ready for Review" for at least 48 hours (or 72 hours if done on a weekend) before being merged.
  - Pull Requests may be immediately merged if they contain critical fixes, short errata (e.g. typos), or any critical change considered a "showstopper" for the workers's operation or security.
    - This kind of Pull Request should only be done by existing Collaborators and/or signed off by administrators/maintainers.
    - This rule cannot be used for updates on the `COLLABORATOR_GUIDE.md`, `CONTRIBUTING.md`, `CODEOWNERS`, GitHub Actions, or any other document that changes the governing policies of this repository.
  - Pull Requests containing small bug fixes, small feature changes, or other non-critical/highly-impacting changes not covered by the previous rule that allows PRs to be merged immediately might be "fast-tracked". This means they can be merged before the usual 48 hour time period.
    - The person that is fast-tracking the PR (adding the label) must be a Collaborator.
    - The person that is fast-tracking the PR must also comment on the PR that they're requesting the PR to be fast-tracked
    - Fast-tracking cannot be used for updates on the `COLLABORATOR_GUIDE.md`, `CONTRIBUTING.md`, GitHub Actions, or any security-impacting file or document that changes the governing policies of this repository.
- There must be no objections after 48 hours (or 72 hours if the PR was authored on the weekend).
  - If there are disagreements consensus should be sought. Lack of consensus might require escalation to the Web Infrastructure Team Maintainers.
- At least one approval is required for any PR to be merged.
- Tests must be included in Pull Requests for new features or bug fixes. You are responsible for fixing any test(s) that fail.

Each contribution is accepted only if there is no objection to it by a collaborator. During the review, collaborators may request that a specific contributor who is an expert in a particular area give an "LGTM" before the PR can be merged.

If an objection is raised in a pull request by another collaborator, all collaborators involved should try to arrive at a consensus by addressing the concerns through discussion, compromise, or withdrawal of the proposed change(s).

### When Merging

- All required Status-checks must have passed.
- Please make sure that all discussions are resolved.
- [`Squash`](https://help.github.com/en/articles/about-pull-request-merges#squash-and-merge-your-pull-request-commits) pull requests made up of multiple commits

## Developer's Certificate of Origin 1.1

```
By contributing to this project, I certify that:

- (a) The contribution was created in whole or in part by me and I have the right to
  submit it under the open source license indicated in the file; or
- (b) The contribution is based upon previous work that, to the best of my knowledge,
  is covered under an appropriate open source license and I have the right under that
  license to submit that work with modifications, whether created in whole or in part
  by me, under the same open source license (unless I am permitted to submit under a
  different license), as indicated in the file; or
- (c) The contribution was provided directly to me by some other person who certified
  (a), (b) or (c) and I have not modified it.
- (d) I understand and agree that this project and the contribution are public and that
  a record of the contribution (including all personal information I submit with it,
  including my sign-off) is maintained indefinitely and may be redistributed consistent
  with this project or the open source license(s) involved.
```

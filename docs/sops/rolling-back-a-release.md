# Rolling Back A Release

> [!WARNING]
> Rolling back a release should only be done when necessary,
> such as a quick-fix for an on-going incident,
> and by a [Collaborator](../CONTRIBUTING.md#contributing).
> The Web Infrastructure team should be aware each time this happens.

## Option A: via Github Actions

This is the preferred way, but takes a little bit longer.

1. Create a new branch

2. [Revert the commit](https://git-scm.com/docs/git-revert)

3. Push & create a new PR

4. Merge PR & Deploy it

If the rollback is prompted by an incident where the worker is entirely unavailable (i.e. all requests failing) or there is a security vulnerability present,
a Collaborator may forcibly push the commit reverting the release onto the `main` branch.

## Option B: via Cloudflare Dash

This requires `Workers Admin` permissions on Node.js' Cloudflare account.

1. Go to the Release Worker's [deployment page](https://dash.cloudflare.com/?account=/workers/services/view/dist-worker/production/deployments)

2. Find the previously deployed version in the table

3. Click the three dots on the right side of the version's entry, then click `Rollback to v...`

4. Make a revert commit to reflect the change in Git [see Option A](#option-a-via-github-actions).

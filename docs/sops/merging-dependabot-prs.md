# Merging Dependabot PRs

[Dependabot](https://github.com/dependabot) runs in this repository once every week.
We use it to update our dependencies.

## Reviewing & Merging

- Make sure all relevant CI has been ran against the PR and is passing. If needed, the `force ci` label can be added to run the actions if they are not triggered automatically.
- Check the changelog provided to see if there's anything to take note of. This is mostly for breaking changes, but can also be useful for identifying new features that are relevant.
  - Dependabot will sometimes add a `compatibility` tag that can help with this.
  - `@types/node` and `@cloudflare/workers-types` don't provide changelogs, but, there shouldn't ever be a breaking change in either of them.
- If the update does require changes to be made, commit them to the same branch that dependabot is working off of and request a review from another Collaborator.
- For updates to action workflow dependencies, it is recommended to go through the actual commits to look for anything out of the ordinary.
- Approve and merge
